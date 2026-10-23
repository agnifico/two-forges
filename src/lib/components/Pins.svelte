<!-- Small dots above each station on the side that's up. Decorative: the stations themselves and the
     interest bubbles are what visitors click. -->
<script lang="ts">
	import { Vector3 } from 'three';
	import type { StationId } from '../scene/config';
	import type { IslandView } from './island-view.svelte';

	/** The camera must hold still this long before the pins come back. */
	const SETTLE_MS = 350;

	let { view, show, lit }: { view: IslandView; show: boolean; lit: StationId[] } = $props();

	// Re-read after each flip: the stations are the side's.
	const ids = $derived(view.side && view.interaction ? view.interaction.stations() : []);
	const pins = $state<Partial<Record<StationId, HTMLElement>>>({});
	/** Pins hide while the camera moves (drag, zoom, eases) and return once it rests, so they never trail the scene. */
	let settled = $state(false);
	const visible = $derived(show && settled && !view.flipping);

	const lastPosition = new Vector3();
	let lastZoom = 0;
	let stillSince = 0;

	$effect(() =>
		view.onFrame(() => {
			const camera = view.handles?.rig.camera;
			if (!camera || !view.interaction) return;
			const now = performance.now();
			if (camera.position.distanceToSquared(lastPosition) > 1e-6 || Math.abs(camera.zoom - lastZoom) > 1e-4) {
				lastPosition.copy(camera.position);
				lastZoom = camera.zoom;
				stillSince = now;
				if (settled) settled = false;
				return;
			}
			if (!settled && now - stillSince < SETTLE_MS) return;
			settled = true;
			if (!show) return;
			for (const id of ids) {
				const pin = pins[id];
				const top = view.interaction.stationTop(id);
				const at = top && view.interaction.toScreen(top);
				if (!pin) continue;
				pin.style.visibility = at ? '' : 'hidden';
				if (at) pin.style.transform = `translate(${at.x}px, ${at.y}px)`;
			}
		})
	);
</script>

<div class="pins" class:visible aria-hidden="true">
	{#each ids as id, i (id)}
		<span class="pin" class:lit={lit.includes(id)} style:--i={i} bind:this={pins[id]}><span></span></span>
	{/each}
</div>

<style>
	.pins {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.pin {
		position: absolute;
		left: 0;
		top: 0;
		width: 0;
		height: 0;
	}
	.pin > span {
		position: absolute;
		left: -5px;
		top: -22px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--ember);
		box-shadow:
			0 0 0 3px color-mix(in srgb, var(--ember) 30%, transparent),
			0 2px 6px rgba(0, 0, 0, 0.25);
		opacity: 0;
		transform: translateY(6px) scale(0.6);
		/* Out quickly when the camera starts moving... */
		transition:
			opacity 0.12s linear,
			transform 0.12s linear;
	}
	.visible .pin > span {
		opacity: 0.9;
		transform: none;
		/* ...and back in gently, one after another, once it rests. */
		transition:
			opacity 0.4s ease-out,
			transform 0.4s ease-out;
		transition-delay: calc(var(--i) * 60ms);
	}
	.visible .pin.lit > span {
		opacity: 1;
		background: #fff3df;
		box-shadow:
			0 0 0 3px var(--ember),
			0 2px 8px rgba(0, 0, 0, 0.3);
	}
	@media (prefers-reduced-motion: reduce) {
		.pin > span,
		.visible .pin > span {
			transform: none;
			transition: opacity 0.2s linear;
			transition-delay: 0s;
		}
	}
</style>
