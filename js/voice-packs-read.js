define([
	'app-config',
	'vp-db',
	'libs/utils',
	'libs/state'
], function(
	appConfig,
	vpdb,
	utils,
	state
) {

'use strict';

const
	{ persState }	= state,
	{ debounce }	= utils;

const handler = {
	_bound			: new WeakMap(),
	listeners		: {},

	get installedVPs() {
		return persState.get('installedVPs') || [];
	},

	get selectedVPs() {
		return persState.get('selectedVPs') || {};
	},

	_getBound(method) {
		if ( ! this._bound.has(method) )
			this._bound.set(method, method.bind(this));

		return this._bound.get(method);
	},

	init() {
		this.onUpdateDebounced = debounce(() => this.callListener('update'), 50),

		persState.on('userVPs', this._getBound(this.onUpdateDebounced));
		persState.on('installedVPs', this._getBound(this.onUpdateDebounced));
		persState.on('selectedVPs', this._getBound(this.onUpdateDebounced));

		this.general.init();
	},

	callListener(key, value) {
		if ( this.listeners[key] && this.listeners[key].length ) {
			for ( let listener of this.listeners[key] ) {
				listener.call(null, value);
			}
		}
	},

	on(event, callback) {
		if ( typeof callback === 'function' ) {
			if ( ! this.listeners[event] )
				 this.listeners[event] = [];

			this.listeners[event].push(callback);
		}
	},

	off(event, ref) {
		if ( this.listeners[event] ) {
			for ( let i = 0; i < this.listeners[event].length; i++ ) {
				if ( this.listeners[event][i] === ref )
					this.listeners[event].splice(i, 1);
			}
		}
	},

	getList() {
		return this.general.list.concat(this.user.getList());
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

	namingConflict(title, id = null) {
		return this.getList().some(vp => {
			return ((id !== null && vp.id === id) || (vp.shortTitle || vp.title) === title);
		});
	}
};

handler.general = {
	list	: vpdb,
	db		: {},

	init() {
		for ( let i = 0; i < this.list.length; i++ ) {
			const vp = this.list[i];
			this.db[vp.id] = vp;
		}
	},

	has(id) {
		return ( this.db.includes(id) );
	},

	get(id) {
		return this.db[id] || null;
	}
};

handler.user = {
	get index() {
		return persState.get('userVPs') || [];
	},

	getList() {
		const
			srcList = this.index,
			list = [];

		for ( let i = 0; i < srcList.length; i++ ) {
			const vp = this.get(srcList[i]);

			if ( vp )
				list.push(vp);
		}

		return list;
	},

	has(id) {
		return ( this.index.includes(id) );
	},

	get(id) {
		if ( ! this.index.includes(id) )
			return null;

		return persState.get('userVPs/'+ id) || null;
	}
};

return handler;
});
