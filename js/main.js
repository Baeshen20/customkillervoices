require.config({
	baseUrl: 'js/',
	waitSeconds: 0
});

require([
	'libs/ow-window',
	'libs/state',
	'libs/messenger',
	'libs/utils',

	'libs/vue.min',
	'libs/ga',

	'app-config',
	'voice-packs-read',

	'components/game',
	'components/carousel',
	'components/voice-pack',
	'components/voice-pack-slot',
	'components/editable',
	'components/range',
	'components/scrollable'
], function(
	owWindow,
	stateManagers,
	messenger,
	utils,

	Vue,
	ga,

	appConfig,
	vph,

	vueGame,
	vueCarousel,
	vueVoicePack,
	vueVoicePackSlot,
	vueEditable,
	vueRangeSlider,
	vueScrollable
) {

'use strict';

const { state, persState } = stateManagers;

const { delay } = utils;

const
	indexWin	= new owWindow('index'),
	mainWin		= new owWindow('main');

const
	winSize = appConfig.windows.main,
	vpState = {};

let	vm;

async function init() {
	initSelectedGame();

	await Promise.all([vph.init(), initWindow()]);

	vm = new Vue({
		el : '#window-main',
		data : {
			gameRunning		: state.get('gameRunning'),
			selectedGame	: persState.get('selectedGame'),
			games			: getGames(),
			catalog			: getCatalog(),
			installingVP	: false,
			search			: '',
			searchActive	: false,
			vpTab			: null,
			editRandom		: null,
			editCustom		: null,
			closing			: false,
			settingsShown	: false,
			settings		: getSettings(),
			hotkey			: '',
			maximized		: false,
			redeemShown		: false,
			redeemCode		: '',
			redeemError		: null
		},
		computed: {
			selectedGameIndex() {
				return this.games.findIndex(game => game.name === this.selectedGame);
			},
			selectedGameTitle() {
				const game = this.games.find(game => game.name === this.selectedGame);

				if ( ! game )
					return null;

				return game.short || game.title;
			},
			vpTabEditing() {
				return ( this.vpTab === 'random' || this.vpTab === 'custom' );
			},
			showModal() {
				return ( this.closing || this.settingsShown || this.redeemShown );
			}
		},
		watch : {
			search(val) {
				updateCatalog();
			},
			vpTab(tab, oldTab) {
				switch (tab) {
					case 'custom':
					case 'random':
						const i = this.games.findIndex(game => this.selectedGame === game.name);

						if ( i > -1 )
							this.$refs.gamesCarousel.slideTo(i);
					break;
				}

				switch (tab) {
					case 'custom':
						if ( ! this.editCustom )
							this.createVP('custom');
					break;
					case 'random':
						if ( ! this.editRandom )
							this.createVP('random');
					break;
					default:
						this.editCustom = null;
						this.editRandom = null;
					break;
				}
			},
			async redeemShown(is) {
				await this.$nextTick();

				if ( is )
					this.$el.querySelector('.input-text-wrapper .input-text').focus();
			},
			maximized(is) {
				const html = document.documentElement;

				if ( is )
					html.classList.add('maximized');
				else
					html.classList.remove('maximized');
			},
			closing(is) {
				if ( is )
					this.settingsShown = false;
			}
		},
		methods : {
			toggleSearch() {
				if ( this.searchActive ) {
					this.searchActive = false;
					this.search = '';
				} else {
					this.searchActive = true;
					this.$el.querySelector('.search-bar').focus();
				}
			},
			selectGameByIndex(index) {
				const game = this.games[index];

				if ( game && ! game.disabled )
					this.selectGame(this.games[index]);
			},
			selectGame(game) {
				if ( ! game.disabled && game.name !== persState.get('selectedGame') ) {
					persState.set('selectedGame', game.name);

					if ( this.vpTabEditing )
						this.createVP(this.vpTab);

					updateCatalog();
				}
			},
			redeemWithCode() {
				messenger.send('index', 'redeemCode', vm.redeemCode);
			},
			scrollToVP(id) {
				const el = this.$el.querySelector('#voice-pack-'+ id);

				if ( el ) {
					console.log('scrollToVP(): '+ id);
					el.scrollIntoViewIfNeeded();
				} else {
					console.log('scrollToVP(): '+ id +' not found');
				}
			},
			openVPSite(id) {
				id = id.toLowerCase();
				console.log('openVPSite(): '+ id);
				overwolf.utils.openUrlInDefaultBrowser('https://killervoices.overwolf.com/'+ id);
			},
			downloadVP(id) {
				console.log('downloadVP()', id);
				messenger.send('index', 'downloadVP', id);
			},
			previewVP(id, event = null) {
				console.log('previewVP()', id, event);
				messenger.send('index', 'previewVP', {
					id,
					game : persState.get('selectedGame'),
					event
				});
			},
			selectVP(id) {
				messenger.send('index', 'selectVP', {
					game : persState.get('selectedGame'),
					id
				});
			},
			deselectVP(id) {
				messenger.send('index', 'deselectVP', {
					game : persState.get('selectedGame'),
					id
				});
			},
			createVP,
			editVP,
			saveVP,
			removeVP(id) {
				console.log('removeVP()', id);
				messenger.send('index', 'removeVP', id);
			},
			droppedVP,
			validateVP,
			clearVPslot,
			resize(side) {
				mainWin.dragResize(side);
			},
			async drag() {
				const res = await mainWin.getWindowState();

				if ( res && res.window_state !== 'maximized' )
					return await mainWin.dragMove();
			},
			async minimize() {
				if ( ! state.get('gameRunning') ) {
					const res = await mainWin.getWindowState();

					if ( res && res.window_state === 'maximized' ) {
						this.maximized = false;
						await mainWin.restore();
					}

					await mainWin.minimize();
				} else {
					await mainWin.close();
				}
			},
			async toggleMaximize() {
				document.documentElement.classList.add('hidden');
				await delay(250);

				const res = await mainWin.getWindowState();

				if ( ! res )
					return;

				console.log('toggleMaximize(): current window_state: '+ res.window_state);

				if ( res.window_state === 'maximized' ) {
					this.maximized = false;
					await mainWin.restore();
				} else {
					this.maximized = true;
					await mainWin.maximize();
				}

				document.documentElement.classList.remove('hidden');
			},
			maybeClose() {
				if ( state.get('gameRunning') )
					this.closing = true;
				else
					indexWin.close();
			},
			close() {
				indexWin.close();
			},
			closeModal() {
				if ( this.closing )
					this.closing = false;

				if ( this.settingsShown )
					this.settingsShown = false

				if ( this.redeemShown )
					this.redeemShown = false
			},
			toggleEnabled,
			setVolume,
			editHotkey() {
				location = 'overwolf://settings/hotkeys#show-hide-KV';
			},
			openLink(url) {
				console.log('openLink(): '+ url);
				if ( state.get('gameRunning') )
					overwolf.utils.openUrlInOverwolfBrowser(url);
				else
					overwolf.utils.openUrlInDefaultBrowser(url);
			}
		},
		components : {
			voicepack		: vueVoicePack,
			voicepackslot	: vueVoicePackSlot,
			editable		: vueEditable,
			game			: vueGame,
			carousel		: vueCarousel.Carousel,
			slide			: vueCarousel.Slide,
			range			: vueRangeSlider,
			scrollable		: vueScrollable
		},
		async mounted() {
			// await delay(50);
			await this.$nextTick();
			document.documentElement.classList.remove('hidden');
		}
	});

	persState.on('selectedGame', game => vm.selectedGame = game);
	state.on('gameRunning', game => vm.gameRunning = game);

	bindSettings();

	vph.on('update', updateCatalog);

	messenger.on('vpState', vpStateChange);
	messenger.on('redeemedCode', onRedeemed);
	messenger.on('createdVP', async id => {
		await delay(1000);
		updateCatalog();
		await vm.$nextTick();
		vm.scrollToVP(id);
	});

	updateHotkey();
	setInterval(updateHotkey, 2500);
}

async function initWindow() {
	const res = await mainWin.getWindowState();

	if ( res && res.window_state === 'maximized' )
		document.documentElement.classList.add('maximized');

	if ( ! persState.get('notFirstRun/main') ) {
		const
			viewport = await owWindow.getViewportSize(),
			width = (winSize.width > viewport.width) ? (viewport.width - 40) : winSize.width,
			height = (winSize.height > viewport.height) ? (viewport.height - 40) : winSize.height;

		await mainWin.resizeAndCenter(width, height);

		persState.set('notFirstRun/main', true);
	}
}

function initSelectedGame() {
	const
		prevSelected = persState.get('selectedGame'),
		gameRunning = state.get('gameRunning');

	if ( gameRunning && gameRunning.name !== prevSelected )
		persState.set('selectedGame', gameRunning.name);
	else if ( ! prevSelected )
		persState.set('selectedGame', appConfig.games[0].name);
}

function getGames() {
	const
		selectedVPs		= vph.selectedVPs,
		selectedGame	= persState.get('selectedGame'),
		games			= appConfig.games,
		// unavailable		= appConfig.unavailableGames,
		list			= [];

	for ( let i = 0; i < games.length; i++ ) {
		const
			gameSrc = games[i],
			game = {
				name			: gameSrc.name,
				title			: gameSrc.title,
				short			: gameSrc.short || gameSrc.title,
				selected		: ( selectedGame === gameSrc.name ),
				voiceDisabled	: persState.get('disabled/'+ gameSrc.name) || false
			},
			selectedVP = selectedVPs[game.name],
			vp = ( selectedVP ) ? vph.get(selectedVP) : vph.get(appConfig.defaultVP);

		if ( vp )
			game.voicePack = vp.shortTitle || vp.title;

		list.push(game);
	}

	// console.log('getGames():', list);
	return list;
}

function updateGames() {
	vm.games = getGames();
}

function getCatalog() {
	const
		search			= ( vm && vm.search && vm.search.length >= 2 ) ? vm.search.toLowerCase().trim() : null,
		selectedGame	= persState.get('selectedGame'),
		selectedGameObj	= appConfig.games.find(game => game.name === selectedGame),
		installedVPs	= vph.installedVPs,
		selectedVPs		= vph.selectedVPs,
		srcList			= vph.getList(),
		catalog			= {
			announcers : {
				title : 'Full announcer packs for '+ (selectedGameObj.short || selectedGameObj.title),
				vps : []
			},
			general : {
				title : 'Voice Packs',
				vps : []
			},
			streamers : {
				title : 'Streamers',
				vps : []
			},
			random : {
				title : 'Shuffled Packs',
				vps : []
			},
			custom : {
				title : 'Custom Packs',
				vps : []
			},
		};

	let i = srcList.length;

	while (i--) {
		const
			src		= srcList[i],
			title	= src.shortTitle || src.title;

		if ( search && ! title.toLowerCase().includes(search) )
			continue;

		if ( ! src.type && ! src[selectedGame] )
			continue;

		if ( src.type === 'random' ) {
			let unsupported = false,
				i = src.vps.length;

			while (i--) {
				const vp = vph.get(src.vps[i], 'general');

				if ( ! vp || ! vp[selectedGame] ) {
					unsupported = true;
					break;
				}
			}

			if ( unsupported )
				continue;
		}

		if ( src.type === 'custom' && src.game !== selectedGame )
			continue;

		const vp = {
			id			: src.id,
			title		: title,
			acquiredBy	: src.acquiredBy || 'user-made',
			type		: src.type || 'general',
			installed	: installedVPs.includes(src.id),
			selected	: (selectedVPs[selectedGame]) ? (selectedVPs[selectedGame] === src.id) : (appConfig.defaultVP === src.id),
			announcer	: !! src.announcer
		};

		if ( vp.type === 'custom' )
			vp.game = src.game;

		if ( src.vps ) {
			vp.vps = src.vps;
			vp.vpImages = Object.values(src.vps).filter((v,i,a) => a.indexOf(v) === i);
		}

		if ( vpState[vp.id] )
			Object.assign(vp, vpState[vp.id]);

		if ( src.hidden && ! vp.installed )
			continue;

		if ( vp.acquiredBy === 'redeem' )
			catalog.streamers.vps.push(vp);
		else if ( vp.announcer === true )
			catalog.announcers.vps.push(vp);
		else if ( vp.type === 'random' )
			catalog.random.vps.push(vp);
		else if ( vp.type === 'custom' )
			catalog.custom.vps.push(vp);
		else
			catalog.general.vps.push(vp);
	}

	for ( let section in catalog ) {
		if ( catalog[section].vps.length > 0 ) {
			catalog[section].vps.sort(sortVPsByName);
			// .sort(() => .5 - Math.random());
		}
	}

	// console.log('getCatalog():', catalog);
	return catalog;
}

function sortVPsByName(a, b) {
	const
		nameA = a.title.toLowerCase(),
		nameB = b.title.toLowerCase();

		if ( nameA < nameB )
			return -1;

		if ( nameA > nameB )
			return 1;

	return 0;
}

function updateCatalog() {
	// console.log('updateCatalog()');

	vm.catalog = getCatalog();

	updateGames();

	/*const selectedVPs = vph.selectedVPs;

	for ( let i = 0; i < vm.games.length; i++ ) {
		const
			game = vm.games[i],
			vp = vph.get(selectedVPs[game.name]);

		if ( vp )
			game.voicePack = vp.shortTitle || vp.title;
		else
			game.voicePack = 'No voice pack';
	}*/
}

async function vpStateChange(m) {
	// console.log('vpStateChange(): '+ m.id +' '+ m.key +' '+ m.val);

	const vp = vpState[m.id] = vpState[m.id] || {};

	vp[m.key] = m.val;

	if ( vp.progress && ! vp.installed && ! vp.error )
		vm.installingVP = true;
	else
		vm.installingVP = false;

	if ( vp.installed )
		delete vpState[m.id];

	updateCatalog();
	await vm.$nextTick();

	if ( m.key === 'installing' && m.val === true )
		vm.scrollToVP(m.id);
	else if ( m.key === 'installed' && m.val === true )
		vm.scrollToVP(m.id);
}

function onRedeemed(result) {
	if ( result.status ) {
		vm.redeemCode = '';
		vm.redeemError = null;
		vm.redeemShown = false;
	} else {
		vm.redeemError = result.message;
	}
}

function createVP(type) {
	let titleBase;

	switch (type) {
		case 'random':
			titleBase = 'Shuffled pack ';
		break;
		case 'custom':
			titleBase = 'Custom pack ';
		break;
	}

	let i = 0,
		title;

	do {
		i++;
		title = titleBase + i;
	} while ( vph.namingConflict(title) )

	const editing = {
		id : null,
		title,
		type,
		_valid : false
	};

	switch (type) {
		case 'random':
			editing.slots = [null];

			this.editRandom = editing;
			this.vpTab = 'random';
		break;
		case 'custom':
			const game = appConfig.games.find(g => g.name === persState.get('selectedGame'));

			if ( ! game )
				throw 'no game selected';

			editing.slots = {};

			for ( let slot in game.customSlots ) {
				editing.slots[slot] = {
					title : game.customSlots[slot],
					event : slot,
					vp : null
				};
			}

			editing.slotCount = Object.keys(game.customSlots).length;

			this.editCustom = editing;
			this.vpTab = 'custom';
		break;
	}

	// console.log('createVP()', type, editing);
}

function validateVP(vp) {
	switch (vp.type) {
		case 'random':
			let vpCount = 0;

			for ( let i = 0; i < vp.slots.length; i++ ) {
				if ( vp.slots[i] )
					vpCount++;
			}

			if ( vpCount === 0 )
				return vp._valid = false;
		break;
		case 'custom':
			if ( ! vp.slots || ! Object.values(vp.slots).some(slot => !!slot.vp) )
				return vp._valid = false;
		break;
	}

	return vp._valid = true;
}

function editVP(src) {
	console.log('editVP()', src);

	const editing = {
		id				: src.id,
		title			: src.title,
		type			: src.type,
		_valid			: true
	};

	switch (editing.type) {
		case 'random':
			editing.slots = [];

			for ( let i = 0; i < src.vps.length; i++ )
				editing.slots.unshift((src.vps[i]) ? vph.get(src.vps[i]) : null);

			editing.slots.unshift(null);

			this.editRandom = editing;
			this.vpTab = 'random';
		break;
		case 'custom':
			const game = appConfig.games.find(g => g.name === persState.get('selectedGame'));

			if ( ! game )
				throw 'no game selected';

			editing.slots = {};

			for ( let slot in game.customSlots ) {
				editing.slots[slot] = {
					title : game.customSlots[slot],
					vp : ( src.vps[slot] ) ? vph.get(src.vps[slot]) : null
				};
			}

			editing.slotCount = Object.keys(game.customSlots).length;

			this.editCustom = editing;
			this.vpTab = 'custom';
		break;
	}
}

function saveVP(type) {
	let editing;

	switch (type) {
		case 'random':
			editing = this.editRandom;
		break;
		case 'custom':
			editing = this.editCustom;
		break;
	}

	this.validateVP(editing);

	if ( ! editing._valid )
		return;

	const save = {
		id		: editing.id || null,
		title	: editing.title.trim(),
		type	: editing.type,
		game	: persState.get('selectedGame')
	};

	switch (type) {
		case 'random':
			save.vps = [];

			for ( let i = 0; i < editing.slots.length; i++ ) {
				if ( editing.slots[i] )
					save.vps.push(editing.slots[i].id);
			}
		break;
		case 'custom':
			save.vps = {};

			for ( let k in editing.slots ) {
				if ( editing.slots[k].vp )
					save.vps[k] = editing.slots[k].vp.id;
			}
		break;
	}

	if ( save.id ) {
		const onUpdated = () => {
			persState.off('userVPs/'+ save.id, onUpdated);
			updateCatalog();
		};

		persState.on('userVPs/'+ save.id, onUpdated);
	}

	console.log('saveVP()', save);
	messenger.send('index', 'saveVP', save);

	switch (type) {
		case 'custom':
			if ( this.editCustom )
				this.editCustom = null;
		break;
		case 'random':
			if ( this.editRandom )
				this.editRandom = null;
		break;
	}

	this.vpTab = null;
}

function clearVPslot(id) {
	const [cat, subId] = id.split('.');

	switch (cat) {
		case 'random':
			this.editRandom.slots.splice(Number(subId), 1);
			this.validateVP(this.editRandom);
		break;
		case 'custom':
			this.editCustom.slots[subId].vp = null;
			this.validateVP(this.editCustom);
		break;
	}

	console.log('clearVPslot', cat, subId);
}

function droppedVP(id, vpId) {
	const
		vp = vph.get(vpId),
		[cat, subId] = id.split('.');

	switch (cat) {
		case 'random':
			const slotId = Number(subId);
			let total = 0;

			if ( this.editRandom.slots[slotId] !== null )
				return;

			for ( let i = 0; i < this.editRandom.slots.length; i++ ) {
				total++;

				const slot = this.editRandom.slots[i];

				if ( slot && slot.id === vpId )
					return;
			}

			this.editRandom.slots.splice(slotId, 1, vp);

			if ( total < 6 ) {
				this.editRandom.slots.unshift(null);
				this.$refs.editRandomCarousel.slideTo(0);
			}

			this.validateVP(this.editRandom);
			console.log('droppedVP', id, vpId, this.editRandom);
		break;
		case 'custom':
			this.editCustom.slots[subId].vp = vp;
			this.validateVP(this.editCustom);
			console.log('droppedVP', id, vpId);
		break;
	}
}

function getSettings() {
	const settings = {};

	for ( let g of appConfig.games ) {
		const volume = persState.get('volume/'+ g.name);

		settings[g.name] = {
			name	: g.name,
			// title	: g.title,
			enabled	: ! persState.get('disabled/'+ g.name) || false,
			volume	: (!volume && volume !== 0) ? appConfig.defaultVolume : volume
		};
	}

	return settings;
}

function bindSettings() {
	for ( let g of appConfig.games ) {
		persState.on('disabled/'+ g.name, v => {
			vm.settings[g.name].enabled = !v;
			updateGames();
		});
		persState.on('volume/'+ g.name, v => {
			vm.settings[g.name].volume = (!v && v !== 0) ? appConfig.defaultVolume : v
		});
	}
}

function toggleEnabled(game) {
	const
		key = 'disabled/'+ game,
		old = persState.get(key) || false;

	persState.set(key, !old);
}

function setVolume(game, volume) {
	persState.set('volume/'+ game, parseInt(volume));
}

function updateHotkey() {
	overwolf.settings.getHotKey('show-hide-KV', r => {
		if ( r.status === 'success' && r.hotkey && vm.hotkey !== r.hotkey )
			vm.hotkey = r.hotkey;
	});
}

init().catch(e => {
	console.warn('init(): error: '+ e.message, e);
	ga('send', 'event', 'errors', 'main: init(): error: '+ e.message);
});
});
