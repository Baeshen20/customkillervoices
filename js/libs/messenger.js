define([
	'libs/utils',
], function(
	utils
) {

'use strict';

const { delay } = utils;

const responseStatus = {
	NOTHING			: 0,
	NO_WINDOW		: 1,
	NO_MESSENGER	: 2,
	NO_LISTENER		: 3,
	SUCCESS 		: 4,
};

class Messenger {
constructor(namespace = 'owAppWindowMessenger') {
	this.namespace = namespace;

	this.listeners = {};

	window[this.namespace] = this;
}
hasListener(id) {
	return ( this.listeners[id] && this.listeners[id].length );
}
callListener(id, content) {
	if ( this.hasListener(id) ) {
		for ( let listener of this.listeners[id] )
			listener.call(undefined, content);

		return true;
	} else {
		return false;
	}
}
on(id, callback) {
	if ( typeof callback !== 'function' )
		throw new Error('callback is not a function');

	if ( ! this.listeners[id] )
		this.listeners[id] = [];

	this.listeners[id].push(callback);
}
off(id, ref) {
	if ( this.listeners[id] && this.listeners[id].length ) {
		const
			listeners = this.listeners[id],
			len = listeners.length;

		for ( let i = 0; i < len; i++ ) {
			if ( listeners[i] === ref )
				listeners.splice(i, 1);
		}
	}
}
async restoreWindow(winName) {
	const obtain = await new Promise(resolve => overwolf.windows.obtainDeclaredWindow(winName, resolve));

	if ( obtain.status !== 'success' ) {
		console.warn('couldn\'t obtain window'+ winName +': '+ JSON.stringify(obtain));
		return false;
	}

	const restore = await new Promise(resolve => overwolf.windows.restore(winName, resolve))

	if ( restore.status !== 'success' ) {
		console.warn('couldn\'t restore window'+ winName +': '+ JSON.stringify(restore));
		return false;
	}

	return true;
}
getRespondingListener(winName, id) { return new Promise(resolve => {
	overwolf.windows.getOpenWindows(windows => {
		if ( ! windows ) {
			resolve({status : responseStatus.NOTHING});
		} else if ( ! windows[winName] ) {
			resolve({status : responseStatus.NO_WINDOW});
		} else if ( ! windows[winName][this.namespace] ) {
			resolve({status : responseStatus.NO_MESSENGER});
		} else if ( ! windows[winName][this.namespace].hasListener(id) ) {
			resolve({status : responseStatus.NO_LISTENER});
		} else {
			resolve({
				status : responseStatus.SUCCESS,
				messenger : windows[winName][this.namespace]
			});
		}
	});
})}
async send(winName, id, content = null, tries = 10, retryInterval = 100) {
	let i = 0;

	while ( i < tries ) {
		if ( i !== 0 )
			await delay(retryInterval);

		const result = await this.getRespondingListener(winName, id);

		switch ( result.status ) {
			case responseStatus.NOTHING:
				console.warn('no windows');
				return false;
			break;
			case responseStatus.NO_WINDOW:
				if ( i > 0 )
					console.log('no window '+ winName +' after '+ (i+1) +' tries');

				await this.restoreWindow(winName);
			break;
			case responseStatus.NO_MESSENGER:
				if ( i > 0 )
					console.log('no messenger at '+ winName +' after '+ (i+1) +' tries');
			break;
			case responseStatus.NO_LISTENER:
				if ( i > 0 )
					console.log('no listener at '+ winName +'/'+ id +' after '+ (i+1) +' tries');
			break;
			case responseStatus.SUCCESS:
				return result.messenger.callListener(id, content);
			break;
		}

		i++;
	}

	console.warn('failed to deliver message to '+ winName +'/'+ id +' after '+ (i+1) +' tries');
	return false;
}
}

return new Messenger();
});
