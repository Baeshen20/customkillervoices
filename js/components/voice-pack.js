define([
	'libs/draggable'
], function(
	Draggable
) {

'use strict';

const voicePack = {
	template :
`<div
	class="voice"
	:id="'voice-pack-'+ vp.id"
	:class="[
		{
			playing		: vp.playing,
			selected	: vp.selected,
			installed	: vp.installed,
			installing	: vp.installing,
			error		: vp.error,
			inactive	: inactive
		},
		(vp.error) ? 'error-'+ vp.error : null,
		vp.type,
		'acquired-'+ vp.acquiredBy
	]"
	@click="outerClick"
	v-draggable-item="{
		group	: 'voicepack',
		data	: vp.id,
	}"
>
	<button
		class="voice-main-action voice-get"
		v-if="! vp.installed && vp.acquiredBy === 'redeem'"
		@click.stop="opensite"
		@mousedown.stop
	>Get</button>
	<button
		class="voice-main-action voice-install"
		v-else-if="! vp.installed"
		@click.stop="centerClick"
		@mousedown.stop
	>
		<svg class="svg-icon-stroke">
			<use xlink:href="img/sprite.svg#download-large" />
		</svg>
	</button>
	<button
		class="voice-main-action voice-play"
		v-else-if="! inactive"
		@click.stop="centerClick"
	>
		<svg class="svg-icon-fill">
			<use xlink:href="img/sprite.svg#voice-play-icon" />
		</svg>
	</button>

	<div
		v-if="vp.vpImages"
		class="voice-image multiple"
	>
		<img
			v-for="id in vp.vpImages"
			:src="'img/voice-packs/'+ id +'.webp'"
			:style="{ width : (100 / vp.vpImages.length) +'%'}"
		/>
	</div>
	<img
		v-else
		class="voice-image single"
		:src="'img/voice-packs/'+ vp.id +'.webp'"
	/>

	<footer class="voice-footer" @click.stop>
		<div class="voice-title" @click="outerClick">{{vp.title}}</div>

		<div
			class="voice-footer-actions"
			v-if="vp.acquiredBy === 'redeem' && ! vp.installed"
		>
			<button
				class="btn"
				@click="opensite"
			>Get</button>
		</div>
		<div
			class="voice-footer-actions"
			v-else-if="confirmRemove"
		>
			<button
				class="btn btn-text"
				@click="confirmRemove = false"
			>Cancel</button>
			<button
				class="btn"
				@click="remove"
			>Delete</button>
		</div>
		<div
			class="voice-footer-actions"
			v-else-if="vp.type !== 'general'"
		>
			<i
				class="voice-footer-icon playing-indicator"
				v-if="vp.playing"
			>
				<span class="playing-bar"></span>
				<span class="playing-bar"></span>
				<span class="playing-bar"></span>
			</i>
			<button
				class="voice-footer-icon voice-footer-icon-edit"
				@click="edit"
			>
				<svg class="svg-icon-fill">
					<use xlink:href="img/sprite.svg#edit-text" />
				</svg>
			</button>
			<button
				class="voice-footer-icon voice-footer-icon-remove"
				@click="confirmRemove = true"
			>
				<svg class="svg-icon-fill trash-body">
					<use xlink:href="img/sprite.svg#trash-body" />
				</svg>
				<svg class="svg-icon-fill trash-lid">
					<use xlink:href="img/sprite.svg#trash-lid" />
				</svg>
			</button>
		</div>
		<div
			class="voice-footer-actions"
			v-else
		>
			<i
				class="voice-footer-icon playing-indicator"
				v-if="vp.playing"
			>
				<span class="playing-bar"></span>
				<span class="playing-bar"></span>
				<span class="playing-bar"></span>
			</i>
			<button
				class="voice-footer-icon voice-footer-icon-download"
				v-else-if="! vp.installed"
				@click="centerClick"
			>
				<svg class="svg-icon-fill">
					<use xlink:href="img/sprite.svg#download" />
				</svg>
			</button>
		</div>
	</footer>
</div>`,

	props : {
		vp			: Object,
		draggable	: Boolean,
		inactive	: Boolean
	},

	data() {
		return {
			_draggableInst : null,
			confirmRemove : false
		}
	},

	methods : {
		outerClick() {
			if ( this.vp.selected )
				return;

			let event;

			if ( this.vp.installed ) {
				event = 'select';
			} else {
				if ( this.vp.acquiredBy === 'redeem' )
					event = 'opensite';
				else
					event = 'preview';
			}

			this.$emit(event, this.vp.id);
		},
		centerClick() {
			let event;

			if ( ! this.vp.installed && this.vp.acquiredBy === 'redeem' )
				event = 'opensite';
			else
				event = 'preview';

			this.$emit(event, this.vp.id);
		},
		opensite() {
			this.$emit('opensite', this.vp.id);
		},
		edit() {
			this.$emit('edit', this.vp);
		},
		remove() {
			this.$emit('remove', this.vp.id);
		}
	},

	directives : {
		'draggable-item' : {
			bind(el, binding, vnode) {
				const
					ctx		= vnode.context,
					opts	= binding.value;

				if ( ctx._draggableInst ) {
					ctx._draggableInst.unbind();
					ctx._draggableInst = null;
				}

				if ( ctx.draggable )
					ctx._draggableInst = new Draggable(el, opts.group, opts.data);
			},
			update(el, binding, vnode) {
				const
					ctx		= vnode.context,
					opts	= binding.value;

				if ( ctx.draggable ) {
					if ( ctx._draggableInst )
						ctx._draggableInst.setData(opts.data);
					else
						ctx._draggableInst = new Draggable(el, opts.group, opts.data);
				} else if ( ctx._draggableInst ) {
					ctx._draggableInst.unbind();
					ctx._draggableInst = null;
				}
			},
			unbind(el, binding, vnode) {
				const ctx = vnode.context;

				if ( ctx._draggableInst ) {
					ctx._draggableInst.unbind();
					ctx._draggableInst = null;
				}
			}
		}
	}
};

return voicePack;
});
