<!--
  The whole site is one screen. On desktop the island fills it, with the wordmark and hero over its
  top-left; whatever opens comes in as a card on the right (the island is framed clear of it). On phones the island fills the screen with the wordmark top-left and the hero over its foot, and what opens
  comes up as a sheet from the bottom. The island stays mounted across pages; the URL says what's open
  (`/forge/furnace`), and the island follows: it flips if needed and frames the station.
-->
<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import Controls from '#lib/components/Controls.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { music } from '#lib/components/music.svelte.ts';
	import InterestCard from '#lib/components/InterestCard.svelte';
	import { IslandView } from '#lib/components/island-view.svelte.ts';
	import Pins from '#lib/components/Pins.svelte';
	import SceneCanvas from '#lib/components/SceneCanvas.svelte';
	import SecretNote from '#lib/components/SecretNote.svelte';
	import type { Interest, StationContent } from '#lib/content/types.ts';
	import { homeHref, stationHref } from '#lib/content/urls.ts';
	import type { StationId } from '#lib/scene/config.ts';
	import type { Pick } from '#lib/scene/interaction.ts';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import type { LayoutProps } from './$types';

	/** How long the pins show after the island first appears. */
	const INTRO_PINS_MS = 5000;
	const HINT_MS = 9000;
	const HINT_KEY = 'agnifico:hint-seen';
	/** Phones: the layout below this width (keep in step with the media query in the styles). */
	const PHONE = '(max-width: 760px)';
	/** Phones: the content sheet's height, as a share of the screen (also the island's lift). */
	const SHEET = 0.49;
	/** Remembers, per browser, that the visitor has found the War Forge. */
	const WAR_KEY = 'agnifico:war-found';
	/** Phones, nothing open: how far the island sits above centre, clear of the hero. */
	const HOME_LIFT = 0.14;
	/** Desktop, with a card open: how much of its width the island is framed clear of (it may tuck under the rest). */
	const CARD_INSET = 0.7;

	let { data, children }: LayoutProps = $props();

	const view = new IslandView();
	const byStation = (id: StationId) => data.stations.find((s) => s.station === id);

	/** The open station (on a station page). */
	const open = $derived(page.data.station as StationContent | undefined);
	/** An interest chosen from the bubbles that spans several stations. */
	let chosen = $state<Interest | null>(null);
	let secretId = $state<string | null>(null);
	let interestsOpen = $state(false);
	let introPins = $state(false);
	let hint = $state(false);
	let phone = $state(false);
	let controlsHeight = $state(0);
	let columnWidth = $state(0);
	let column = $state<HTMLElement>();
	/** Where keyboard focus goes back to when the open thing closes. */
	let returnTo: HTMLElement | null = null;

	const secret = $derived(data.secrets.find((s) => s.id === secretId));
	const active = $derived(
		open ? data.interests.filter((i) => i.stations.includes(open.station)).map((i) => i.id) : chosen ? [chosen.id] : []
	);
	/** Stations of the chosen interest, on whichever side is (or will be) up. */
	const chosenStations = $derived.by(() => {
		if (!chosen) return [];
		const all = chosen.stations.flatMap((id) => byStation(id) ?? []);
		const side = all.some((s) => s.side === view.side) ? view.side : all[0]?.side;
		return all.filter((s) => s.side === side);
	});
	/** /simplified is a page of its own (the JunesForge bento site): no island, no shell, no music. */
	const bare = $derived(page.route.id?.startsWith('/simplified') ?? false);
	$effect(() => music.allow(!bare));
	/** The home page (or /all, the same page) with nothing open: on desktop, no card, just the scene with the hero over it. */
	const home = $derived(!open && !chosen && (page.route.id === '/' || page.route.id === '/all'));

	/**
	 * The War Forge stays out of sight (no bubbles, no mention) until the visitor finds it: by flipping,
	 * through the signpost, by a link to one of its stations, or by coming in through /all. Once found,
	 * it's remembered in this browser and its interests join the bubbles as a bonus.
	 */
	let warFound = $state(false);
	onMount(() => {
		try {
			warFound ||= localStorage.getItem(WAR_KEY) === '1';
		} catch {
			// Storage blocked: found again each visit.
		}
	});
	$effect(() => {
		if (warFound || (view.side !== 'war' && page.route.id !== '/all')) return;
		warFound = true;
		try {
			localStorage.setItem(WAR_KEY, '1');
		} catch {
			// Storage blocked: found for this visit only.
		}
	});
	const sideOf = (interest: Interest) => byStation(interest.stations[0])?.side;
	const shownInterests = $derived(warFound ? data.interests : data.interests.filter((i) => sideOf(i) !== 'war'));
	/** Phones: content is open, so the column is up as a sheet. */
	const sheet = $derived(phone && !!(open || chosen));
	const lit = $derived(open ? [open.station] : chosenStations.map((s) => s.station));
	/** A station has been opened this visit: the invitation top-right has done its job. */
	let explored = $state(false);
	$effect(() => {
		if (open) explored = true;
	});

	// The island follows what's open.
	$effect(() => {
		const station = open;
		const stations = chosenStations;
		untrack(() => {
			if (station) view.show(station.side, [station.station]);
			else if (stations.length) view.show(stations[0].side, stations.map((s) => s.station));
			else view.clear();
		});
	});

	// Small sounds as things open and close: a page (an anvil's ting for the furnace), a book shutting.
	let heard: string | null = null;
	/** A flip closes what's open; its swish is sound enough. */
	let hush = false;
	$effect(() => {
		const now = open?.station ?? chosen?.id ?? null;
		if (now === heard) return;
		const was = heard;
		heard = now;
		untrack(() => {
			if (now) music.play(now === 'furnace' ? 'anvil' : 'page');
			else if (was && !hush) music.play('close');
		});
	});

	// Phones: keep the island clear of the hero, or of the sheet while it's up.
	$effect(() => view.setLift(!phone ? 0 : sheet ? SHEET : HOME_LIFT));
	// Desktop: the island is centred on the screen; with a card open it slides left, clear of it.
	$effect(() => view.setInset(phone || home ? 0 : Math.round(columnWidth * CARD_INSET)));

	onMount(() => {
		const query = matchMedia(PHONE);
		const update = () => (phone = query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});

	// Opening a station shows which interests it belongs to (not on phones: the sheet says so, and the
	// island above it needs the room).
	$effect(() => {
		if (open) untrack(() => (interestsOpen ||= !phone));
	});

	// First impressions: pins for a few seconds, and on a first visit a hint about what's clickable.
	$effect(() => {
		if (!view.shown) return;
		untrack(() => {
			introPins = true;
			let seen = true;
			try {
				seen = localStorage.getItem(HINT_KEY) === '1';
				localStorage.setItem(HINT_KEY, '1');
			} catch {
				// Storage blocked: skip the hint.
			}
			hint = !seen && !open;
		});
		const pins = setTimeout(() => (introPins = false), INTRO_PINS_MS);
		const hintTimer = setTimeout(() => (hint = false), HINT_MS);
		return () => {
			clearTimeout(pins);
			clearTimeout(hintTimer);
		};
	});

	const rememberFocus = () => {
		const el = document.activeElement;
		returnTo = el instanceof HTMLElement && el !== document.body ? el : null;
	};

	const restoreFocus = () => {
		if (returnTo?.isConnected) returnTo.focus();
		returnTo = null;
	};

	const close = async () => {
		await goto(homeHref());
	};

	const onPick = (pick: Pick | null) => {
		hint = false;
		if (!pick) {
			if (secretId) secretId = null;
			else if (open) close();
			else if (chosen) chosen = null;
			return;
		}
		returnTo = null;
		if (pick.type === 'secret') {
			secretId = pick.id;
			music.play('secret');
			return;
		}
		const station = byStation(pick.id);
		chosen = null;
		if (station) goto(stationHref(station.side, station.station));
	};

	const chooseInterest = (interest: Interest) => {
		hint = false;
		rememberFocus();
		if (active.includes(interest.id)) {
			chosen = null;
			if (open) close();
			return;
		}
		const station = interest.stations.length === 1 ? byStation(interest.stations[0]) : undefined;
		if (station) {
			chosen = null;
			goto(stationHref(station.side, station.station));
		} else {
			chosen = interest;
			if (open) close();
		}
	};

	const flip = async () => {
		if (!view.canFlip || view.flipping) return;
		hush = true;
		secretId = null;
		chosen = null;
		if (open) await close();
		await view.flip();
		hush = false;
	};

	const onKey = (e: KeyboardEvent) => {
		if (e.defaultPrevented || bare) return;
		if (e.key === 'Escape') {
			if (secretId) secretId = null;
			else if (open) close();
			else if (chosen) {
				chosen = null;
				restoreFocus();
			} else if (interestsOpen) interestsOpen = false;
			else return;
			e.preventDefault();
			return;
		}
		if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
		if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) flip();
	};

	afterNavigate(({ type, to }) => {
		if (column) column.scrollTop = 0;
		// Closing a station (back home) returns focus to what opened it.
		if (type !== 'enter' && !to?.params?.slug) restoreFocus();
	});

	// Leaving a secret's note or the interest card for another side makes no sense after a flip.
	onMount(() => view.world?.onSideChange(() => (secretId = null)));
</script>

<svelte:head>
	<!--
	  The tab icon is the mark alone, following the browser's light or dark look. No PNG icon beside it:
	  browsers prefer a sized PNG and swap to it after load. The red tile is only for home screens
	  (static/favicon-32.png is kept as a spare, unused).
	-->
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="author" content={data.site.author} />
	<meta property="og:site_name" content={data.site.name} />
</svelte:head>

<svelte:window onkeydown={onKey} />

{#if bare}
	<!-- /simplified: the old JunesForge bento page, on its own, without the island. -->
	{@render children()}
{:else}
	<div
		class="shell"
		class:dark={view.dark}
		class:sheet
		class:home
		style:--sky={view.sky}
		style:--controls-h="{controlsHeight}px"
		style:--sheet-share={SHEET}
	>
		<SceneCanvas {view} start={open?.side ?? 'forge'} secrets={data.secrets} war={warFound} onpick={onPick}>
			<Pins {view} show={introPins || interestsOpen} {lit} />
			{#if secret}
				{#key secret.id}
					<SecretNote {view} {secret} onclose={() => (secretId = null)} />
				{/key}
			{/if}
			<Controls
				{view}
				interests={shownInterests}
				stations={data.stations}
				{active}
				bind:open={interestsOpen}
				bind:height={controlsHeight}
				{hint}
				compact={phone}
				onchoose={chooseInterest}
				onflip={flip}
			/>
		</SceneCanvas>

		<!-- Pinned top-left over the island, whatever is open (outside the column, which moves as a card or sheet). -->
		<header>
			<a class="wordmark" href={homeHref()}><Logo /><span class="name">{data.site.name}</span></a>
		</header>

		<!-- Desktop, at home: the invitation (`invite` in site.md) under the corner icons, until the first station opens. -->
		{#if home && !explored && data.site.invite}
			<p class="invite">{@html data.site.invite}</p>
		{/if}

		<div class="column" bind:this={column} bind:clientWidth={columnWidth}>
			<main class:home={!open && !chosen}>
				{#if chosen && !open}
					{#key chosen.id}
						<InterestCard
							interest={chosen}
							stations={chosenStations}
							onclose={() => {
								chosen = null;
								restoreFocus();
							}}
						/>
					{/key}
				{:else}
					{@render children()}
				{/if}
			</main>
		</div>
	</div>
{/if}

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
		overflow: hidden;
	}

	.shell {
		/*
		 * Two faces: a bookish serif for names, titles and text, and Chakra Petch, a squared game face,
		 * for everything you click or scan: buttons, bubbles, labels, keys and dates.
		 */
		--font-display: 'Iowan Old Style', 'Palatino Linotype', Palatino, Literata, Georgia, serif;
		--font-text: var(--font-display);
		--font-ui: 'Chakra Petch', system-ui, -apple-system, 'Segoe UI', sans-serif;
		--ink: #3b3128;
		--muted: #7a6a5a;
		--line: rgba(60, 45, 30, 0.16);
		--paper: #fffaf1;
		--chip: rgba(255, 250, 241, 0.85);
		--chip-hover: #fffaf1;
		--ember: #e8893f;
		--ember-ink: #b85c1c;
		--mark: color-mix(in srgb, var(--ember) 38%, transparent);
		/* The War Forge's bonus bubbles: the empire's red. */
		--bonus: #b3343f;
		--bonus-ink: #93262f;

		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) clamp(340px, 34vw, 560px);
		background: var(--sky);
		color: var(--ink);
		font-family: var(--font-text);
	}
	.shell.dark {
		--ink: #f1ebff;
		--muted: #b7accf;
		--line: rgba(230, 220, 255, 0.18);
		--paper: #2f2a4a;
		--chip: rgba(52, 45, 84, 0.82);
		--chip-hover: #3d3562;
		--ember: #f2a25c;
		--ember-ink: #ffbe82;
		--mark: color-mix(in srgb, var(--ember) 62%, transparent);
		--bonus: #ff7a86;
		--bonus-ink: #ffb3ba;
	}

	.column {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow-y: auto;
		padding: 28px clamp(20px, 3vw, 44px) 24px 8px;
	}
	/* Top-left over the island on every screen, on its own pill (so no halo). */
	header {
		position: absolute;
		z-index: 2;
	}
	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.32em;
		font: 600 22px/1 var(--font-display);
		letter-spacing: 0.01em;
		color: inherit;
		color: white;
		text-decoration: none;
		background-color: hsla(0, 0%, 16%, 0.33);
		padding: 8px 16px;
		border-radius: calc(100vw - 100%);
	}
	/* Top-right, right-aligned under the corner icons (38px tall, 18px down, 28px in; see Controls). */
	.invite {
		position: absolute;
		top: 68px;
		right: 28px;
		z-index: 2;
		max-width: 34ch;
		margin: 0;
		color: var(--muted);
		font: 14px/1.5 var(--font-text);
		text-align: right;
		pointer-events: none;
	}
	main {
		flex: 1;
	}
	/* The hero sits in the middle of the column; the page places it (and what goes below it). */
	main.home {
		display: flex;
		flex-direction: column;
	}
	/*
	 * Desktop: the island fills the screen. The wordmark (and at home, the hero) sit top-left over it;
	 * whatever opens comes in as a card on the right, below the corner controls.
	 */
	@media (min-width: 761px) {
		.shell > :global(.stage) {
			grid-column: 1 / -1;
			grid-row: 1;
		}
		.shell :global(canvas) {
			mask-image: none;
		}
		header {
			top: 26px;
			left: 32px;
		}
		.wordmark {
			font-size: 26px;
		}
		.column {
			grid-column: 2;
			grid-row: 1;
			z-index: 1;
			align-self: start;
			box-sizing: border-box;
			max-height: calc(100% - 100px);
			margin: 80px 24px 0 0;
			padding: 26px 28px 28px;
			border: 1px solid var(--line);
			border-radius: 18px;
			background: color-mix(in srgb, var(--paper) 97%, transparent);
			box-shadow: 0 12px 40px rgba(40, 25, 10, 0.16);
			animation: card-in 0.3s ease-out;
		}
		.shell.home .column {
			align-self: stretch;
			max-height: none;
			margin: 0;
			padding: 0;
			border: 0;
			background: none;
			box-shadow: none;
			pointer-events: none;
			animation: none;
		}
	}
	@keyframes card-in {
		from {
			opacity: 0;
		}
	}
	@media (min-width: 761px) and (prefers-reduced-motion: reduce) {
		.column {
			animation: none;
		}
	}

	/* The 404's eyebrow (stations and interests no longer show one; their labels stay in the content). */
	.column :global(.kicker) {
		margin: 0 0 8px;
		font: 600 11px/1.2 var(--font-ui);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.column :global(.intro) {
		margin: 0;
		font: 19px/1.45 var(--font-display);
	}
	.column :global(.close) {
		position: absolute;
		top: -4px;
		right: 0;
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.column :global(.close:hover) {
		background: var(--line);
	}
	.column :global(.close svg) {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.shell :global(:focus-visible) {
		outline: 2px solid var(--ember);
		outline-offset: 2px;
	}
	/* ==highlighted== text in content: a marker stroke behind the lower half of the words. */
	.shell :global(mark) {
		padding: 0 0.12em;
		margin: 0 -0.04em;
		border-radius: 0.15em;
		background: linear-gradient(transparent 52%, var(--mark) 52%, var(--mark) 92%, transparent 92%);
		color: inherit;
		font-weight: 600;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
	}
	.shell :global(strong) {
		font-weight: 650;
	}
	/* Headings get focus from code (so screen readers start there), not from Tab: no ring. */
	.shell :global([tabindex='-1']:focus-visible) {
		outline: none;
	}

	@media (max-width: 760px) {
		/*
		 * Phones: the island fills the screen. With nothing open, the hero sits over its foot on a soft
		 * fade, just above the controls, and lets touches through to the island. Opening something
		 * brings the column up as an opaque sheet (--sheet tall); the controls ride above it.
		 */
		.shell {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: minmax(0, 1fr);
			--sheet: 0px;
		}
		.shell.sheet {
			--sheet: calc(var(--sheet-share) * 100svh);
		}
		/* At home the controls ride a little higher, leaving a line below for the simplified link. */
		.shell.home {
			--foot: 30px;
		}
		.column {
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 1;
			overflow: hidden;
			padding: 30vh 20px calc(var(--controls-h) + var(--foot, 0px) + 52px);
			background: linear-gradient(
				to bottom,
				transparent,
				color-mix(in srgb, var(--sky) 72%, transparent) 30vh,
				color-mix(in srgb, var(--sky) 92%, transparent)
			);
			pointer-events: none;
			transition: padding-bottom 0.3s ease-out;
		}
		.column :global(a),
		.column :global(button) {
			pointer-events: auto;
		}
		.shell.sheet .column {
			box-sizing: border-box;
			height: var(--sheet);
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: 20px 20px 32px;
			border-radius: 20px 20px 0 0;
			background: var(--sky);
			box-shadow: 0 -8px 30px rgba(40, 25, 10, 0.14);
			pointer-events: auto;
			transition: none;
			animation: rise 0.35s ease-out;
		}
		/* Phones: level with the corner icons (38px tall, 14px down), whether or not the sheet is up. */
		header {
			top: 14px;
			left: 16px;
			display: flex;
			align-items: center;
			height: 38px;
		}
		.wordmark {
			font-size: 20px;
		}
		/* No room for the invitation on phones: the corner icons and the island fill the top. */
		.invite {
			display: none;
		}
		main.home {
			justify-content: flex-start;
			padding-bottom: 0;
		}
	}
	/* The narrowest phones: just the mark, or the name runs into the corner icons (still read out). */
	@media (max-width: 359px) {
		.wordmark .name {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}
	@keyframes rise {
		from {
			transform: translateY(40px);
			opacity: 0;
		}
	}
	@media (max-width: 760px) and (prefers-reduced-motion: reduce) {
		.column,
		.shell.sheet .column {
			transition: none;
			animation: none;
		}
	}
</style>
