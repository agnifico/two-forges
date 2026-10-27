<!-- The invitation to explore: a speech bubble rising from the cottage into the sky, off to its right,
     its tail pointing back at the roof. It follows the cottage as the camera moves. The layout shows it
     at home and takes it away on the first click anywhere (this bubble included). -->
<script lang="ts">
	import { Vector3 } from 'three';
	import { onMount } from 'svelte';
	import type { IslandView } from './island-view.svelte';

	let { view, text, note }: { view: IslandView; text: string; note: string } = $props();

	/** Keeps the bubble inside the stage, this far from its edges. */
	const MARGIN = 12;
	/** Clear of the wordmark and the corner icons along the top. */
	const TOP_CLEAR = 64;
	/** How far the bubble's left edge tucks back over the cottage, as a share of its on-screen width. */
	const TUCK = 0.12;
	/** Where the bubble's foot sits, as a share of the way down the cottage from its top. */
	const FOOT = 0.32;

	let box: HTMLElement;
	let placed = $state(false);
	let touch = $state(false);
	const corner = new Vector3();

	onMount(() => {
		touch = matchMedia('(pointer: coarse)').matches;
		return view.onFrame(() => {
			const cottage = view.interaction?.stationBox('cottage');
			const stage = box.parentElement;
			if (!cottage || !stage || !view.interaction) return void (placed = false);
			// The cottage's outline on screen, from its box's eight corners.
			let left = Infinity;
			let right = -Infinity;
			let top = Infinity;
			let bottom = -Infinity;
			for (let i = 0; i < 8; i++) {
				corner.set(i & 1 ? cottage.max.x : cottage.min.x, i & 2 ? cottage.max.y : cottage.min.y, i & 4 ? cottage.max.z : cottage.min.z);
				const at = view.interaction.toScreen(corner);
				if (!at) return void (placed = false);
				left = Math.min(left, at.x);
				right = Math.max(right, at.x);
				top = Math.min(top, at.y);
				bottom = Math.max(bottom, at.y);
			}
			const x = Math.min(Math.max(right - (right - left) * TUCK, MARGIN), stage.clientWidth - box.offsetWidth - MARGIN);
			const y = Math.max(top + (bottom - top) * FOOT - box.offsetHeight, TOP_CLEAR);
			box.style.transform = `translate(${x}px, ${y}px)`;
			placed = true;
		});
	});
</script>

<div class="invite" class:placed bind:this={box}>
	<div class="bubble">
		<p class="text">{@html touch ? text.replace(/^Click\b/, 'Tap') : text}</p>
		{#if note}<p class="note">{@html note}</p>{/if}
		<svg class="tail" viewBox="0 0 40 30" aria-hidden="true"><path d="M8 0h26C26 8 14 20 0 30 6 20 9 10 8 0z" /></svg>
	</div>
</div>

<style>
	.invite {
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1;
		width: max-content;
		max-width: min(250px, calc(100% - 24px));
		visibility: hidden;
		cursor: pointer;
	}
	.invite.placed {
		visibility: visible;
	}
	/*
	 * A card tilted back into the sky, with a little thickness along its lower edge and a soft shadow on
	 * the air below it. It pops out of the roof, then bobs gently.
	 */
	.bubble {
		--edge: var(--bubble-edge);
		position: relative;
		padding: 12px 16px 11px;
		border-radius: 16px;
		background: var(--paper);
		color: var(--ink);
		transform: perspective(700px) rotateX(8deg) rotateY(-14deg);
		transform-origin: left bottom;
		box-shadow:
			0 4px 0 var(--edge),
			0 22px 34px rgba(30, 20, 10, 0.24);
		animation:
			pop 0.5s cubic-bezier(0.3, 1.5, 0.5, 1) 0.6s backwards,
			bob 4s ease-in-out 1.1s infinite;
	}
	.text {
		margin: 0;
		font: 600 16px/1.3 var(--font-display);
	}
	.note {
		margin: 4px 0 0;
		color: var(--muted);
		font: 13px/1.4 var(--font-text);
	}
	/* Down and back to the roof, from the bubble's lower-left corner. */
	.tail {
		position: absolute;
		left: 6px;
		top: calc(100% - 1px);
		width: 40px;
		height: 30px;
		fill: var(--paper);
		filter: drop-shadow(0 4px 0 var(--edge));
	}
	@keyframes pop {
		from {
			opacity: 0;
			scale: 0.4;
			translate: -24px 30px;
		}
	}
	@keyframes bob {
		50% {
			translate: 0 -5px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bubble {
			animation: none;
		}
	}
</style>
