<!-- A small music player beside the island's corner icons: sound on or off, the tune's number on a
     little segment display with arrows either side (or the ← and → keys), and the volume. Which tune
     plays follows the visitor:
     - Rain in the Solar City (1) by default, day or night, on either side by day;
     - Anklet of Stars (2) when the visitor turns the forge to night themselves, a reward for the curious;
     - Crown of the Silent Fortress (3) on the war side at night, which is how it's seen after a flip.
     A tune picked with the arrows plays until the scene next changes. -->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { IslandView } from './island-view.svelte';
	import { music, tunes } from './music.svelte';

	let { view }: { view: IslandView } = $props();

	const rule = $derived(view.heading === 'war' ? (view.night ? 2 : 0) : view.night && view.nightChosen ? 1 : 0);
	// Only the scene's changes cue a tune; a pick with the arrows stands until then.
	$effect(() => {
		const tune = rule;
		untrack(() => music.cue(tune));
	});

	/** Seven-segment bars (a to g: top, top right, bottom right, bottom, bottom left, top left, middle). */
	const bars = [
		'M3 1h6l-1 2H4z',
		'M10 2v6.5l-1.6 1-.4-.5V3.4z',
		'M10 11.5V18l-2 -1.4V11l.4-.5z',
		'M3 19h6l-1-2H4z',
		'M2 11.5V18l2-1.4V11l-.4-.5z',
		'M2 2v6.5l1.6 1 .4-.5V3.4z',
		'M3.2 10l.9-.9h3.8l.9.9-.9.9H4.1z'
	];
	const lit: Record<number, string> = { 1: 'bc', 2: 'abdeg', 3: 'abcdg' };
	const segments = $derived([...'abcdefg'].map((s, i) => ({ d: bars[i], on: (lit[music.index + 1] ?? '').includes(s) })));

	const onKey = (e: KeyboardEvent) => {
		if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
		if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
		if (e.key === 'ArrowLeft') music.step(-1);
		else if (e.key === 'ArrowRight') music.step(1);
	};
</script>

<svelte:window onkeydown={onKey} />

<div class="player" class:off={!music.on} role="group" aria-label="Music">
	<button class="icon" onclick={() => music.toggle()} aria-pressed={music.on} aria-label={music.on ? 'Music off' : 'Music on'}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
			{#if music.on}
				<path class="wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
			{:else}
				<path class="wave" d="M16 9.5l5 5M21 9.5l-5 5" />
			{/if}
		</svg>
	</button>
	<button class="icon small" onclick={() => music.step(-1)} aria-label="Previous tune" aria-keyshortcuts="ArrowLeft">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7l-5 5 5 5" /></svg>
	</button>
	<span class="display" role="status" aria-label="Tune {music.index + 1} of {tunes.length}">
		<svg viewBox="0 0 12 20" aria-hidden="true">
			{#each segments as segment, i (i)}<path d={segment.d} class:on={segment.on} />{/each}
		</svg>
	</span>
	<button class="icon small" onclick={() => music.step(1)} aria-label="Next tune" aria-keyshortcuts="ArrowRight">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7l5 5-5 5" /></svg>
	</button>
	<input
		class="volume"
		type="range"
		min="0"
		max="1"
		step="0.05"
		value={music.volume}
		oninput={(e) => music.setVolume(Number(e.currentTarget.value))}
		aria-label="Volume"
	/>
</div>

<style>
	.player {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		height: 38px;
		padding: 0 10px 0 4px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--chip);
		color: var(--ink);
		box-shadow: 0 4px 14px rgba(40, 25, 10, 0.12);
		backdrop-filter: blur(6px);
		animation: appear 0.5s ease-out;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: none;
		color: inherit;
		cursor: pointer;
	}
	.icon:hover {
		background: var(--chip-hover);
	}
	.icon.small {
		width: 22px;
	}
	.icon svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.icon:first-child svg path:first-child {
		fill: currentColor;
	}
	.icon.small svg {
		width: 16px;
		height: 16px;
	}

	/* The tune's number, lit like an old digital readout; unlit segments show faintly. */
	.display {
		display: grid;
		place-items: center;
		width: 22px;
		height: 26px;
		border-radius: 5px;
		background: #2a1f1a;
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
	}
	.display svg {
		width: 11px;
		height: 18px;
	}
	.display path {
		fill: #ff9a3c;
		opacity: 0.12;
		transition: opacity 0.2s;
	}
	.display path.on {
		opacity: 1;
		filter: drop-shadow(0 0 2px #ff9a3caa);
	}
	.off .display path.on {
		opacity: 0.35;
		filter: none;
	}
	.off .wave {
		opacity: 0.7;
	}

	/* A slim track with a small ember thumb. */
	.volume {
		width: 54px;
		height: 14px;
		margin: 0 0 0 6px;
		background: none;
		cursor: pointer;
		appearance: none;
	}
	.volume::-webkit-slider-runnable-track {
		height: 3px;
		border-radius: 3px;
		background: var(--line);
	}
	.volume::-moz-range-track {
		height: 3px;
		border-radius: 3px;
		background: var(--line);
	}
	.volume::-webkit-slider-thumb {
		width: 11px;
		height: 11px;
		margin-top: -4px;
		border: 0;
		border-radius: 50%;
		background: var(--ember);
		appearance: none;
	}
	.volume::-moz-range-thumb {
		width: 11px;
		height: 11px;
		border: 0;
		border-radius: 50%;
		background: var(--ember);
	}
	.off .volume {
		opacity: 0.45;
	}
	@media (max-width: 720px) {
		.volume {
			display: none;
		}
		.player {
			padding-right: 4px;
		}
	}
</style>
