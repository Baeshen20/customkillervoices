define({
	template : `<div
		@input="update"
		@keypress.enter.prevent="blur"
		@focus="onfocus"
		@blur="onblur"
		contenteditable="true"
	></div>`,
	props : {
		content : String
	},
	data() {
		return {
			inFocus : false
		};
	},
	mounted() {
		this.$el.innerText = this.content;
	},
	updated() {
		if ( this.content !== this.$el.innerText )
			this.$el.innerText = this.content;
	},
	methods : {
		onfocus() {
			this.inFocus = true;
			this.select();
		},
		onblur() {
			this.inFocus = false;
			this.deselect();

			const trimmed = this.$el.innerText.trim();

			if ( trimmed && trimmed.length > 0 ) {
				this.content = trimmed;

				if ( trimmed !== this.$el.innerText )
					this.$el.innerText = trimmed;

				this.$emit('update', trimmed);
			} else {
				this.$el.innerText = this.content;
				this.$emit('update', this.content);
			}
		},
		focus() {
			this.$el.focus();
		},
		blur() {
			this.$el.blur();
		},
		select() {
			window.getSelection().selectAllChildren(this.$el);
		},
		deselect() {
			window.getSelection().removeAllRanges();
		},
		update() {
			// this.$emit('update', this.$el.innerText);
		},
	},
	watch : {
		content(val) {
			if ( this.$el.innerText !== val )
				this.$el.innerText = val;
		}
	}
});
