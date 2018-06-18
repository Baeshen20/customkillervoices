require.config({
	baseUrl: 'js/',
	waitSeconds: 0
});

require([
	'libs/ow-window',
	'libs/state',
	'libs/messenger',
	'libs/game-status',
	'libs/utils',

	'libs/ga',

	'app-config',
	'audio-player',
	'downloader',
	'voice-packs'
], function(
	owWindow,
	stateManagers,
	messenger,
	gameStatus,
	utils,

	ga,

	appConfig,
	audioPlayer,
	downloader,
	vph
) {

'use strict';

const { state, persState } = stateManagers;

const { getRequest, delay } = utils;

const
	indexWin	= new owWindow('index'),
	noticeWin	= new owWindow('notice'),
	mainWin		= new owWindow('main');
	// settingsWin	= new owWindow('settings');

const startedWithGameEvent = location.href.includes('gamelaunchevent');

let	downloadedVPsPath,
	setFeaturesRetryTimeout,
	appManifest,
	userInfo;
	// overwatchMatchStarting = false;

async function init() {
	console.log('init(): Killer Voices starting');
	ga('send', 'event', 'app_launches', 'App starting');

	state.reset();

	upgradeFromOldVersion();

	await Promise.all([
		indexWin.minimize(),
		downloadsInit(),
		updateAppManifest()
	]);

	vph.init({
		downloaded : downloadedVPsPath,
		builtIn : appConfig.voicePacksDir
	});

	await verifyVPsInstalled();

	let logMessage = 'init(): App started: '+ appManifest.meta.version +' / '+ appManifest.UID,
		gaMessage = 'App started: v.'+ appManifest.meta.version,
		gameLaunchEventPostfix = ' / GameLaunch event';

	if ( startedWithGameEvent ) {
		logMessage += gameLaunchEventPostfix;
		gaMessage += gameLaunchEventPostfix;
	}

	console.log(logMessage);
	ga('send', 'event', 'app_launches', gaMessage);

	state.set('startedWithGameEvent', startedWithGameEvent);

	registerHotkey();

	if ( gameStatus.isRunning )
		await onGameRunningChange();

	gameStatus.on('running', onGameRunningChange);

	registerGameEvents();

	messenger.on('downloadVP', downloadVP);
	messenger.on('redeemCode', redeemCode);
	messenger.on('previewVP', v => previewVP(v.id, v.game, v.event));
	messenger.on('selectVP', v => selectVP(v.id, v.game));
	messenger.on('deselectVP', v => deselectVP(v.id, v.game));
	messenger.on('saveVP', v => {
		if ( v.id ) {
			vph.save(v);
		} else {
			const id = vph.create(v);

			console.log('createdVP', id);

			if ( id ) {
				vph.install(id);
				messenger.send('main', 'createdVP', id);
			}
		}
	});
	messenger.on('removeVP', id => vph.uninstall(id));

	overwolf.windows.onMainWindowRestored.addListener(function() {
		console.log('onMainWindowRestored()');
		indexWin.minimize();
		mainWin.restore();
		noticeWin.close();
	});

	if ( ! startedWithGameEvent )
		mainWin.restore();

	// noticeWin.restore();
}

async function downloadsInit() {
	downloadedVPsPath = await downloader.createMyDocsDir(appConfig.appDirName);
	console.log('downloadsInit(): downloads path: '+ downloadedVPsPath);
}

function upgradeFromOldVersion() {
	const
		path = 'saved/installedVPs',
		saved = localStorage[path];

	if ( ! saved )
		return;

	const parsed = JSON.parse(saved);

	delete localStorage[path];
	persState.set('installedVPs', parsed);

	console.log('upgradeFromOldVersion(): previously installed: '+ saved);
}

async function verifyVPsInstalled() {
	const installedVPs = vph.installedVPs;

	if ( ! installedVPs )
		return null;

	const
		installedVPsLength = installedVPs.length,
		paths = [],
		pathsToNames = {};

	for ( let i = 0; i < installedVPsLength; i++ ) {
		const
			id = installedVPs[i],
			vp = vph.get(id, 'general');

		if ( vp && (vp.acquiredBy === 'download' || vp.acquiredBy === 'redeem') ) {
			const path = downloadedVPsPath + installedVPs[i] +'\\';
			pathsToNames[path] = id;
			paths.push(path);
		}
	}

	if ( ! paths.length )
		return null;

	const
		results = await downloader.checkDirsExist(paths),
		uninstall = [];

	for ( let path in results ) {
		if ( results[path] === false )
			uninstall.push(pathsToNames[path]);
	}

	uninstall.map(id => vph.uninstall(id));
}

function updateAppManifest() { return new Promise(resolve => {
	overwolf.extensions.current.getManifest(result => {
		appManifest = result;
		resolve();
	});
})}

async function updateUser() {
	if ( ! userInfo )
		userInfo = await new Promise(resolve => overwolf.profile.getCurrentUser(resolve));

	const username = String(userInfo.username).toLowerCase();

	if ( persState.get('userStreamer') === username )
		return;

	const res = await getRequest('https://killervoices.overwolf.com/streamers.php', {json: true});

	if ( res.streamers.includes(username) )
		persState.set('userStreamer', username);
	else
		persState.remove('userStreamer');
}

async function onGameRunningChange() {
	console.log('onGameRunningChange():', gameStatus.isRunning, gameStatus.isInFocus, gameStatus);

	if ( gameStatus.isRunning ) {
		// const currentGame = getSupportedGameById(gameStatus.gameId);
		const currentGame = appConfig.games.find(game => (game.id === gameStatus.gameId));

		if ( currentGame )
			await gameLaunched(currentGame);
		else
			unsupportedGameLaunched();
	} else {
		gameEnded();
	}
}

async function gameLaunched(game) {
	console.log('gameLaunched(): '+ game.name +'/'+ game.id);
	ga('send', 'event', 'games', 'Game launched: '+ game.name);
	state.set('gameRunning', game);

	if ( game.useGEP )
		setFeatures();

	const mainWindowState = await mainWin.getWindowState();

	if ( mainWindowState.window_state !== 'closed' )
		await mainWin.close();

	if ( ! persState.get('disabled/'+ game.name) ) {
		await updateUser();
		await noticeWin.restore();
	}
}

async function gameEnded() {
	const game = state.get('gameRunning');

	state.remove('gameRunning');

	if ( game )
		console.log('gameEnded(): '+ game.id);

	const mainWindowState = await mainWin.getWindowState();

	if ( mainWindowState.window_state !== 'normal' ) {
		console.log('gameEnded(): closing');
		await indexWin.close();
	}
}

function unsupportedGameLaunched() {
	console.log('unsupportedGameLaunched(): '+ gameStatus.gameId +'/'+ gameStatus.gameInfo.title);
	//console.log('unsupportedGameLaunched(): quitting app');
	//indexWin.close();
}

function registerHotkey() {
	overwolf.settings.registerHotKey('show-hide-KV', async e => {
		if ( e.status !== 'success' )
			return;

		const winState = await owWindow.getWindowsStates();

		if ( winState.status !== 'success' )
			return;

		if ( winState.result.main === 'normal' )
			mainWin.close();
		else
			mainWin.restore();

		if ( winState.result.notice !== 'closed' )
			noticeWin.close();

		// if ( winState.result.settings !== 'closed' )
		// 	settingsWin.close();
	});
}

function registerGameEvents() {
	// general events errors
	overwolf.games.events.onError.addListener(info => {
		console.warn('registerGameEvents(): error: '+ JSON.stringify(info));
		ga('send', 'event', 'errors', 'overwolf.games.events.onError: '+ JSON.stringify(info));
	});

	// an event triggered
	overwolf.games.events.onInfoUpdates2.addListener(onInfoUpdate);
	overwolf.games.events.onNewEvents.addListener(onGameEvent);
}

function setFeatures() {
	clearTimeout(setFeaturesRetryTimeout);

	// register the requested ('required') features
	overwolf.games.events.setRequiredFeatures(appConfig.gameFeatures, function(info) {
		if ( info.status == 'error' ) {
			console.warn('setFeatures(): Could not set required features: '+ info.reason);
			setFeaturesRetryTimeout = setTimeout(setFeatures, 2000);
		} else if ( info.status == 'success' ) {
			console.log('setFeatures(): Set features successfully: '+ JSON.stringify(info));
		}
	});
}

function onInfoUpdate(i) {
	// console.log('onInfoUpdate(): raw: '+ JSON.stringify(info));
	// console.log('onInfoUpdate():', i.info);

	if ( ! i || ! i.info ) {
		console.warn('onInfoUpdate(): No info: '+ JSON.stringify(i));
		return false;
	}

	const
		info = i.info,
		game = state.get('gameRunning'),
		isPUBG = (game.name === 'PUBG');

	let vpEvent = null;

	if ( isPUBG && info.game_info && info.game_info.phase === 'airfield' )
		vpEvent = 'match_start';

	if ( vpEvent )
		playVoice(vpEvent);
}

function onGameEvent(e) {
	// console.log('onGameEvent(): raw: '+ JSON.stringify(e));
	// console.log('onGameEvent():', ...e.events);

	if ( ! e.events || ! e.events[0] || ! e.events[0].name ) {
		console.warn('onGameEvent(): No event data: '+ JSON.stringify(e));
		return false;
	}

	const
		event		= e.events[0],
		eventName	= event.name,
		game		= state.get('gameRunning'),
		gameName	= game.name,
		// isLoLorOW	= (['League_of_Legends', 'Overwatch'].includes(gameName)),
		// isOW		= (gameName === 'Overwatch'),
		isLoL		= (gameName === 'League_of_Legends'),
		isPUBG		= (gameName === 'PUBG'),
		isFortnite	= (gameName === 'Fortnite'),
		isDota2		= (gameName === 'Dota2');

	let vpEvent;

	if ( eventName == 'match' ) {
		vpEvent = event.data;
	} else if ( eventName == 'kill' && isLoL ) {
		vpEvent = JSON.parse(event.data).label;
	} /*else if ( eventName == 'countdown' && isOW ) {
		if ( overwatchMatchStarting )
			return;

		overwatchMatchStarting = true;
		setTimeout(() => overwatchMatchStarting = false, 30000);
		vpEvent = 'match_start';
	} else if ( eventName == 'playerOfTheGame' && isOW ) {
		vpEvent = 'match_end';
	}*/ else if ( eventName == 'announcer' && isLoL ) {
		const eventData = JSON.parse(event.data);

		vpEvent = 'announcer_'+ eventData.name;

		if ( eventData.data )
			vpEvent += '_'+ eventData.data;
	} else if ( isPUBG ) {
		switch ( eventName ) {
			case 'matchEnd':
				vpEvent = 'match_end';
			break;
			case 'knockedout':
				vpEvent = 'knockout';
			break;
			default:
				vpEvent = eventName;
			break;
		}
	} else if ( isFortnite ) {
		switch ( eventName ) {
			case 'matchStart':
				vpEvent = 'match_start';
			break;
			case 'matchEnd':
				vpEvent = 'match_end';
			break;
			default:
				vpEvent = eventName;
			break;
		}
	} else if ( isDota2 ) {
		vpEvent = eventName;

		switch ( vpEvent ) {
			case 'match_ended':
				vpEvent = 'match_end';
			break;
			case 'match_state_changed':
				const eventData = JSON.parse(event.data);

				if ( eventData.match_state === 'DOTA_GAMERULES_STATE_PRE_GAME' )
					vpEvent = 'match_start';
				else
					return false;
			break;
			case 'kill':
				const eventData2 = JSON.parse(event.data);

				switch ( eventData2.kill_streak ) {
					case 2:
						vpEvent = 'double_kill';
					break;
					case 3:
						vpEvent = 'triple_kill';
					break;
					case 4:
						vpEvent = 'quadra_kill';
					break;
					case 5:
						vpEvent = 'penta_kill';
					break;
					default:
						vpEvent = 'kill';
					break;
				}
			break;
		}
	} else { // Normal event
		vpEvent = eventName; // This is the name of the event that was triggered
	}

	console.log('onGameEvent():', vpEvent);
	playVoice(vpEvent);
}

function installVP(id) {
	vph.install(id);
	console.log('installVP(): '+ id);
	ga('send', 'event', 'vp_selection', 'Voicepack installed: '+ id);
}

function selectVP(id, game) {
	vph.select(id, game);
	console.log('selectVP(): '+ id +'/'+ game);
	ga('send', 'event', 'vp_selection', 'Voicepack selected for '+ game +': '+ id);
}

function deselectVP(id, game) {
	vph.deselect(id, game);
	console.log('deselectVP(): '+ id +'/'+ game);
	ga('send', 'event', 'vp_selection', 'Voicepack deselected for '+ game +': '+ id);
}

async function redeemCode(code) {
	console.log('redeemVP(): redeeming code: '+ code);

	const result = await useCode(code);

	if ( result.status === 'success' ) {
		console.log('redeemVP(): redeemed: '+ result.vp);

		messenger.send('main', 'redeemedCode', {
			status : true
		});

		ga('send', 'event', 'codes', 'Code redeemed for: '+ result.vp);

		await downloadVP(result.vp);
	} else {
		console.warn('redeemVP(): error: '+ result.message, result);

		messenger.send('main', 'redeemedCode', {
			status : false,
			message : result.message
		});

		ga('send', 'event', 'errors', 'Code redeem error: '+ result.message);
	}
}

async function useCode(code) {
	if ( typeof code !== 'string' || code.length !== 6 ) {
		console.warn('useCode(): code invalid: '+ code);
		return {
			status : 'error',
			message : 'Sorry, this code is invalid'
		};
	}

	code = code.toUpperCase();

	if ( ! userInfo )
		userInfo = await new Promise(resolve => overwolf.profile.getCurrentUser(resolve));

	const
		username = userInfo.username || '',
		response = await getRequest('https://killervoices.overwolf.com/redeemCode.php?k='+ code +'&u='+ username, {json: true}).catch(e => {
			console.log('useCode(): error: '+ e);
			return {
				status : 'error',
				message : 'Unknown error'
			};
		});

	if ( response.status === 'success' && vph.isInstalled(response.vp) ) {
		console.warn('useCode(): already have this VP');
		response = {
			status : 'error',
			message : 'You already have this voice pack'
		};
	}

	console.log('useCode(): response: '+ JSON.stringify(response));
	return response;
}

async function downloadVP(id) {
	if ( ! vph.has(id) || vph.isInstalled(id) )
		return false;

	const
		pathId = id.toLowerCase(),
		url = 'http://content.overwolf.com/apps/killer-voices/' + pathId + '.7z',
		localPath = downloadedVPsPath + pathId + '.7z';

	await messenger.send('main', 'vpState', {
		id,
		key : 'installing',
		val : true
	});

	console.log('downloadVP(): downloading: '+ id, url, localPath);

	try {
		const resultPath = await downloader.downloadFile(url, localPath);
		console.log('downloadVP(): downloaded: '+ id +': '+ resultPath);
	} catch(e) {
		console.warn('downloadVP(): error: '+ id +': '+ e);
		ga('send', 'event', 'errors', 'Voicepack download error: '+ id +': '+ e);

		return await messenger.send('main', 'vpState', {
			id,
			key : 'error',
			val : e
		});
	}

	installVP(id);

	console.log('downloadVP(): success');
	ga('send', 'event', 'vp_installs', 'Voicepack installed: '+ id);

	return await messenger.send('main', 'vpState', {
		id,
		key : 'installed',
		val : true
	});
}

function getVolumeForGame(game) {
	const stored = persState.get('volume/'+ game);

	return ( !stored && stored !== 0 ) ? appConfig.defaultVolume : stored;
}

async function previewVP(id, game = 'CSGO', event = null) {
	if ( ! vph.has(id) )
		return false;

	if ( ! vph.isInstalled(id) )
		await downloadVP(id);

	const
		vp		= vph.get(id),
		volume	= getVolumeForGame(game),
		track	= vp.getPreview({game, event, announce : !event});

	if ( ! track || ! track.path ) {
		console.log(`previewVP(): No track for ${game}/${event}`);
		return false;
	}

	await audioPlayer.playTrack({
		src : track.path,
		volume,
		before : () => messenger.send('main', 'vpState', {
			id,
			key : 'playing',
			val : true
		}),
		after : async () => {
			await messenger.send('main', 'vpState', {
				id,
				key : 'playing',
				val : false
			});
			await delay(50);
		}
	});
}

function playVoice(event) {
	const game = state.get('gameRunning');

	if ( ! game )
		return false;

	if ( persState.get('disabled/'+ game.name) ) {
		console.log(`playVoice(): Disabled for ${game.name}`);
		return false;
	}

	const
		id = vph.selectedVPs[game.name] || appConfig.defaultVP,
		vp = vph.get(id);

	if ( vp.type === 'custom' && vp.game !== game.name ) {
		console.log(`playVoice(): vp is for a different game: ${vp.game}/${game}`);
		return false;
	}

	const
		volume = getVolumeForGame(game.name),
		track = vp.getTrack({game : game.name, event});

	if ( ! track || ! track.path ) {
		console.log(`playVoice(): No track for ${game.name}/${event}`);
		return false;
	}

	return audioPlayer.playTrack({
		src : track.path,
		volume
	});
}

init().catch(e => {
	console.warn('init(): error: '+ e.message, e);
	ga('send', 'event', 'errors', 'index: init(): error: '+ e.message);
});
});
