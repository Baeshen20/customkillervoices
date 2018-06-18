define([
	'libs/nouislider.min'
], function(
	noUiSlider
) {

'use strict';

const rangeSlider = {
	template :
`<div ref="range"></div>`,

	props : {
		cssPrefix : {
			type : String,
			default : 'range-'
		},
		direction : {
			type : String,
			default : 'ltr'
		},
		value : {
			type : Number,
			default : 0
		},
		range : {
			type : Object,
			default() {
				return {
					min : 0,
					max : 100
				};
			}
		},
		step : {
			type : Number,
			default : 1
		},
		tooltip : {
			type : Boolean,
			default : true
		},
		orientation : {
			type : String,
			default : 'horizontal'
		},
	},

	data() {
		return {
			_nouisliderInst : null
		}
	},

	watch: {
		value(v) {
			this._nouisliderInst.set(v);
		}
	},

	async mounted() {
		await this.$nextTick();

		this._nouisliderInst = noUiSlider.create(this.$refs.range, {
			cssPrefix	: this.cssPrefix,
			orientation	: this.orientation,
			start		: this.value,
			step		: this.step,
			connect		: [false, true],
			tooltips	: this.tooltip,
			range		: this.range,
			direction	: this.direction,
			format		: {
				to: v => v +'%',
				from: v => parseInt(v)
			}
		});

		this._nouisliderInst.on('change', v => {
			this.$emit('input', parseInt(v[0]));
		});
	}
};

return rangeSlider;
});
