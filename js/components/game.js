define({
	template :
`<article
	class="game"
	:class="{
		'selected' : selected,
		'disabled' : game.disabled
	}"
	@click="selectGame"
>
	<div class="game-avatar">
		<img class="game-image" :src="'img/games/'+ game.name +'.png'">
	</div>
	<div class="game-info">
		<p class="game-title">{{ game.short }}</p>
		<p class="game-subtitle" v-if="game.disabled">Coming soon</p>
		<p class="game-subtitle" v-else-if="game.voicePack">{{ game.voicePack }}</p>
	</div>
	<button class="game-carousel-volume" v-if="game.voiceDisabled" @click.stop="voiceClick">
		<svg class="svg-icon-stroke">
			<use xlink:href="img/sprite.svg#volume-mute" />
		</svg>
	</button>
</article>`,

	props : {
		game : Object,
		selected : Boolean
	},

	methods : {
		selectGame() {
			if ( ! this.game.disabled )
				this.$emit('select', this.game);
		},
		voiceClick() {
			this.$emit('voiceclick', this.game);
		}
	},
});
