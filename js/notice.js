require.config({
	baseUrl: 'js/',
	waitSeconds: 120,
	paths: {
		'ow-ad': 'http://content.overwolf.com/libs/ads/1/owads.min'
	},
	shim: {
		'ow-ad': {
			exports: 'OwAd'
		}
	}
});

require([
	'libs/ow-window',
	'libs/state',
	'libs/messenger',
	'libs/utils',

	'libs/vue.min',
	'libs/ga',
	'ow-ad',

	'app-config',
	'voice-packs-read',
], function(
	owWindow,
	stateManagers,
	messenger,
	utils,

	Vue,
	ga,
	OwAd,

	appConfig,
	vph
) {

'use strict';

const { state, persState } = stateManagers;

const { delay } = utils;

const
	indexWin	= new owWindow('index'),
	mainWin		= new owWindow('main'),
	noticeWin	= new owWindow('notice');

let	vm;

const winSize = appConfig.windows.notice;

async function init() {
	const game = state.get('gameRunning') || appConfig.games[0];

	if ( ! game ) {
		await noticeWin.close();
		return;
	}

	await vph.init();

	if ( ! persState.get('notFirstRun/notice') ) {
		persState.set('notFirstRun/notice', true);
		await noticeWin.changePosition(50, 100);
	}

	vm = new Vue({
		el : '#window-notice',
		data : {
			_ad : null,
			noAds : !! persState.get('userStreamer'),
			selectedVP : getSelectedVP(),
			closeTimeout : null,
			hover : false
		},
		methods : {
			drag() {
				noticeWin.dragMove();
			},
			close() {
				noticeWin.close();
			},
			async switchVP() {
				await mainWin.restore();
				this.close();
			}
		},
		watch: {
			hover(isHovered) {
				if ( isHovered )
					clearInterval(this.closeTimeout);
				else
					this.closeTimeout = setTimeout(() => this.close(), 20000);
			}
		},
		async mounted() {
			if ( this.noAds )
				await noticeWin.changeSize(420, 262);
			else
				await noticeWin.changeSize(420, 560);

			await delay(50);
			await this.$nextTick();
			document.documentElement.classList.remove('hidden');

			if ( ! this.noAds )
				startAd();

			this.closeTimeout = setTimeout(() => this.close(), 20000);
		}
	});
}

function startAd() {
	vm._ad = new OwAd(vm.$refs.ad, {size: {width: 400, height: 300}});

	vm._ad.addEventListener('play', async () => {
		console.log('ad event: play');
	});
	vm._ad.addEventListener('display_ad_loaded', async () => {
		console.log('ad event: display_ad_loaded');
	});
	vm._ad.addEventListener('complete', e => {
		vm._ad.refreshAd();
	});
	vm._ad.addEventListener('error', e => {
		console.error('ad error: '+ e, e);
	});
}

function getSelectedVP() {
	const game = state.get('gameRunning') || appConfig.games[0];

	if ( ! game )
		return null;

	const
		selectedVPs = vph.selectedVPs,
		id = selectedVPs[game.name] || appConfig.defaultVP;

	if ( ! id )
		return null;

	const vp = vph.get(id);

	if ( vp.vps )
		vp.vpImages = Object.values(vp.vps).filter((v,i,a) => a.indexOf(v) === i);

	return vp;
}

init().catch(e => {
	console.warn('init(): error: '+ e.message, e);
	ga('send', 'event', 'errors', 'notice: init(): error: '+ e.message);
});

});
