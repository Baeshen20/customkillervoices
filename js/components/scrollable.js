define(function() {

'use strict';

class Scrollable {
constructor(target) {
	this.target = target;
	this.bar = document.querySelector('.scrollable-scroll');
	this.content = document.querySelector('.scrollable-content');

	this.dragDealer();
	this.moveBar();

	this.content.addEventListener('scroll', this.moveBar.bind(this));
	this.content.addEventListener('mouseenter', this.moveBar.bind(this));

	const css = window.getComputedStyle(this.target);

	if ( css.height === '0px' && css['max-height'] !== '0px' )
		this.target.style.height = css['max-height'];
}
dragDealer() {
	const that = this;

	let lastPageY;

	that.bar.addEventListener('mousedown', function(e) {
		lastPageY = e.pageY;
		that.bar.classList.add('scrollable-grabbed');
		document.body.classList.add('scrollable-grabbed');

		document.addEventListener('mousemove', drag);
		document.addEventListener('mouseup', stop);

		return false;
	});

	function drag(e) {
		const
			delta = e.pageY - lastPageY;
			lastPageY = e.pageY;

		requestAnimationFrame(() => that.content.scrollTop += delta / that.scrollRatio);
	}

	function stop() {
		that.bar.classList.remove('scrollable-grabbed');
		document.body.classList.remove('scrollable-grabbed');
		document.removeEventListener('mousemove', drag);
		document.removeEventListener('mouseup', stop);
	}
}
moveBar(e) {
	const
		totalHeight = this.content.scrollHeight,
		ownHeight = this.content.clientHeight;

	this.scrollRatio = ownHeight / totalHeight;

	requestAnimationFrame(() => {
		if ( this.scrollRatio >= 1 ) {
			this.bar.classList.add('scrollable-hidden');
		} else {
			this.bar.style.height = Math.max(this.scrollRatio * 100, 10) + '%';
			this.bar.style.top = ((this.content.scrollTop / totalHeight ) * 100) + '%';
			this.bar.classList.remove('scrollable-hidden');
		}
	});
}
update() {
	this.moveBar();
}
}

return {
	template : `<div class="scrollable-container">
		<div class="scrollable-content"><slot></slot></div>
		<div class="scrollable-scroll"></div>
	</div>`,
	data() {
		return {
			_inst : null
		};
	},
	async mounted() {
		await this.$nextTick();
		this._inst = new Scrollable(this.$el);
	},
	updated() {
		this._inst.update();
	}
};
});
