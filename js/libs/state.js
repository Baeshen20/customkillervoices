define(() => {

'use strict';

class PersistentState {
constructor(name) {
	this.name		= name;
	this.data		= {};
	this.listeners	= {};
	this.followed	= {};
	this.prefix		= name +'/';

	this.bindStorageEvent();
}
bindStorageEvent() {
	window.addEventListener('storage', this.handleStorageEvent.bind(this), false);
}
handleStorageEvent(e) {
	if ( ! e.key.startsWith(this.prefix) )
		return;

	const key = e.key.replace(this.prefix, '');

	if ( ! key )
		return;

	if ( this.followed[key] )
		this.data[key] = e.newValue;

	this.callListener(key, JSON.parse(e.newValue));
}
callListener(key, value) {
	if ( this.listeners[key] && this.listeners[key].length ) {
		for ( let listener of this.listeners[key] ) {
			listener.call(null, value);
		}
	}
}
on(key, callback) {
	if ( typeof callback === 'function' ) {
		if ( ! this.listeners[key] )
			 this.listeners[key] = [];

		this.listeners[key].push(callback);

		// if ( ! key.includes('*') )
		this.follow(key);
	}
}
off(key, ref) {
	if ( this.listeners[key] ) {
		for ( let i = 0; i < this.listeners[key].length; i++ ) {
			if ( this.listeners[key][i] === ref )
				this.listeners[key].splice(i, 1);
		}

		// if ( ! key.includes('*') )
		this.unfollow(key);
	}
}
follow(key) {
	if ( key )
		this.followed[key] = true;
}
unfollow(key) {
	if ( key && this.followed[key] )
		delete this.followed[key];
}
get(key, noParse) {
	if ( ! key )
		return null;

	let value;

	if ( this.followed[key] && typeof this.data[key] !== 'undefined' )
		value = this.data[key];
	else
		value = localStorage.getItem(this.prefix + key);

	if ( value === null )
		return value;

	if ( noParse )
		return value;

	return JSON.parse(value);
}
set(key, value) {
	let old = this.get(key, true),
		jsonValue = JSON.stringify(value);

	if ( old === null || old !== jsonValue ) {
		if ( this.followed[key] )
			this.data[key] = jsonValue;

		localStorage.setItem(this.prefix + key, jsonValue);

		this.callListener(key, value);
	}
}
remove(key) {
	if ( typeof this.data[key] !== 'undefined' )
		delete this.data[key];

	localStorage.removeItem(this.prefix + key);

	this.callListener(key, null);
}
}

class NonPersistentState extends PersistentState {
constructor(name) {
	super(name);
	this.silenceKey	= 'silenceChanges/'+ name;
}
bindStorageEvent() {
	window.addEventListener('storage', this.handleStorageEvent.bind(this), false);
}
handleStorageEvent(e) {
	if ( this.silent )
		return;

	super.handleStorageEvent(e);
}
get silent() {
	return !! localStorage.getItem(this.silenceKey);
}
silence() {
	localStorage.setItem(this.silenceKey, 1);
}
unSilence() {
	localStorage.removeItem(this.silenceKey);
}
reset() {
	this.silence();

	for ( let name in localStorage ) {
		if ( name.startsWith(this.prefix) )
			localStorage.removeItem(name);
	}

	this.unSilence();

	this.data = {};
}
callListener(event, value) {
	if ( this.silent )
		return;

	super.callListener(event, value);
}
}

return {
	get state() {
		delete this.state;
		return this.state = new NonPersistentState('state');
	},
	get persState() {
		delete this.persState;
		return this.persState = new PersistentState('persState')
	}
}
});
