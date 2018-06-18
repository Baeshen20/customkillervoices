define([
	'libs/utils'
],
function(
	utils
) {

'use strict';

const { delay } = utils;

const Downloader = {
plugin : null,
loading : false,
downloading : false,

async init() {
	if ( this.loading ) {
		while ( this.loading && ! this.plugin )
			await delay(50);
	}

	if ( this.plugin )
		return;

	this.loading = true;

	return await new Promise((resolve, reject) => {
		overwolf.extensions.current.getExtraObject('OverwolfDownloader', result => {
			this.loading = false;

			if ( result.status === 'success' ) {
				resolve();
				this.plugin = result.object;
			} else {
				const msg = 'could not load OverwolfDownloader: '+ JSON.stringify(result);
				console.warn('Downloader.init(): error: '+ msg);
				reject(msg);
			}
		})
	});
},

createMyDocsDir(newPath) { return new Promise((resolve, reject) => {
	let	path;

	const onMyDocumentsPath = myDocsPath => {
		this.plugin.onMyDocumentsPath.removeListener(onMyDocumentsPath);

		myDocsPath = myDocsPath.replace(/\\/g, '/');

		path = myDocsPath +'/'+ newPath +'/';

		this.checkDirExists(path)
			.then(exists => {
				if ( ! exists )
					return this.createDir(path);
			})
			.then(() => resolve(path))
			.catch(reject);
	};

	this.plugin.onMyDocumentsPath.addListener(onMyDocumentsPath);
	this.plugin.getMyDocumentsPath();
})},

createDir(path) { return new Promise((resolve, reject) => {
	// console.log('Downloader.createDir(): creating: '+ path);

	const
		onSuccess = pathThatExists => {
			this.plugin.onAssurePathExistsResult.removeListener(onSuccess);
			// console.log('Downloader.createDir(): success: '+ path);
			resolve(pathThatExists);
		},
		onError = error => {
			this.plugin.onAssurePathExistsError.removeListener(onError);
			// console.warn('Downloader.createDir(): error: '+ path);
			reject(error);
		};

	this.plugin.onAssurePathExistsResult.addListener(onSuccess);
	this.plugin.onAssurePathExistsError.addListener(onError);

	this.plugin.assurePathExists(path);
})},

checkExists(path, type) { return new Promise(resolve => {
	// console.log('Downloader.checkExists(): checking '+ type +': '+ path);

	let onDoesExist = exists => {
		this.plugin.onDoesExist.removeListener(onDoesExist);

		// console.log('Downloader.checkExists(): '+ type +' '+ (exists ? 'exists' : 'doesn\'t exist') +': '+ path);

		resolve(exists);
	};

	this.plugin.onDoesExist.addListener(onDoesExist);

	if ( type === 'file' )
		this.plugin.doesFileExist(path);
	else
		this.plugin.doesDirectoryExist(path);
})},

checkDirExists(path) {
	return this.checkExists(path, 'dir');
},

checkFileExists(path) {
	return this.checkExists(path, 'file');
},

async checkDirsExist(paths) {
	const out = {};

	for (let i = 0; i < paths.length; i++)
		out[paths[i]] = await this.checkDirExists(paths[i]);

	return out;
},

_downloadFile(url, localPath, onProgress = null) { return new Promise((resolve, reject) => {
	let
		fakeProgressTimeout = null,
		latestProgress = -1;

	const
		onDownloadError = error => {
			this.plugin.onDownloadError.removeListener(onDownloadError);
			this.plugin.onDownloadProgress.removeListener(onDownloadProgress);
			this.plugin.onDownloadComplete.removeListener(onDownloadComplete);

			if ( fakeProgressTimeout !== null )
				clearTimeout(fakeProgressTimeout);

			reject(error);
		},
		onDownloadComplete = resultPath => {
			this.plugin.onDownloadError.removeListener(onDownloadError);
			this.plugin.onDownloadComplete.removeListener(onDownloadComplete);
			this.plugin.onDownloadProgress.removeListener(onDownloadProgress);

			if ( fakeProgressTimeout !== null )
				clearTimeout(fakeProgressTimeout);

			resolve(localPath);
		},
		onDownloadProgress = progress => {
			if ( onProgress && progress > latestProgress ) {
				latestProgress = progress;
				onProgress(progress);
			}
		},
		fakeProgress = () => {
			fakeProgressTimeout = setTimeout(() => {
				if ( latestProgress < 80 ) {
					onDownloadProgress(latestProgress + 1);
					fakeProgress();
				}
			}, 20 + Math.random() * 300);
		};

	this.plugin.onDownloadError.addListener(reject);
	this.plugin.onDownloadComplete.addListener(onDownloadComplete);
	this.plugin.onDownloadProgress.addListener(onDownloadProgress);

	if ( fakeProgressTimeout !== null )
		clearTimeout(fakeProgressTimeout);

	this.plugin.downloadFile(url, localPath, true);
	fakeProgress();
})},

async _downloadFileIfNotExists(url, localPath, onProgress = null) {
	if ( await this.checkFileExists(localPath) )
		return localPath;
	else
		return await this._downloadFile(url, localPath, onProgress);
},

async downloadFile(url, localPath, onProgress = null) {
	while ( this.downloading )
		await delay(50);

	this.downloading = true;
	const result = await this._downloadFile(url, localPath, onProgress);
	this.downloading = false;

	return result;
}
};

const
	downloaderHelper = {},
	downloaderMethods = [
		'createMyDocsDir',
		'createDir',
		'checkExists',
		'checkDirExists',
		'checkFileExists',
		'checkDirsExist',
		'downloadFile',
	];

for ( let method of downloaderMethods ) {
	downloaderHelper[method] = async (...args) => {
		await Downloader.init();
		return await Downloader[method](...args);
	};
}

return downloaderHelper;
});
