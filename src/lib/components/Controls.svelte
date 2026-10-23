<!-- The site's few controls. Interests and hobbies, the one labelled thing, sits alone at the bottom of
     the island and opens a row of bubbles above it. Flip and day/night are bare icons in the top-right
     corner, left for the curious to find out what they do. -->
<script lang="ts">
	import type { Interest, StationSummary } from '../content/types';
	import type { SideId } from '../scene/sides';
	import { sideNames } from '../content/side-names';
	import type { IslandView } from './island-view.svelte';
	import MusicPlayer from './MusicPlayer.svelte';

	let {
		view,
		interests,
		stations,
		active,
		open = $bindable(),
		height = $bindable(0),
		hint,
		onchoose,
		onflip
	}: {
		view: IslandView;
		interests: Interest[];
		stations: StationSummary[];
		/** Interests lit up: the chosen one, or the open station's. */
		active: string[];
		open: boolean;
		/** The controls' height, for the layout to keep the hero clear of them on phones. */
		height?: number;
		/** First visit: say what's clickable. */
		hint: boolean;
		onchoose: (interest: Interest) => void;
		onflip: () => void;
	} = $props();

	const sideOf = (interest: Interest) => stations.find((s) => s.station === interest.stations[0])?.side;

	/** Interests and hobbies beckons until it has been opened once. */
	let opened = $state(false);
	$effect(() => {
		if (open) opened = true;
	});

	/** Bubbles grouped by the side their (first) station is on, forge first. */
	const groups = $derived(
		(['forge', 'war'] as const)
			.map((side) => ({ side, items: interests.filter((i) => sideOf(i) === side) }))
			.filter((g) => g.items.length)
	);
</script>

<div class="controls" bind:clientHeight={height}>
	{#if open}
		<div class="bubbles" id="interest-list" role="group" aria-label="Interests and hobbies">
			{#each groups as group (group.side)}
				{@const here = group.side === view.side}
				<section class="group" class:here aria-labelledby="group-{group.side}">
					<h2 id="group-{group.side}">
						{#if here}<span class="dot" aria-hidden="true"></span>{:else}
							<svg class="away" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" />
							</svg>
						{/if}
						{sideNames[group.side]}<span class="sr">{here ? ' (you are here)' : ' (flips the island)'}</span>
					</h2>
					<ul>
						{#each group.items as interest (interest.id)}
							<li style:--i={interests.indexOf(interest)}>
								<button
									class:active={active.includes(interest.id)}
									aria-pressed={active.includes(interest.id)}
									onclick={() => onchoose(interest)}
								>
									{interest.label}
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}

	{#if hint}
		<p class="hint" role="status">Click anything that glows.</p>
	{/if}

	<div class="bar">
		<button
			class="pill primary"
			class:beckon={!opened}
			aria-expanded={open}
			aria-controls="interest-list"
			onclick={() => (open = !open)}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3l2.2 5.6L20 9.3l-4.5 3.8L17 19l-5-3.1L7 19l1.5-5.9L4 9.3l5.8-.7z" />
			</svg>
			<span>Interests and hobbies</span>
			<svg class="caret" class:up={open} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
		</button>
	</div>
</div>

<div class="world">
	<MusicPlayer {view} />
	{#if view.canFlip}
		<button
			class="pill round"
			onclick={onflip}
			disabled={view.flipping}
			aria-label={view.side === 'forge' ? `Flip to the ${sideNames.war}` : `Back to ${sideNames.forge}`}
			aria-keyshortcuts="F"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2" />
				<path d="M20 4v4h-4M4 20v-4h4" />
			</svg>
		</button>
	{/if}
	<button class="pill round" onclick={() => view.toggleNight()} aria-label={view.night ? 'Switch to day' : 'Switch to night'}>
		{#if view.night}
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<circle cx="12" cy="12" r="4" />
				<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
		{/if}
	</button>
</div>

<style>
	.controls {
		position: absolute;
		left: 16px;
		right: 16px;
		bottom: 16px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		z-index: 2;
		pointer-events: none;
		font: 13px/1 var(--font-ui);
	}
	.controls > * {
		pointer-events: auto;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--chip);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
		box-shadow: 0 4px 14px rgba(40, 25, 10, 0.12);
		backdrop-filter: blur(6px);
		animation: appear 0.5s ease-out;
	}
	.pill:hover:not(:disabled) {
		background: var(--chip-hover);
	}
	/* Interests and hobbies: the one labelled control, and the way in. */
	.primary {
		min-height: 40px;
		padding: 0 18px 0 15px;
		border-color: color-mix(in srgb, var(--ember) 60%, transparent);
		background: color-mix(in srgb, var(--ember) 12%, var(--chip));
		font-size: 14px;
		font-weight: 600;
		box-shadow:
			0 4px 18px color-mix(in srgb, var(--ember) 22%, transparent),
			0 4px 14px rgba(40, 25, 10, 0.1);
	}
	.primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--ember) 20%, var(--chip-hover));
	}
	.primary svg:first-child {
		color: var(--ember-ink);
	}
	/* Until it's first opened, a slow ember ring breathes out from it. */
	.primary.beckon {
		animation:
			appear 0.5s ease-out,
			beckon 2.6s ease-out 1.5s infinite;
	}
	@keyframes beckon {
		0% {
			box-shadow:
				0 0 0 0 color-mix(in srgb, var(--ember) 45%, transparent),
				0 4px 14px rgba(40, 25, 10, 0.1);
		}
		70%,
		100% {
			box-shadow:
				0 0 0 12px transparent,
				0 4px 14px rgba(40, 25, 10, 0.1);
		}
	}
	/* Interests and hobbies, while its bubbles are out. */
	.pill[aria-expanded='true'],
	.pill[aria-expanded='true']:hover:not(:disabled) {
		border-color: var(--ember);
		background: color-mix(in srgb, var(--ember) 20%, var(--chip));
	}
	.pill[aria-expanded='true'] svg:first-child {
		fill: var(--ember);
		stroke: var(--ember-ink);
	}
	.pill:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.round {
		width: 38px;
		min-height: 38px;
		padding: 0;
		justify-content: center;
	}

	/* Flip and day/night: bare icons in the island's top-right corner. */
	.world {
		position: absolute;
		top: 18px;
		right: 28px;
		z-index: 2;
		display: flex;
		gap: 8px;
		font: 13px/1 var(--font-ui);
	}
	svg {
		width: 16px;
		height: 16px;
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.caret {
		width: 12px;
		height: 12px;
		opacity: 0.6;
		transform: rotate(180deg);
		transition: transform 0.2s;
	}
	.caret.up {
		transform: none;
	}
	.bubbles {
		display: flex;
		align-items: flex-end;
		gap: 14px;
		max-width: min(820px, 100%);
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.group + .group {
		padding-left: 14px;
		border-left: 1px solid var(--line);
	}
	/* The forge has most bubbles: give it the room to wrap into rows. */
	.group:first-child {
		flex: 1 1 auto;
	}
	.group:last-child {
		flex: 0 1 auto;
	}
	.group h2 {
		display: flex;
		align-items: center;
		gap: 6px;
		width: fit-content;
		margin: 0;
		padding: 4px 9px;
		border-radius: 999px;
		background: var(--chip);
		backdrop-filter: blur(6px);
		font: 600 10px/1.2 var(--font-ui);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.group.here h2 {
		color: var(--ember-ink);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ember);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ember) 25%, transparent);
	}
	.group ul {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* The other side's bubbles recede a little until pointed at. */
	.group:not(.here) button:not(.active, :hover, :focus-visible) {
		opacity: 0.72;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.bubbles li {
		animation: appear 0.3s ease-out backwards;
		animation-delay: calc(var(--i) * 25ms);
	}
	.bubbles button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--chip);
		color: var(--ink);
		font: inherit;
		white-space: nowrap;
		cursor: pointer;
		backdrop-filter: blur(6px);
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.bubbles button:hover {
		background: var(--chip-hover);
	}
	.bubbles button.active {
		border-color: var(--ember);
		background: color-mix(in srgb, var(--ember) 22%, var(--chip));
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--ember) 35%, transparent);
	}
	.away {
		width: 11px;
		height: 11px;
	}

	.hint {
		margin: 0;
		padding: 7px 12px;
		border-radius: 999px;
		background: var(--chip);
		color: var(--muted);
		backdrop-filter: blur(6px);
		animation: appear 0.6s ease-out;
	}

	@keyframes appear {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@media (max-width: 760px) {
		/* Above the content sheet while it's up (--sheet is its height, set by the layout). */
		.controls {
			left: 12px;
			right: 12px;
			bottom: calc(var(--sheet, 0px) + 12px);
			transition: bottom 0.35s ease-out;
		}
		/* One scrolling row on phones, so the bubbles don't cover the island. */
		.bubbles {
			overflow-x: auto;
			max-width: 100%;
			scrollbar-width: none;
		}
		.group,
		.group:first-child,
		.group:last-child {
			flex: none;
		}
		.group ul {
			flex-wrap: nowrap;
		}
		.world {
			top: 14px;
			right: 14px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.controls {
			transition: none;
		}
		.pill,
		.primary.beckon,
		.bubbles li,
		.hint {
			animation: none;
		}
	}
</style>
