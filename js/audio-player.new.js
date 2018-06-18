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
	this.currentStop = null;

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

	console.log('initAudio():', this.audioDOM);
}
async playTrack({src, volume, before, after}) {
	console.log('playTrack(): starting '+ src);

	if ( this.current )
		await this.stopCurrent();

	if ( before )
		await before();

	this.current = src;

	await this.currentPromise = new Promise(resolve => {
		this.currentResolve = resolve;

		if ( after )
			this.currentAfter = after;
		else
			this.currentAfter = null;

		const audio = document.createElement('audio');

		audio.onerror = () => resolve();
		audio.autoplay = true;
		audio.preload = 'auto';
		audio.volume = (volume / 100);
		audio.src = src;
		audio.load();
		audio.onpause = () => resolve();
	});

	console.log('playTrack(): playing '+ src);
	// await this.audioDOM.play();

	await this.currentPromise;
}
async stopCurrent() {
	if ( this.currentStop )
		await this.currentStop();
}
async stopCurrent() {
	if ( this.current ) {
		this.audioDOM.pause();

		if ( this.currentPromise ) {
			console.log('stopCurrent(): stopping '+ this.current);
			await this.currentPromise;
			console.log('stopCurrent(): stopped');
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
	console.log('onStopped(): ', this.current, this.currentPromise, this.currentAfter);

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
