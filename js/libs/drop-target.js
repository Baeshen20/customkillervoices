define([
	'libs/utils'
], function(
	utils
) {

'use strict';

class DropTarget {
constructor(el, id, group) {
	this.el		= el;
	this.id		= id;
	this.group	= group;

	this.dropListener = null;

	this.bind();
}

bind() {
	this.el.setAttribute('data-dropzone-group', this.group);
	this.el.setAttribute('data-dropzone-id', this.id);
	window['dropzone-id-'+ this.id] = this;
}

unbind() {
	this.el.removeAttribute('data-dropzone-group');
	this.el.removeAttribute('data-dropzone-id');
	delete window['dropzone-id-'+ this.id];
}

onDrop(listener) {
	this.dropListener = listener;
}

enter() {
	// console.log('enter()', this.id);
	this.el.classList.add('drop-target-enter');
}

leave() {
	// console.log('leave()', this.id);
	this.el.classList.remove('drop-target-enter');
}

drop(data) {
	// console.log('drop()', this.id, data);

	if ( this.dropListener )
		this.dropListener(data);
}
}

return DropTarget;
});
