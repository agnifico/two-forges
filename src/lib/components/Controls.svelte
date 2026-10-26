<!-- The site's few controls. Interests and hobbies, the one labelled thing, sits alone at the bottom of
     the island and opens a row of bubbles above it. The simplified version, flip (only where the War Forge
     is in play) and day/night are bare icons in the top-right corner, left for the curious to find out. On phones the corner folds into one round
     button: open, the music player fans out to its left and flip and day/night drop below it. It starts
     open with a note on the sound, and folds away when the note goes. -->
<script lang="ts">
	import type { Interest, StationSummary } from '../content/types';
	import type { SideId } from '../scene/sides';
	import { sideNames } from '../content/side-names';
	import type { IslandView } from './island-view.svelte';
	import { music } from './music.svelte';
	import MusicPlayer from './MusicPlayer.svelte';
	import { fade } from 'svelte/transition';

	/** Phones: how long the corner stays open, with its sound note, once the island appears. */
	const INTRO_MS = 5000;

	let {
		view,
		interests,
		stations,
		active,
		open = $bindable(),
		height = $bindable(0),
		cornerOpen = $bindable(true),
		found = 0,
		secrets = 0,
		compact = false,
		flippable = false,
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
		/** Phones: the corner is open (it starts open, for the intro). */
		cornerOpen?: boolean;
		/** Secrets found so far, and how many there are: counted beside the side tag once there's one. */
		found?: number;
		secrets?: number;
		/** Phones: the corner icons fold into one button. */
		compact?: boolean;
		/** The flip button shows (the War Forge is in play: /all, its stations, or its side up). */
		flippable?: boolean;
		onchoose: (interest: Interest) => void;
		onflip: () => void;
	} = $props();

	const sideOf = (interest: Interest) => stations.find((s) => s.station === interest.stations[0])?.side;

	/** Interests and hobbies beckons until it has been opened once. */
	let opened = $state(false);
	$effect(() => {
		if (open) opened = true;
	});

	/** Phones: the intro is on, showing the sound note; any use of the corner ends it early. */
	let intro = $state(true);
	let corner = $state<HTMLElement>();
	$effect(() => {
		if (!view.shown) return;
		const timer = setTimeout(() => {
			if (intro) cornerOpen = false;
			intro = false;
		}, INTRO_MS);
		return () => clearTimeout(timer);
	});
	/** Using the corner keeps it open past the intro; a touch anywhere else folds it away. */
	const onPointer = (e: PointerEvent) => {
		if (!compact || !corner) return;
		if (!corner.contains(e.target as Node)) cornerOpen = false;
		intro = false;
	};
	const folded = $derived(compact && !cornerOpen);

	/** One set of bubbles, the forge's first; the war side's (once it's known) follow as a bonus. */
	const bubbles = $derived(
		(['forge', 'war'] as const).flatMap((side) =>
			interests.filter((i) => sideOf(i) === side).map((interest) => ({ interest, side }))
		)
	);
</script>

<div class="controls" bind:clientHeight={height}>
	{#if open}
		<ul class="bubbles" id="interest-list" aria-label="Interests and hobbies">
			{#each bubbles as { interest, side }, i (interest.id)}
				<li style:--i={i}>
					<button
						class:active={active.includes(interest.id)}
						class:bonus={side === 'war'}
						aria-pressed={active.includes(interest.id)}
						onclick={() => onchoose(interest)}
					>
						{interest.label}{#if side !== view.side}<span class="sr">{' (flips the island)'}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
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
			<span>Skills and Interests</span>
			<svg class="caret" class:up={open} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
		</button>
		<!-- Where you are: the side that's up. -->
		<p class="where"><span class="dot" aria-hidden="true"></span><span class="sr">You are in</span> {sideNames[view.side]}</p>
		<!-- Secrets found: hidden until the first, then it pops again with each new one. -->
		{#if found}
			{#key found}
				<p class="where found" role="status">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></svg>
					{found} of {secrets} secrets found
				</p>
			{/key}
		{/if}
	</div>
</div>

<svelte:window onpointerdown={onPointer} />

<div class="world" class:compact class:folded bind:this={corner}>
	{#if compact}
		<!-- A plus that turns into a cross while the corner is open. -->
		<button
			class="pill round menu"
			aria-expanded={cornerOpen}
			aria-controls="corner-items"
			aria-label="Sound and view"
			onclick={() => (cornerOpen = !cornerOpen)}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
		</button>
	{/if}
	<div class="items" id="corner-items" inert={folded}>
		<MusicPlayer {view} />
		<div class="drop">
			<!-- The plain, one-page version of the site. -->
			<a class="pill round" href="/simplified" aria-label="Simplified version" title="Simplified version">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<rect x="4" y="4" width="7" height="9" rx="1.5" /><rect x="13" y="4" width="7" height="5" rx="1.5" />
					<rect x="13" y="11" width="7" height="9" rx="1.5" /><rect x="4" y="15" width="7" height="5" rx="1.5" />
				</svg>
			</a>
			{#if view.canFlip && flippable}
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
		{#if compact && intro}
			<p class="note" role="status" out:fade={{ duration: 250 }}>Sound {music.on ? 'on' : 'off'}</p>
		{/if}
	</div>
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
		align-items: center;
		gap: 8px;
	}
	/* The side you're on, beside Interests and hobbies: a small tag with an ember dot. */
	.where {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		padding: 5px 10px;
		border-radius: 999px;
		background: var(--chip);
		backdrop-filter: blur(6px);
		font: 600 10px/1.2 var(--font-ui);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--ember-ink);
		animation: appear 0.5s ease-out;
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
	/* Desktop: the wrappers the phone corner needs are transparent to the row. */
	.items,
	.drop {
		display: contents;
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
		flex-wrap: wrap;
		gap: 6px;
		max-width: min(820px, 100%);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ember);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ember) 25%, transparent);
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
	/* The War Forge's bubbles, a bonus once it's been found: the same set, in the empire's red. */
	.bubbles button.bonus {
		border-color: color-mix(in srgb, var(--bonus) 40%, transparent);
		background: color-mix(in srgb, var(--bonus) 9%, var(--chip));
		color: var(--bonus-ink);
	}
	.bubbles button.bonus:hover {
		background: color-mix(in srgb, var(--bonus) 16%, var(--chip-hover));
	}
	.bubbles button.bonus.active {
		border-color: var(--bonus);
		background: color-mix(in srgb, var(--bonus) 22%, var(--chip));
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--bonus) 35%, transparent);
	}

	/* Secrets found: the side tag's twin, with a spark that flares as a new one comes in. */
	.found {
		animation: found 0.7s cubic-bezier(0.3, 1.6, 0.5, 1);
	}
	.found svg {
		width: 11px;
		height: 11px;
		fill: currentColor;
		animation: spark 0.9s ease-out;
	}
	@keyframes found {
		from {
			opacity: 0;
			scale: 0.6;
		}
	}
	@keyframes spark {
		from {
			rotate: -180deg;
			scale: 2;
		}
	}

	@keyframes appear {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@media (max-width: 760px) {
		/*
		 * Above the content sheet while it's up (--sheet is its height, set by the layout), or at home
		 * above the line the layout keeps below them (--foot).
		 */
		.controls {
			left: 12px;
			right: 12px;
			bottom: calc(var(--sheet, 0px) + var(--foot, 0px) + 12px);
			transition: bottom 0.35s ease-out;
		}
		/* A tighter tag, so it fits beside Interests and hobbies from 360px up (it wraps below on narrower). */
		.bar {
			gap: 6px;
		}
		.where {
			gap: 5px;
			padding: 4px 8px;
			letter-spacing: 0.06em;
		}
		/* One scrolling row on phones, so the bubbles don't cover the island. */
		.bubbles {
			flex-wrap: nowrap;
			overflow-x: auto;
			max-width: 100%;
			scrollbar-width: none;
		}
		.bubbles li {
			flex: none;
		}
		.world {
			top: 14px;
			right: 14px;
		}
	}

	/*
	 * Phones: the corner folds into the menu button (38px, like the other round buttons). Open, the
	 * player sits to its left and flip and day/night drop below it, 8px apart on the button's own axes;
	 * folded, they slide back into it and hide. The player is 40px tall (its border sits outside its
	 * height, a button's inside), so it rides 1px up to share the button's middle.
	 */
	.world.compact {
		gap: 0;
	}
	.compact .items {
		display: block;
	}
	.compact .items > :global(.player),
	.compact .drop {
		position: absolute;
		transition:
			opacity 0.25s ease-out,
			transform 0.25s ease-out,
			visibility 0s;
	}
	.compact .items > :global(.player) {
		top: -1px;
		right: 46px;
		transform-origin: right center;
	}
	.compact .drop {
		top: 46px;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transform-origin: top center;
	}
	.folded .items > :global(.player),
	.folded .drop {
		opacity: 0;
		visibility: hidden;
		transition-delay: 0s, 0s, 0.25s;
	}
	.folded .items > :global(.player) {
		transform: translateX(40px) scale(0.8);
	}
	.folded .drop {
		transform: translateY(-40px) scale(0.8);
	}
	.menu svg {
		transition: transform 0.25s ease-out;
	}
	.menu[aria-expanded='true'] svg {
		transform: rotate(45deg);
	}
	/* Under the player while the corner first shows: whether sound is on. */
	.note {
		position: absolute;
		top: 46px;
		right: 46px;
		margin: 0;
		padding: 7px 12px;
		border-radius: 999px;
		background: var(--chip);
		color: var(--muted);
		font-size: 12px;
		white-space: nowrap;
		backdrop-filter: blur(6px);
		animation: appear 0.4s ease-out;
	}

	@media (prefers-reduced-motion: reduce) {
		.controls,
		.compact .items > :global(.player),
		.compact .drop,
		.menu svg {
			transition: none;
		}
		.note {
			animation: none;
		}
		.pill,
		.primary.beckon,
		.bubbles li,
		.found,
		.found svg {
			animation: none;
		}
	}
</style>
