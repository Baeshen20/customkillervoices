define(() => {

class Tooltip {
constructor(options) {
	this.tooltip	= null;
	this.parent		= options.parent;
	this.content	= (Array.isArray(options.content)) ? options.content.join('') : options.content;
	this.position	= options.position || 'center bottom';
	this.width		= options.width || null;
	this.setWidth	= !!options.width;
	this.nowrap		= options.nowrap || ( ! options.width );
	this.fontSize	= options.fontSize || 12;
	this.shown		= false;

	this._bound = new WeakMap();

	this.parent.addEventListener('mouseenter', this._getBound(this.create));
}

_getBound(method) {
	if ( ! this._bound.has(method) )
		this._bound.set(method, method.bind(this));

	return this._bound.get(method);
}

create() {
	const tooltip = document.createElement("div");
	this.tooltip = tooltip;

	tooltip.classList.add('tooltip');
	tooltip.classList.add('tooltip-'+ this.position.split(" ").join("-"));

	if ( this.nowrap )
		tooltip.classList.add('tooltip-nowrap');

	tooltip.innerHTML = this.content;
	tooltip.style.visibility = 'hidden';
	tooltip.style.fontSize = this.fontSize +'px';

	document.body.appendChild(tooltip);

	if ( this.setWidth )
		tooltip.style.width = this.width +'px';
	else
		this.width = tooltip.offsetWidth;

	this.positionTooltip();
	tooltip.style.visibility = '';
	this.shown = true;

	tooltip.animate({opacity: [0,1]}, {easing : 'ease-in-out', duration : 250});

	this.parent.addEventListener('mouseleave', this._getBound(this.destroy));
	window.addEventListener('wheel', this._getBound(this.destroy), {passive: true});
}

update(newOptions) {
	this.content	= (Array.isArray(newOptions.content)) ? newOptions.content.join('') : newOptions.content;
	this.position	= newOptions.position || 'center bottom';
	this.width		= newOptions.width || null;
	this.nowrap		= newOptions.nowrap || ( ! newOptions.width );
	this.fontSize	= newOptions.fontSize || 12;

	if ( this.shown ) {
		this.destroy();
		this.create();
	}
}

destroy() {
	if ( this.tooltip === null )
		return;

	this.parent.removeEventListener('mouseleave', this._getBound(this.destroy));
	window.removeEventListener('wheel', this._getBound(this.destroy));
	document.body.removeChild(this.tooltip);
	this.shown = false;
	this.tooltip = null;
}

positionTooltip() {
	const
		position		= this.position,
		tooltip			= this.tooltip,
		parent			= this.parent,
		posHorizontal	= position.split(" ")[0],
		posVertical		= position.split(" ")[1],
		parentCoords	= parent.getBoundingClientRect(),
		dist			= 6,
		width			= this.width,
		height			= tooltip.offsetHeight;

	let left,
		top;

	switch (posHorizontal) {
		case "left":
			left = parseInt(parentCoords.left) - dist - width;
			if ( parseInt(parentCoords.left) - width < 0 )
				left = dist;
		break;
		case "leftEdge":
			if ( parseInt(parentCoords.left) < 0 )
				left = 0;
			else
				left = parseInt(parentCoords.left);
		break;
		case "right":
			left = parentCoords.right + dist;
			if ( parseInt(parentCoords.right) + width > document.documentElement.clientWidth )
				left = document.documentElement.clientWidth - width - dist;
		break;
		case "rightEdge":
			left = parentCoords.right;
			if ( parseInt(parentCoords.right) + width > document.documentElement.clientWidth )
				left = document.documentElement.clientWidth - width;
		break;
		default:
		case "center":
			left = parseInt(parentCoords.left) + (parent.offsetWidth / 2) - (width / 2);
	}

	switch (posVertical) {
		case "center":
			top = (parseInt(parentCoords.top) + parseInt(parentCoords.bottom)) / 2 - height / 2;
		break;
		case "top":
			top = parseInt(parentCoords.top) - dist - height;
		break;
		default:
		case "bottom":
			top = parseInt(parentCoords.bottom) + dist;
	}

	left = (left < 0) ? parseInt(parentCoords.left) : left;
	top  = (top < 0) ? 0 : top;
	top  = window.pageYOffset + top;

	tooltip.style.left = left +'px';
	tooltip.style.top  = top +'px';
}
}

return Tooltip;
});
