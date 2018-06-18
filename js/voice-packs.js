define([
	'app-config',
	'vp-db',
	'libs/state'
], function(
	appConfig,
	vpdb,
	state
) {

'use strict';

const { persState } = state;

const handler = {
	paths : {},
	lastPlayed : {},

	get installedVPs() {
		return persState.get('installedVPs') || [];
	},

	set installedVPs(val) {
		return persState.set('installedVPs', val);
	},

	get selectedVPs() {
		return persState.get('selectedVPs') || {};
	},

	set selectedVPs(val) {
		return persState.set('selectedVPs', val);
	},

	init(paths) {
		this.paths.downloaded = paths.downloaded;
		this.paths.builtIn = paths.builtIn;

		this.general.init();

		const
			installedVPs			= this.installedVPs,
			installedLengthBefore	= installedVPs.length;

		for ( let vp of this.general.list ) {
			if ( vp.acquiredBy === 'preinstall' ) {
				if ( ! installedVPs.includes(vp.id) )
					installedVPs.push(vp.id);
			} else {
				break;
			}
		}

		if ( installedLengthBefore !== installedVPs.length )
			this.installedVPs = installedVPs;
	},

	isInstalled(id) {
		return this.installedVPs.includes(id);
	},

	install(id) {
		const installedVPs = this.installedVPs;

		if ( installedVPs.includes(id) )
			return;

		installedVPs.push(id);
		this.installedVPs = installedVPs;
	},

	uninstall(id) {
		let deleted = false;

		const
			installedVPs	= this.installedVPs,
			selectedVPs		= this.selectedVPs;

		if ( installedVPs && installedVPs.length ) {
			const installedIndex = installedVPs.indexOf(id);

			if ( installedIndex > -1 ) {
				installedVPs.splice(installedIndex, 1);
				deleted = true;
			}
		}

		for ( let game in selectedVPs ) {
			if ( selectedVPs[game] === id ) {
				delete selectedVPs[game];
				deleted = true;
			}
		}

		if ( deleted ) {
			this.installedVPs = installedVPs;
			this.selectedVPs = selectedVPs;

			if ( this.user.has(id) )
				deleted = this.user.remove(id);
		}

		return deleted;
	},

	select(id, game) {
		const selectedVPs = this.selectedVPs;

		selectedVPs[game] = id;

		this.selectedVPs = selectedVPs;
	},

	deselect(id, game) {
		const selectedVPs = this.selectedVPs;

		delete selectedVPs[game];

		this.selectedVPs = selectedVPs;
	},

	has(id, type = null) {
		if ( type && this[type] )
			return this[type].has(id);

		const general = this.general.has(id);

		if ( general )
			return general;

		const user = this.user.has(id);

		if ( user )
			return user;

		return null;
	},

	get(id, type = null) {
		if ( type && this[type] )
			return this[type].get(id);

		const general = this.general.get(id);

		if ( general )
			return general;

		const user = this.user.get(id);

		if ( user )
			return user;

		return null;
	},

	create(vp) {
		return this.user.create(vp);
	},

	save(vp) {
		return this.user.save(vp);
	},

	remove(id) {
		return this.user.remove(id);
	}
};

handler.general = {
	list	: vpdb,
	db		: {},
	cache	: {},

	init() {
		for ( let i = 0; i < this.list.length; i++ ) {
			const vp = this.list[i];
			this.db[vp.id] = vp;
		}
	},

	has(id) {
		return ( this.cache[id] || this.db[id] );
	},

	get(id) {
		if ( this.cache[id] )
			return this.cache[id];

		if ( ! this.db[id] )
			return null;

		return this.cache[id] = new voicePack(this.db[id]);
	},
};

handler.user = {
	cache : {},

	get db() {
		return persState.get('userVPs') || [];
	},

	set db(val) {
		return persState.set('userVPs', val);
	},

	has(id) {
		return ( this.cache[id] || this.db.includes(id) );
	},

	get(id) {
		if ( this.cache[id] )
			return this.cache[id];

		if ( ! this.db.includes(id) )
			return null;

		const src = persState.get('userVPs/'+ id);

		if ( ! src )
			return null;

		switch (src.type) {
			case 'custom':
				return this.cache[id] = new customVoicePack(src);
			break;
			case 'random':
				return this.cache[id] = new randomVoicePack(src);
			break;
		}

		return null;
	},

	create(src) {
		const db = this.db;

		if ( src.id && (db.includes(src.id) || this.cache[src.id]) )
			return false;

		let vp;

		switch (src.type) {
			case 'custom':
				vp = new customVoicePack(src);
			break;
			case 'random':
				vp = new randomVoicePack(src);
			break;
		}

		if ( this.cache[vp.id] || db.includes(vp.id) )
			return false;

		db.push(vp.id);
		this.cache[vp.id] = vp;

		vp.update();
		this.db = db;

		return vp.id;
	},

	save(src) {
		const vp = this.get(src.id);

		if ( ! vp )
			return false;

		vp.set(src);
		vp.update(src);

		return true;
	},

	remove(id) {
		if ( this.cache[id] )
			delete this.cache[id];

		const
			db		= this.db,
			dbIndex	= db.indexOf(id);

		if ( dbIndex > -1 ) {
			db.splice(dbIndex, 1);
			this.db = db;
			persState.remove('userVPs/'+ id);
		}
	},

	titleToId(title) {
		const id = title.toLowerCase().split(/\s+/).join('_');

		if ( handler.has(id) ) {
			let i = 0,
				newId;

			const makeId = () => {
				i++;
				return `${id}_${i}`;
			};

			do {
				newId = makeId();
			} while ( handler.has(newId) )

			return newId;
		}

		return id;
	}
};

class voicePack {
	constructor(src) {
		Object.assign(this, src);
		this.type = 'general';
	}

	getTrack({game, event, updateLastPlayed = true, announce = true}) {
		if ( ! this[game] )
			return null;

		if ( this.announcer ) {
			if ( announce !== event.startsWith('announcer_') )
				return null;
		}

		// console.log('getTrack()', {game, event, updateLastPlayed, announce});

		if ( event === 'player death' ) {
			event = 'player_death';
		} else if ( event.includes('ability') ) {
			//If the event is spell 1,2,3,4 it will just play a spell sound
			event = 'spell';
		} else if ( appConfig.eventCategories.kill.includes(event) && this[game][event] === undefined ) {
			//If the event is a multi kill && there is no voice, make the event kill
			event = 'kill';
		}

		if ( ! this[game][event] || ! this[game][event].length )
			return null;

		let track;

		if ( this[game][event].length === 0 ) {
			return null;
		} else if ( this[game][event].length === 1 ) {
			track = this[game][event][0];
		} else {
			const findRandom = () => this[game][event][Math.floor(Math.random() * this[game][event].length)];

			track = findRandom();

			while ( handler.lastPlayed[this.id] === track )
				track = findRandom();
		}

		let path = this.id +'/'+ track +'.ogg';

		if ( this.origin === 'documents' )
			path = handler.paths.downloaded + path;
		else
			path = handler.paths.builtIn +'/'+ path;

		if ( updateLastPlayed )
			handler.lastPlayed[this.id] = track;

		return {
			track,
			path
		};
	}

	getPreview({game, event = null, updateLastPlayed = true, announce = true}) {
		if ( ! this[game] )
			return null;

		// console.log('getPreview()', {game, event, updateLastPlayed, announce});

		let events;

		if ( event === null ) {
			events = Object.keys(this[game]).filter(e => !!(this[game][e] && this[game][e].length));
		} else {
			if ( ! appConfig.eventCategories[event] )
				return null;

			events = appConfig.eventCategories[event].filter(e => !!(this[game][e] && this[game][e].length));
		}

		if ( this.announcer )
			events = events.filter(e => ( announce === e.startsWith('announcer_') ));

		let track;

		if ( events.length === 0 )
			return null;
		else if ( events.length === 1 )
			event = events[0];
		else
			event = events[Math.floor(Math.random() * events.length)];

		if ( this[game][event].length === 0 ) {
			return null;
		} else if ( this[game][event].length === 1 ) {
			track = this[game][event][0];
		} else {
			const findRandom = () => this[game][event][Math.floor(Math.random() * this[game][event].length)];

			track = findRandom();

			while ( handler.lastPlayed[this.id] === track )
				track = findRandom();
		}

		let path = this.id +'/'+ track +'.ogg';

		if ( this.origin === 'documents' )
			path = handler.paths.downloaded + path;
		else
			path = handler.paths.builtIn +'/'+ path;

		if ( updateLastPlayed )
			handler.lastPlayed[this.id] = track;

		return {
			track,
			path
		};
	}
}

class randomVoicePack {
	constructor(src) {
		this.id			= src.id || handler.user.titleToId(src.title);
		this.acquiredBy	= 'user';
		this.type		= 'random';
		this.set(src);
	}

	set(src) {
		this.title		= src.title;
		this.shortTitle	= (src.title.length > 13) ? (src.title.slice(0, 10) + '\u2026') : src.title;
		this.vpsSrc		= src.vps;
		this.vps		= src.vps.filter(id => !!id).map(id => handler.get(id));
	}

	update() {
		persState.set('userVPs/'+ this.id, {
			id		: this.id,
			title	: this.title,
			type	: this.type,
			vps		: this.vpsSrc
		});
	}

	/*remove() {
		persState.remove('userVPs/'+ this.id);
	}*/

	getTrack({game, event}) {
		let tracks = [];

		for ( let vp of this.vps ) {
			const track = vp.getTrack({game, event, updateLastPlayed : true, announce : false});

			if ( track )
				tracks.push({id : vp.id, track});
		}

		if ( tracks.length === 0 ) {
			// console.log('getTrack(): no tracks for '+ game +'/'+ event);
			return null;
		}

		const t = tracks[Math.floor(Math.random() * tracks.length)];

		handler.lastPlayed[t.id] = t.track;

		return t.track;
	}

	getPreview({game, event = null}) {
		let tracks = [];

		for ( let vp of this.vps ) {
			const track = vp.getPreview({game, event, updateLastPlayed : true, announce : false});

			if ( track )
				tracks.push({id : vp.id, track});
		}

		if ( tracks.length === 0 ) {
			// console.log('getPreview(): no tracks for '+ game +'/'+ event);
			return null;
		}

		const t = tracks[Math.floor(Math.random() * tracks.length)];

		handler.lastPlayed[t.id] = t.track;

		return t.track;
	}
}

class customVoicePack {
	constructor(src) {
		this.id			= src.id || handler.user.titleToId(src.title);
		this.acquiredBy	= 'user';
		this.type		= 'custom';
		this.set(src);
	}

	set(src) {
		this.title		= src.title;
		this.shortTitle	= (src.title.length > 13) ? (src.title.slice(0, 10) + '\u2026') : src.title;
		this.vpsSrc		= src.vps;
		this.game		= src.game;
		this.gameObj	= appConfig.games.find(game => game.name === this.game);

		for ( let slot in this.gameObj.customSlots ) {
			if ( this.vpsSrc[slot] )
				this[slot] = handler.get(this.vpsSrc[slot]);
		}
	}

	update() {
		persState.set('userVPs/'+ this.id, {
			id		: this.id,
			title	: this.title,
			type	: this.type,
			vps		: this.vpsSrc,
			game	: this.game
		});
	}

	/*remove() {
		persState.remove('userVPs/'+ this.id);
	}*/

	getTrack({game, event}) {
		if ( game !== this.game )
			return false;

		let pack;

		if ( this[event] ) {
			pack = this[event];
		} else {
			for ( let cat in appConfig.eventCategories ) {
				if ( appConfig.eventCategories[cat].includes(event) )
					pack = this[cat] || null;
			}
		}

		if ( pack )
			return pack.getTrack({game, event, announce : false});
		else
			return false;
	}

	getPreview({game, event = null}) {
		const
			cats = Object.keys(this.vpsSrc),
			cat = ( cats.length === 1 ) ? cats[0] : cats[Math.floor(Math.random() * cats.length)],
			pack = this[cat];

		if ( pack )
			return pack.getPreview({game, event, announce : false});
		else
			return false;
	}
}

return handler;
});
