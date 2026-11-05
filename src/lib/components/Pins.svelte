<!-- Pixel-art arrows bouncing over each station on the side that's up. Decorative: the stations
     themselves and the interest bubbles are what visitors click. -->
<script lang="ts">
	import type { Box3 } from 'three';
	import type { StationId } from '../scene/config';
	import type { IslandView } from './island-view.svelte';

	/** The camera must hold still this long before the pins come back. */
	const SETTLE_MS = 350;
	/** The arrows' colours, in turn: blue, yellow, pink. */
	const COLORS = ['#3fb8ff', '#ffd23f', '#ff6fb5'];
	/** Room an arrow needs above its station; with less (the station near the top edge), it points in from the left. */
	const TOP_ROOM = 44;

	let { view, show, lit }: { view: IslandView; show: boolean; lit: StationId[] } = $props();

	// Re-read after each flip: the stations are the side's.
	const ids = $derived(view.side && view.interaction ? view.interaction.stations() : []);
	const pins = $state<Partial<Record<StationId, HTMLElement>>>({});
	/** Pins hide while the camera moves (drag, zoom, eases) and return once it rests, so they never trail the scene. */
	let settled = $state(false);
	const visible = $derived(show && settled && !view.flipping);

	/** A station's left edge on screen, halfway down its height: where a sideways arrow points. */
	function leftEdge(box: Box3) {
		const outline = view.interaction?.screenBox(box);
		return outline && { x: outline.left, y: (outline.top + outline.bottom) / 2 };
	}

	const lastPosition = { x: 0, y: 0, z: 0 };
	let lastZoom = 0;
	let stillSince = 0;

	$effect(() =>
		view.onFrame(() => {
			const camera = view.handles?.rig.camera;
			if (!camera || !view.interaction) return;
			const now = performance.now();
			const { x, y, z } = camera.position;
			const moved = (x - lastPosition.x) ** 2 + (y - lastPosition.y) ** 2 + (z - lastPosition.z) ** 2;
			if (moved > 1e-6 || Math.abs(camera.zoom - lastZoom) > 1e-4) {
				Object.assign(lastPosition, { x, y, z });
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
				if (!at) continue;
				const side = at.y < TOP_ROOM;
				const box = side ? view.interaction.stationBox(id) : null;
				const edge = box && leftEdge(box);
				const to = edge ?? at;
				pin.style.transform = `translate(${to.x}px, ${to.y}px)`;
				pin.classList.toggle('side', side);
			}
		})
	);
</script>

<div class="pins" class:visible class:some={lit.length > 0} aria-hidden="true">
	{#each ids as id, i (id)}
		<span class="pin" class:lit={lit.includes(id)} style:--i={i} style:--c={COLORS[i % COLORS.length]} bind:this={pins[id]}>
			<span>
				<!-- A down arrow on a 7×7 pixel grid, with a lit left edge. -->
				<svg viewBox="0 0 7 7" shape-rendering="crispEdges">
					<path d="M2 0H5V3H7V4H6V5H5V6H4V7H3V6H2V5H1V4H0V3H2Z" />
					<path class="shine" d="M2 0H3V3H2ZM1 3H2V4H1Z" />
				</svg>
			</span>
		</span>
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
		left: -10.5px;
		top: -32px;
		width: 21px;
		height: 21px;
		opacity: 0;
		transform: translateY(6px) scale(0.6);
		/* Out quickly when the camera starts moving... */
		transition:
			opacity 0.12s linear,
			transform 0.12s linear;
	}
	.pin svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
		fill: var(--c);
		/* A dark pixel outline and a hard shadow, so they read on grass, rock and sky, day or night. */
		filter: drop-shadow(2px 0 0 #1d1424) drop-shadow(-2px 0 0 #1d1424) drop-shadow(0 2px 0 #1d1424)
			drop-shadow(0 -2px 0 #1d1424) drop-shadow(0 3px 0 rgba(0, 0, 0, 0.25));
	}
	/* Near the top edge: to the left of the station, pointing right. */
	.pin:global(.side) > span {
		left: -30px;
		top: -10.5px;
	}
	.pin:global(.side) svg path {
		transform: rotate(-90deg);
		transform-origin: 3.5px 3.5px;
	}
	.pin .shine {
		fill: #fff;
		opacity: 0.45;
	}
	.visible .pin > span {
		opacity: 1;
		transform: none;
		/* ...and back in gently, one after another, once it rests. */
		transition:
			opacity 0.4s ease-out,
			transform 0.4s ease-out;
		transition-delay: calc(var(--i) * 60ms);
	}
	.visible .pin svg {
		animation: bounce 0.9s ease-in-out infinite;
		animation-delay: calc(var(--i) * 90ms);
	}
	.visible .pin:global(.side) svg {
		animation-name: nudge;
	}
	/* With something open, its stations' arrows stand out and the rest step back. */
	.visible.some .pin > span {
		opacity: 0.4;
	}
	.visible.some .pin.lit > span {
		opacity: 1;
		transform: scale(1.15);
	}
	@keyframes bounce {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -5px;
		}
	}
	@keyframes nudge {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: -5px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pin > span,
		.visible .pin > span {
			transform: none;
			transition: opacity 0.2s linear;
			transition-delay: 0s;
		}
		.visible .pin svg {
			animation: none;
		}
	}
</style>
