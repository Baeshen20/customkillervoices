define([
	'libs/utils'
], function(
	utils
) {

'use strict';

const { debounce, throttle } = utils;

class Draggable {
constructor(el, group, data) {
	this.orig	= el;
	this.group	= group;
	this.data	= data;

	this.dragging		= false;
	this.startingDrag	= false;

	this.clone = null;

	this.targetEls		= null;
	this.targetRects	= null;
	this.targetHover	= null;

	this.pointerX	= 0;
	this.pointerY	= 0;
	this.holdX		= 0;
	this.holdY		= 0;
	this.cloneWidth	= null;
	this.cloneHeight = null;

	this._bound = new WeakMap();

	this.detectCollisionsDebounced = debounce(this.detectCollisions, 20);

	this.bind();
}

setData(data) {
	if ( data !== this.data )
		this.data = data;
}

_getBound(method) {
	if ( ! this._bound.has(method) )
		this._bound.set(method, method.bind(this));

	return this._bound.get(method);
}

bind() {
	this.orig.addEventListener('mousedown', this._getBound(this.onMouseDown));
	document.addEventListener('mouseup', this._getBound(this.onMouseUp));
}

unbind() {
	this.orig.removeEventListener('mousedown', this._getBound(this.onMouseDown));
	document.removeEventListener('mouseup', this._getBound(this.onMouseUp));
	document.removeEventListener('mousemove', this._getBound(this.onMouseDrag));
}

onMouseDown(event) {
	if ( this.dragging ) {
		this.stopDragging();
		return;
	}

	this.startingDrag = true;

	document.addEventListener('mousemove', this._getBound(this.onMouseDrag));
}

onMouseDrag(event) {
	requestAnimationFrame(() => this.drag(event));
	// this.drag(event);
}

onMouseUp() {
	this.stopDragging();
}

drag(event) {
	if ( this.startingDrag )
		this.startDragging(event);

	if ( ! this.dragging )
		return;

	const
		pointerX = this.pointerX = event.clientX,
		pointerY = this.pointerY = event.clientY,
		cloneX = pointerX - this.holdX,
		cloneY = pointerY - this.holdY;

	this.clone.style.left	= cloneX +'px';
	this.clone.style.top	= cloneY +'px';

	this.detectCollisionsDebounced();
}

startDragging(event) {
	// console.log('startDragging()');

	if ( this.dragging ) {
		this.stopDragging();
		return;
	}

	const
		rect = this.orig.getBoundingClientRect(),
		pointerX = this.pointerX = event.clientX,
		pointerY = this.pointerY = event.clientY;

	this.dragging		= true;
	this.startingDrag	= false;
	this.targetEls		= document.querySelectorAll('[data-dropzone-group="'+ this.group +'"]');
	this.clone			= this.orig.cloneNode(true);

	this.clone.style.visibility = 'hidden';

	this.clone.classList.add('draggable-dragging');

	document.body.classList.add('draggable-active');
	document.body.appendChild(this.clone);

	this.cloneWidth = this.clone.clientWidth;
	this.cloneHeight = this.clone.clientHeight;
	this.holdX = Math.floor(this.cloneWidth / 2);
	this.holdY = Math.floor(this.cloneHeight / 2);

	const
		cloneX = pointerX - this.holdX,
		cloneY = pointerY - this.holdY;

	this.clone.style.left = cloneX +'px';
	this.clone.style.top = cloneY +'px';

	this.clone.style.visibility = '';

	this.targetRects = {};
	this.targetHover = {};

	for ( let el of this.targetEls )
		this.targetRects[el.getAttribute('data-dropzone-id')] = el.getBoundingClientRect();
}

stopDragging() {
	this.startingDrag = false;

	if ( ! this.dragging )
		return;

	// console.log('stopDragging()');

	this.detectDrop();

	this.dragging = false;
	document.body.classList.remove('draggable-active');

	if ( this.clone )
		this.clone.remove();

	this.clone			= null;
	this.cloneWidth		= null;
	this.cloneHeight	= null;

	this.pointerX	= 0;
	this.pointerY	= 0;
	this.holdX		= 0;
	this.holdY		= 0;

	this.targetEls		= null;
	this.targetRects	= null;
	this.targetHover	= null;

	document.removeEventListener('mousemove', this._getBound(this.onMouseDrag));
}

detectDrop() {
	const
		pointerX = this.pointerX,
		pointerY = this.pointerY;

	let dropped = false;

	for ( let id in this.targetRects ) {
		const rect = this.targetRects[id];

		if (
			! dropped
			&& ( pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom )
		) {
			dropped = true;

			const zone = window['dropzone-id-'+ id];

			if ( zone ) {
				zone.drop(this.data);
				zone.leave();
			}
		} else {
			const zone = window['dropzone-id-'+ id];

			if ( zone )
				zone.leave();
		}
	}
}

detectCollisions() {
	// console.log('detectCollisions()');

	const
		pointerX = this.pointerX,
		pointerY = this.pointerY,
		itemX = this.pointerX - this.holdX + (this.cloneWidth / 2),
		itemY = this.pointerY - this.holdY + (this.cloneHeight / 2);

	let entered = false;

	for ( let id in this.targetRects ) {
		const rect = this.targetRects[id];

		if (
			! entered
			&& ( pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom )
		) {
			entered = true;

			if ( ! this.targetHover[id] ) {
				this.targetHover[id] = true;

				const zone = window['dropzone-id-'+ id];

				if ( zone )
					zone.enter();
			}
		} else {
			if ( this.targetHover[id] ) {
				this.targetHover[id] = false;

				const zone = window['dropzone-id-'+ id];

				if ( zone )
					zone.leave();
			}
		}
	}
}
}

return Draggable;
});
