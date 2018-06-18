define(['libs/swiper'], swiper => {
return {
	Carousel : {
		template :
`<div class="swiper-outer">
	<div class="swiper-container" ref="container">
		<div class="swiper-wrapper"><slot></slot></div>
	</div>
	<div class="swiper-button swiper-button-prev" ref="prev">
		<svg class="svg-icon-stroke">
			<use xlink:href="img/sprite.svg#nav-arrow" />
		</svg>
	</div>
	<div class="swiper-button swiper-button-next" ref="next">
		<svg class="svg-icon-stroke">
			<use xlink:href="img/sprite.svg#nav-arrow" />
		</svg>
	</div>
</div>`,
		props : {
			setwrappersize : {
				type : Boolean,
				default : false
			},
			slidespergroup : {
				type : Number,
				default : 1
			},
			slidesperview : {
				type : [String, Number],
				default : 'auto'
			},
			centeredslides : {
				type : Boolean,
				default : false
			},
			index : {
				type : Number,
				default : 0
			},
			spacebetween : {
				type : Number,
				default : 0
			},
			slidesoffsetbefore : {
				type : Number,
				default : 0
			},
			slidesoffsetafter : {
				type : Number,
				default : 0
			},
			breakpoints : {
				type : Object,
				default : null
			}
		},
		data() {
			return {
				_swiper : null,
				slideCount : 0
			};
		},
		async mounted() {
			await this.$nextTick();

			this._swiper = new Swiper(this.$refs.container, {
				prevButton				: this.$refs.prev,
				nextButton				: this.$refs.next,
				initialSlide			: this.index,
				setWrapperSize			: this.setwrappersize,
				slidesPerView			: this.slidesperview,
				centeredSlides			: this.centeredslides,
				spaceBetween			: this.spacebetween,
				slidesPerGroup			: this.slidespergroup,
				slidesOffsetBefore		: this.slidesoffsetbefore,
				slidesOffsetAfter		: this.slidesoffsetafter,
				breakpoints				: this.breakpoints,
				watchSlidesVisibility	: true
			});

			this._swiper.on('onSlideChangeEnd', () => {
				this.$emit('change', this._swiper.realIndex);
			});
		},
		updated() {
			this._swiper.update(true);
		},
		methods : {
			slideTo(i, force = false, time = 300) {
				const isInView = this.$el.querySelector('.swiper-slide:nth-child('+ (i+1) +').swiper-slide-visible');

				if ( force || ! isInView )
					this._swiper.slideTo(i, time);
			}
		},
		watch : {
			index(val, oldVal) {
				if ( val !== oldVal )
					this.slideTo(val);
			}
		}
	},
	Slide : {
		template : `<div class="swiper-slide"><slot></slot></div>`,
	}
};
});
