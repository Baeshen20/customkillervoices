define(() => {

'use strict';

const AsyncFunction = Object.getPrototypeOf(async () => null).constructor;

const debounce = function(func, wait, immediate) {
	var timeout;

	return function() {
		var context = this,
			args = arguments;

		var later = function() {
			timeout = null;
			if (!immediate)
				func.apply(context, args);
		};

		var callNow = immediate && !timeout;

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);

		if (callNow)
			func.apply(context, args);
	};
};

const throttle = function(func, limit) {
	let inThrottle = undefined;

	return function() {
		let args = arguments,
			context = this;

		if (!inThrottle) {
			func.apply(context, args);
			inThrottle = true;
			return setTimeout(function() {
				return inThrottle = false;
			}, limit);
		}
	};
};

const isAsyncFunction = fn => (fn instanceof AsyncFunction);

const delay = time => new Promise(resolve => setTimeout(resolve, time));

const objectCopy = input => JSON.parse(JSON.stringify(input));

const getRequest = (url, options) => { return new Promise((resolve, reject) => {
	options = options || {};

	const error = e => reject({
		error		: e,
		code		: xhr.status,
		response	: xhr.response
	});

	const xhr = new XMLHttpRequest();

	xhr.open('GET', url, true);

	if ( options.json )
		xhr.responseType = 'json';

	if ( options.noCache )
		xhr.setRequestHeader('Cache-Control', 'no-cache');

	if ( options.headers ) {
		for ( let name in options.headers )
			xhr.setRequestHeader(name, options.headers[name]);
	}

	xhr.onload = () => {
		if ( xhr.readyState === 4 ) {
			if ( xhr.status === 200 )
				resolve(xhr.response);
			else
				error(xhr.status);
		}
	};

	xhr.onerror = () => error(xhr.status);

	xhr.send(null);
})};

const postRequest = (url, options) => { return new Promise((resolve, reject) => {
	options = options || {};

	const error = e => {
		reject({
			error: e,
			code: xhr.status,
			response: xhr.response
		});
	};

	const xhr = new XMLHttpRequest();

	xhr.open('POST', url, true);

	if ( options.json )
		xhr.responseType = 'json';

	if ( options.noCache )
		xhr.setRequestHeader('Cache-Control', 'no-cache');

	if ( options.headers ) {
		for ( let name in options.headers )
			xhr.setRequestHeader(name, options.headers[name]);
	}

	xhr.onload = () => {
		if ( xhr.readyState === 4 ) {
			if ( xhr.status === 200 )
				resolve(xhr.response);
			else
				error(xhr.status);
		}
	};

	xhr.onerror = () => error(xhr.status);

	xhr.send(options.data || null);
})};

const arrayChunk = (arr, len) => {
	let	chunks = [],
		i = 0,
		n = arr.length;

	while (i < n) {
		chunks.push(arr.slice(i, i += len));
	}

	return chunks;
}

return {
	debounce,
	throttle,
	delay,
	isAsyncFunction,
	objectCopy,
	getRequest,
	postRequest,
	arrayChunk,
};
});
