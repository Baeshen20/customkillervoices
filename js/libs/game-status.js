define(() => {

'use strict';

class gameStatus {
constructor() {
	this.isInFocus	= false;
	this.isRunning	= false;
	this.gameInfo	= null;
	this.listeners	= {};

	this._bound = new WeakMap();

	this.init();
}
_getBound(method) {
	if ( ! this._bound.has(method) )
		this._bound.set(method, method.bind(this));

	return this._bound.get(method);
}
async init() {
	const gameInfo = await new Promise(resolve => {
		overwolf.games.getRunningGameInfo(resolve);
	});

	this.setGameInfo(gameInfo);
	this.setInFocus((gameInfo && gameInfo.isInFocus));
	this.setIsRunning((gameInfo && gameInfo.isRunning));

	overwolf.games.onGameInfoUpdated.addListener(this._getBound(this.onGameInfoUpdated));
}
onGameInfoUpdated(e) {
	this.setGameInfo(e.gameInfo);
	this.setInFocus((e && e.gameInfo && e.gameInfo.isInFocus));
	this.setIsRunning((e && e.gameInfo && e.gameInfo.isRunning));
}
callListener(event, value) {
	if ( this.listeners[event] && this.listeners[event].length ) {
		for ( let listener of this.listeners[event] ) {
			listener.call(null, value);
		}
	}
}
on(event, callback) {
	if ( typeof callback === 'function' ) {
		if ( ! this.listeners[event] )
			 this.listeners[event] = [];

		if ( ! this.listeners[event].includes(callback) )
			this.listeners[event].push(callback);
	}
}
off(event, ref) {
	if ( this.listeners[event] ) {
		for ( let i = 0; i < this.listeners[event].length; i++ ) {
			if ( this.listeners[event][i] === ref )
				this.listeners[event].splice(i, 1);
		}
	}
}
setInFocus(set) {
	set = !! set;

	if ( set !== this.isInFocus ) {
		this.isInFocus = set;
		this.callListener('focus', this.isInFocus);
	}
}
setIsRunning(set) {
	set = !! set;

	if ( set !== this.isRunning ) {
		this.isRunning = set;
		this.callListener('running', this.isRunning);
	}
}
setGameInfo(gameInfo) {
	if ( gameInfo && gameInfo.isRunning )
		this.gameInfo = gameInfo;
	else
		this.gameInfo = null;
}
get gameId() {
	if ( this.isRunning )
		return Math.floor(this.gameInfo.id / 10);
}
gameIs(id) {
	return ( this.isRunning && this.gameId === id );
}
}

return new gameStatus();
});
