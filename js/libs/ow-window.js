define(() => {

'use strict';

const
	noWindowString = 'no window with the given id was found',
	publicMethods = [
		{
			name : 'restore',
			args : 0
		},
		{
			name : 'minimize',
			args : 0
		},
		{
			name : 'maximize',
			args : 0
		},
		{
			name : 'dragMoveRestrained',
			args : 0
		},
		{
			name : 'dragResize',
			args : 1
		},
		{
			name : 'changeSize',
			args : 2
		},
		{
			name : 'changePosition',
			args : 2
		},
		{
			name : 'center',
			args : 0
		},
		{
			name : 'resizeAndCenter',
			args : 0
		},
		{
			name : 'setTopmost',
			args : 1
		},
		{
			name : 'isWindowVisibleToUser',
			args : 1
		},
		{
			name : 'setDesktopOnly',
			args : 1
		},
	];

class owWindow {
	constructor(name = 'current') {
		this.name		= name;
		this.id			= null;
		this.obtained	= false;
	}
	obtain() { return new Promise((resolve, reject) => {
		const cb = res => {
			if ( res && res.status === 'success' && res.window && res.window.id ) {
				this.obtained = true;
				this.id = res.window.id;

				if ( this.name === 'current' )
					this.name = res.window.name;

				resolve(res.window);
			} else {
				this.obtained = false;
				this.id = null;
				reject(res);
			}
		};

		if ( this.name === 'current' )
			overwolf.windows.getCurrentWindow(cb);
		else
			overwolf.windows.obtainDeclaredWindow(this.name, cb);
	})}
	getWindowState() { return new Promise(resolve => {
		overwolf.windows.getWindowState.call(null, this.name, resolve);
	})}
	dragMove() { return new Promise(resolve => {
		overwolf.windows.dragMove.call(null, this.name, resolve);
	})}
	_close() { return new Promise((resolve, reject) => {
		overwolf.windows.close(this.id, res => {
			this.obtained = false;

			if ( res && res.status === 'success' )
				resolve(res);
			else
				reject(res);
		});
	})}
	async close() {
		if ( ! this.obtained || ! this.id )
			await this.obtain();

		const state = await this.getWindowState();

		if ( state.status === 'success' && state.window_state !== 'closed' )
			await this._close();
	}
	static isErrorWindowNotFound(err) {
		return ( err && err.status === 'error' && err.error && err.error.includes(noWindowString) );
	}
	static getWindowsStates() { return new Promise(resolve => {
		overwolf.windows.getWindowsStates.call(null, result => resolve(result));
	})}
	static getViewportSize() { return new Promise((resolve, reject) => {
		overwolf.utils.getMonitorsList(result => {
			let width = null,
				height = null;

			for ( let display of result.displays ) {
				if ( display.is_primary ) {
					width = display.width;
					height = display.height;
				}
			}

			overwolf.games.getRunningGameInfo(game => {
				if ( game && game.isInFocus ) {
					width = game.width;
					height = game.height;
				}

				if ( width !== null && height !== null )
					resolve({width, height});
				else
					reject(new Error('could not get monitors width/height'));
			});
		});
	})}
	static getMonitorsList() { return new Promise((resolve, reject) => {
		overwolf.utils.getMonitorsList(result => resolve(result));
	})}
}

const uniqueTemplates = {
	async dragResize(edge) {
		if ( ! this.obtained || ! this.id )
			throw 'dragResize error';

		overwolf.windows.dragResize(this.id, edge);
	},
	async dragMoveRestrained() {
		const [win, dragResult, viewport] = await Promise.all([this.obtain(), this.dragMove(), owWindow.getViewportSize()]);

		const
			left	= win.left + dragResult.horizontalChange,
			top		= win.top + dragResult.verticalChange;

		let newLeft	= left,
			newTop	= top;

		if ( left + win.width > viewport.width )
			newLeft = viewport.width - win.width;

		if ( top + win.height > viewport.height )
			newTop = viewport.height - win.height;

		newLeft	= Math.max(newLeft, 0);
		newLeft	= Math.floor(newLeft);

		newTop	= Math.max(newTop, 0);
		newTop	= Math.floor(newTop);

		const out = {
			viewport,
			position : {
				left : newLeft,
				top : newTop
			}
		};

		if ( left !== newLeft || top !== newTop )
			await this.changePosition(newLeft, newTop);

		return out;
	},
	async center() {
		const [win, viewport] = await Promise.all([this.obtain(), owWindow.getViewportSize()]);

		let left	= (viewport.width / 2) - (win.width / 2),
			top		= (viewport.height / 2) - (win.height / 2);

		left	= Math.max(left, 0);
		top		= Math.max(top, 0);

		left	= Math.floor(left);
		top		= Math.floor(top);

		await this.changePosition(left, top);
	},
	async resizeAndCenter(width, height) {
		const viewport = await owWindow.getViewportSize();

		let	left	= (viewport.width / 2) - (width / 2),
			top		= (viewport.height / 2) - (height / 2);

		left	= Math.max(left, 0);
		top		= Math.max(top, 0);

		left	= Math.floor(left);
		top		= Math.floor(top);

		await Promise.all([this.changeSize(width, height), this.changePosition(left, top)]);
	},
};

function genericMethodTemplate(method) {
	return function(...args) {
		return new Promise((resolve, reject) => {
			args = args.slice(0, method.args);

			overwolf.windows[method.name](this.id, ...args, res => {
				if ( res && res.status === 'success' )
					resolve(res);
				else
					reject(res);
			});
		});
	};
}

function getPublicMethod(method) {
	const internalMethod = uniqueTemplates[method.name] || genericMethodTemplate(method);

	return async function(...args) {
		if ( ! this.obtained || ! this.id ) {
			await this.obtain();
			return await internalMethod.apply(this, args);
		}

		try {
			return await internalMethod.apply(this, args);
		} catch (e) {
			if ( owWindow.isErrorWindowNotFound(e) ) {
				this.obtained = false;
				await this.obtain();
				return await internalMethod.apply(this, args);
			} else {
				throw e;
			}
		}
	};
}

publicMethods.forEach(method => {
	owWindow.prototype[method.name] = getPublicMethod(method);
});

return owWindow;
});
