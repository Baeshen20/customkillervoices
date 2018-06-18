define([
	'libs/drop-target'
], function(
	DropTarget
) {

'use strict';

const voicePack = {
	template :
`<div class="playlist-item">
	<div class="playlist-item-header" v-if="title">{{title}}</div>

	<div
		class="playlist-item-image"
		v-if="vp"
		:style="{'background-image': 'url(img/voice-packs/'+ vp.id +'.webp)'}"
		v-drop-target="{ group : 'voicepack' }"
		@mousedown.stop
	>
		<button
			class="voice-play"
			@click.stop="preview"
		>
			<svg class="svg-icon-fill">
				<use xlink:href="img/sprite.svg#voice-play-icon" />
			</svg>
		</button>
		<button
			class="voice-delete"
			@click.stop="clear"
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
		class="playlist-item-main-empty"
		v-else
		v-drop-target="{ group : 'voicepack' }"
	>
		<svg class="svg-icon-stroke dashed-border">
			<use xlink:href="img/sprite.svg#dashed-border" />
		</svg>

		<svg class="svg-icon-fill big-plus">
			<use xlink:href="img/sprite.svg#big-add+" />
		</svg>
	</div>

	<div class="playlist-item-footer" v-if="vp">{{vp.shortTitle || vp.title}}</div>
</div>`,

	props : [
		'id',
		'event',
		'vp',
		'title'
	],

	data() {
		return {
			_dropTargetInst : null
		};
	},

	methods : {
		preview() {
			this.$emit('preview', this.vp.id, this.event || null);
		},
		dropped(vpId) {
			this.$emit('dropped', this.id, vpId);
		},
		clear() {
			this.$emit('clear', this.id);
		}
	},

	directives : {
		'drop-target' : {
			bind(el, binding, vnode) {
				const
					ctx		= vnode.context,
					opts	= binding.value;

				if ( ctx.vp && ctx._dropTargetInst ) {
					ctx._dropTargetInst.unbind();
					ctx._dropTargetInst = null;
				}

				ctx._dropTargetInst = new DropTarget(el, ctx.id, opts.group);
				ctx._dropTargetInst.onDrop(vpId => ctx.dropped(vpId));
			},
			update(el, binding, vnode) {
				const
					ctx		= vnode.context,
					opts	= binding.value;

				if ( ! ctx._dropTargetInst ) {
					ctx._dropTargetInst = new DropTarget(el, ctx.id, opts.group);
					ctx._dropTargetInst.onDrop(vpId => ctx.dropped(vpId));
				}
			},
			unbind(el, binding, vnode) {
				const ctx = vnode.context;

				if ( ctx.vp && ctx._dropTargetInst ) {
					ctx._dropTargetInst.unbind();
					ctx._dropTargetInst = null;
				}
			}
		}
	}
};

return voicePack;
});
