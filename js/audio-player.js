define([
	'libs/utils',
], function(
	utils
) {

'use strict';

const { delay } = utils;

class AudioPlayer {
constructor() {
	this.audioDOM = null;
	this.current = null;
	this.currentPromise = null;
	this.currentResolve = null;
	this.currentAfter = null;
}
initAudio() {
	this.audioDOM = document.createElement('audio');
	this.audioDOM.onerror = this.onError.bind(this);
	this.audioDOM.autoplay = true;
	this.audioDOM.preload = 'auto';
	this.audioDOM.onpause = this.onStopped.bind(this);
	this.audioDOM.onended = this.onStopped.bind(this);
}
async playTrack({src, volume, before, after}) {
	console.log('playTrack(): playing '+ src);

	if ( this.current )
		await this.stopCurrent();

	if ( before )
		await before();

	this.current = src;
	this.currentPromise = new Promise(resolve => { this.currentResolve = resolve });

	if ( after )
		this.currentAfter = after;
	else
		this.currentAfter = null;

	if ( this.audioDOM === null )
		this.initAudio(src);

	this.audioDOM.volume = (volume / 100);
	this.audioDOM.src = src;
	this.audioDOM.load();

	await this.currentPromise;
}
async stopCurrent() {
	if ( this.current ) {
		if ( ! this.audioDOM.paused )
			this.audioDOM.pause();

		if ( this.currentPromise ) {
			// const current = this.current;
			// console.log('stopCurrent(): stopping '+ current);
			await this.currentPromise;
			// console.log('stopCurrent(): stopped '+ current);
		}
	}
}
async onError() {
	if ( this.audioDOM.error ) {
		if ( this.audioDOM.error.message )
			console.error('onError(): '+ this.audioDOM.error.message, this.audioDOM.error);
		else
			console.error('onError(): '+ JSON.stringify(this.audioDOM.error), this.audioDOM.error);
	}

	await this.onStopped();
}
async onStopped() {
	if ( this.current ) {
		this.current = null;

		if ( this.currentAfter )
			await this.currentAfter();

		let resolve;

		if ( this.currentResolve )
			resolve = this.currentResolve

		this.current = null;
		this.currentPromise = null;
		this.currentResolve = null;
		this.currentAfter = null;

		if ( resolve )
			resolve();
	}
}
}

return new AudioPlayer;
});
