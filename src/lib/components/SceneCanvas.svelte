<!-- The island: canvas, loading cue, and whatever floats over it (pins, notes, controls). -->
<script lang="ts">
	import { onMount, type Component, type Snippet } from 'svelte';
	import type { Pick, SecretTarget } from '../scene/interaction';
	import type { SideId } from '../scene/sides';
	import type { World } from '../scene/world';
	import type { IslandView } from './island-view.svelte';

	let {
		view,
		start,
		secrets,
		war = true,
		quiet = false,
		onpick,
		children
	}: {
		view: IslandView;
		/** The side to show first (a deep link to the war side starts there). */
		start: SideId;
		secrets: SecretTarget[];
		/** The War Forge has been found, so the island's description may name it. */
		war?: boolean;
		/** The home page's front door shows the loading progress itself. */
		quiet?: boolean;
		onpick: (pick: Pick | null) => void;
		children?: Snippet;
	} = $props();

	let canvas: HTMLCanvasElement;
	/** The dev placement tool; only ever loaded under `vite dev`. */
	let DevEditor = $state.raw<Component<{ world: World }>>();

	onMount(() => {
		const stop = view.mount(canvas, { start, secrets, onPick: (pick) => onpick(pick) });
		if (import.meta.env.DEV) {
			import('../dev/DevEditor.svelte').then((m) => (DevEditor = m.default));
		}
		return stop;
	});
</script>

<div class="stage">
	<canvas bind:this={canvas} class:shown={view.shown} aria-hidden="true"></canvas>
	<p class="sr">
		A floating island: June's Forge{#if war} on one side, the War Forge on the other{/if}. Skills and Interests,
		below, lead to each of its stations.
	</p>

	{#if view.failed}
		<div class="loading" role="status">
			<span>The island couldn't load on this device.</span>
			<a href="/simplified">Simplified version →</a>
		</div>
	{:else if !view.shown && !quiet}
		<div class="loading" role="status">
			<span>{start === 'war' ? 'To the empire of the sun…' : 'Down we go the rabbit hole…'}</span>
			<span class="bar" class:waiting={view.progress === 0}>
				<span style:transform="scaleX({view.progress})"></span>
			</span>
		</div>
	{/if}

	{@render children?.()}
</div>

{#if DevEditor && view.world}
	<DevEditor world={view.world} />
{/if}

<style>
	.stage {
		position: relative;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	canvas {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: opacity 0.9s ease-out;
		/* Things cut off by the column's edge fade out instead of ending in a hard line. */
		mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
		touch-action: none;
	}
	canvas.shown {
		opacity: 1;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.loading {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		font: 13px/1.2 var(--font-ui);
		color: var(--muted);
		letter-spacing: 0.02em;
	}
	.loading a {
		color: var(--ember-ink);
	}
	.bar {
		position: relative;
		width: 140px;
		height: 3px;
		border-radius: 3px;
		background: var(--line);
		overflow: hidden;
	}
	.bar > span {
		position: absolute;
		inset: 0;
		background: var(--ember);
		transform-origin: left;
		transition: transform 0.3s ease-out;
	}
	.bar.waiting > span {
		width: 30%;
		transform: none !important;
		animation: wait 1.2s ease-in-out infinite;
	}
	@keyframes wait {
		from {
			left: -30%;
		}
		to {
			left: 100%;
		}
	}

	@media (max-width: 760px) {
		canvas {
			mask-image: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		canvas {
			transition: none;
		}
		.bar.waiting > span {
			animation: none;
			left: 35%;
		}
	}
</style>
