<!--
  The whole site is one screen. On desktop the island fills it, with the wordmark and title over its
  top-left (a fresh load of the home page first stops at a front door: the title, a sound toggle and,
  once the island is in, an Enter button); whatever opens comes in as a card on the right (the island is framed clear of it). On phones the island fills the screen with the wordmark top-left and the hero over its foot, and what opens
  comes up as a sheet from the bottom. The island stays mounted across pages; the URL says what's open
  (`/forge/furnace`), and the island follows: it flips if needed and frames the station.
-->
<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import Controls from '#lib/components/Controls.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { music } from '#lib/components/music.svelte.ts';
	import InterestCard from '#lib/components/InterestCard.svelte';
	import Invite from '#lib/components/Invite.svelte';
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
	import { onMount, setContext, tick, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { LayoutProps } from './$types';

	/** How long the pins show after the island first appears. */
	const INTRO_PINS_MS = 5000;
	/** Phones: the layout below this width (keep in step with the media query in the styles). */
	const PHONE = '(max-width: 760px)';
	/** Phones: the content sheet's height, as a share of the screen (also the island's lift). */
	const SHEET = 0.49;
	/** Remembers, per browser, that the visitor has found the War Forge. */
	const WAR_KEY = 'agnifico:war-found';
	/** Remembers, per browser, which secrets the visitor has found. */
	const FOUND_KEY = 'agnifico:secrets-found';
	/** Phones, nothing open: how far the island sits above centre, clear of the hero. */
	const HOME_LIFT = 0.14;
	/** Desktop, with a card open: how much of its width the island is framed clear of (it may tuck under the rest). */
	const CARD_INSET = 0.7;
	/** Desktop, at home: how far right of centre the island sits (twice its share of the width), clear of the title. */
	const HOME_SHIFT = 0.3;
	/** Desktop, at home: how far below centre the island sits (share of the half-height), so the cottage clears the top. */
	const HOME_DROP = .4;

	let { data, children }: LayoutProps = $props();

	const view = new IslandView();

	/**
	 * The front door: a fresh load of the home page waits behind the title for the visitor to enter
	 * (deep links go straight in). Until then the island holds still and the controls stay away.
	 */
	let entered = $state(page.route.id !== '/');
	view.held = page.route.id === '/';
	setContext('entered', () => entered);
	let title = $state<HTMLElement>();
	/** In: the title glides from the door to its place under the wordmark; sound starts with this click. */
	async function enter() {
		const first = title?.getBoundingClientRect();
		entered = true;
		view.held = false;
		await tick();
		const last = title?.getBoundingClientRect();
		if (!title || !first || !last || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		title.animate(
			[
				{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width})` },
				{ transform: 'none' }
			],
			{ duration: 750, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
		);
	}
	/** The Enter button takes focus as it appears, so Enter or Space goes in. */
	const focusIt = (node: HTMLElement) => node.focus({ preventScroll: true });
	const byStation = (id: StationId) => data.stations.find((s) => s.station === id);

	/** The open station (on a station page). */
	const open = $derived(page.data.station as StationContent | undefined);
	/** An interest chosen from the bubbles that spans several stations. */
	let chosen = $state<Interest | null>(null);
	let secretId = $state<string | null>(null);
	let interestsOpen = $state(false);
	/** Phones: the corner's open, its icons dropping down the right edge (it starts open for a few seconds). */
	let cornerOpen = $state(true);
	let introPins = $state(false);
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
	/** The cottage's invitation is up: every visit, until the first click anywhere or something opens. */
	let inviting = $state(true);
	$effect(() => {
		if (open || chosen) inviting = false;
	});

	/** Secrets found in this browser, counted under Skills and Interests once there's one. */
	let found = $state<string[]>([]);
	onMount(() => {
		try {
			const ids: unknown = JSON.parse(localStorage.getItem(FOUND_KEY) ?? '[]');
			if (Array.isArray(ids)) found = data.secrets.map((s) => s.id).filter((id) => ids.includes(id));
		} catch {
			// Storage blocked: counted for this visit only.
		}
	});
	const findSecret = (id: string) => {
		if (found.includes(id)) return;
		found = [...found, id];
		try {
			localStorage.setItem(FOUND_KEY, JSON.stringify(found));
		} catch {
			// Storage blocked: counted for this visit only.
		}
	};

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
			if (now) music.play(now === 'furnace' || now === 'workbench' ? 'anvil' : 'page');
			else if (was && !hush) music.play('close');
		});
	});

	// Phones: keep the island clear of the title, or of the sheet while it's up. Desktop, at home: a
	// little low, so the cottage clears the top.
	$effect(() => view.setLift(!phone ? (home ? -HOME_DROP : 0) : sheet ? SHEET : HOME_LIFT));
	// Desktop: at home the island sits a little right of centre, clear of the title; with a card open
	// it slides left, clear of the card.
	let innerWidth = $state(0);
	$effect(() =>
		view.setInset(phone ? 0 : home ? -Math.round(innerWidth * HOME_SHIFT) : Math.round(columnWidth * CARD_INSET))
	);

	// The night guard in app.html can come off: the island has set the page's colours by now.
	onMount(() => document.documentElement.classList.remove('night'));

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

	// First impressions: pins for a few seconds, once in.
	$effect(() => {
		if (!view.shown || !entered) return;
		untrack(() => (introPins = true));
		const pins = setTimeout(() => (introPins = false), INTRO_PINS_MS);
		return () => clearTimeout(pins);
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
		if (!pick) {
			if (secretId) secretId = null;
			else if (open) close();
			else if (chosen) chosen = null;
			return;
		}
		returnTo = null;
		if (pick.type === 'secret') {
			secretId = pick.id;
			findSecret(pick.id);
			music.play('secret');
			return;
		}
		const station = byStation(pick.id);
		chosen = null;
		if (station) goto(stationHref(station.side, station.station));
	};

	const chooseInterest = (interest: Interest) => {
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

	/**
	 * The flip button only shows where the War Forge is already in play: /all, a link to one of its
	 * stations, or with that side up (so there's a way back). Otherwise F and the signpost find it.
	 */
	const flippable = $derived(page.route.id === '/all' || open?.side === 'war' || view.side === 'war');

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
		if (e.defaultPrevented || bare || !entered) return;
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
	  browsers prefer a sized PNG and swap to it after load. The red tile is only for home screens.
	-->
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="author" content={data.site.author} />
	<meta property="og:site_name" content={data.site.name} />
</svelte:head>

<!-- The click on Enter doesn't count: the invitation comes up just after it. -->
<svelte:window bind:innerWidth onkeydown={onKey} onpointerdown={() => entered && (inviting = false)} />

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
		<SceneCanvas {view} start={open?.side ?? 'forge'} secrets={data.secrets} war={warFound} quiet={!entered} onpick={onPick}>
			<Pins {view} show={introPins || interestsOpen} {lit} />
			<!-- Phones: the bubble waits for the corner to fold, or they overlap. -->
			{#if home && entered && inviting && data.site.invite && view.shown && view.side === 'forge' && !view.flipping && !(phone && cornerOpen)}
				<Invite {view} text={data.site.invite} note={data.site.inviteNote} />
			{/if}
			{#if secret}
				{#key secret.id}
					<SecretNote {view} {secret} onclose={() => (secretId = null)} />
				{/key}
			{/if}
			{#if entered}
				<Controls
					{view}
					interests={shownInterests}
					stations={data.stations}
					{active}
					bind:open={interestsOpen}
					bind:height={controlsHeight}
					bind:cornerOpen
					found={found.length}
					secrets={data.secrets.length}
					compact={phone}
					{flippable}
					onchoose={chooseInterest}
					onflip={flip}
				/>
			{/if}
		</SceneCanvas>

		<!-- Pinned top-left over the island, whatever is open (outside the column, which moves as a card or sheet). -->
		<header>
			<a class="wordmark" href={homeHref()}><Logo /><span class="name">{data.site.name}</span></a>
		</header>

		<!-- The title: big at the front door, then small under the wordmark on every page. -->
		<div class="hero" class:door={!entered}>
			<svelte:element this={page.route.id === '/' ? 'h1' : 'p'} class="title" bind:this={title}>
				<span class="lead">{@html data.site.heroLead}</span>
				{#if data.site.heroRest}<span class="rest">{@html data.site.heroRest}</span>{/if}
			</svelte:element>
			<!-- The plain one-page version, offered up front, at the door and after. -->
			<a class="simple" href="/simplified">Check out a simplified version →</a>
			{#if !entered}
				<div class="way-in" out:fade={{ duration: 250 }}>
					<div class="sound-wrap">
						<button class="sound" role="switch" aria-checked={music.on} onclick={() => music.toggle()}>
							<span class="knob" aria-hidden="true"></span>
							<span>Sound {music.on ? 'on' : 'off'}</span>
						</button>
						<p class="why">Sound on for the best experience</p>
					</div>
					{#if view.failed}
						<a class="enter" href="/simplified">Simplified version</a>
					{:else if view.shown}
						<button class="enter" onclick={enter} use:focusIt in:fade={{ duration: 400 }}>Enter</button>
					{:else}
						<span class="bar" role="status" aria-label="Loading the island" class:waiting={view.progress === 0}>
							<span style:transform="scaleX({view.progress})"></span>
						</span>
					{/if}
				</div>
			{/if}
		</div>
		<!-- Until then, the island can be seen but not touched. -->
		{#if !entered}<div class="cover" aria-hidden="true" out:fade={{ duration: 250 }}></div>{/if}

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
		/* Content emphasis: the ==highlight== band behind words, and the colour of **bold** words. */
		--mark: rgba(255, 111, 0, 0.38);
		--strong: #8f4a1d;
		/* Orange accents: borders, glows, and chip backgrounds with a hint of orange. */
		--ember-line: rgba(232, 137, 63, 0.6);
		--ember-glow: rgba(232, 137, 63, 0.35);
		--ember-tint: #fcecdc;
		--ember-tint-strong: #fae3cd;
		--bubble-edge: #f9dabf;
		/* The War Forge's bonus bubbles: the empire's red. */
		--bonus: #b3343f;
		--bonus-ink: #93262f;
		--bonus-line: rgba(179, 52, 63, 0.4);
		--bonus-tint: #f8e8e1;
		--bonus-tint-strong: #f3dad5;

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
		--mark: #c55757cb;
		--strong: #ffcfa3;
		--ember-line: rgba(242, 162, 92, 0.6);
		--ember-glow: rgba(242, 162, 92, 0.35);
		--ember-tint: #4b3b55;
		--ember-tint-strong: #614b61;
		--bubble-edge: #664c4f;
		--bonus: #ff7a86;
		--bonus-ink: #ffb3ba;
		--bonus-line: rgba(255, 122, 134, 0.4);
		--bonus-tint: #463459;
		--bonus-tint-strong: #5c4068;
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
	main {
		flex: 1;
	}

	/* The title, small, right under the wordmark; a soft halo in the sky's colour keeps it readable. */
	.hero {
		position: absolute;
		z-index: 2;
		top: 80px;
		left: 34px;
		pointer-events: none;
		text-shadow:
			0 0 2px var(--sky),
			0 0 10px var(--sky),
			0 0 22px var(--sky);
	}
	.title {
		width: fit-content;
		margin: 0;
		font-family: var(--font-display);
		transform-origin: top left;
	}
	/* One voice, two lines: the lead in the ember colour, the rest in the text colour. */
	.lead {
		display: block;
		font-size: 20px;
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: -0.015em;
		color: var(--ember-ink);
		white-space: nowrap;
	}
	.rest {
		display: block;
		margin-top: 4px;
		font-size: 14px;
		font-weight: 500;
		line-height: 1.2;
		white-space: nowrap;
	}
	/* One line, so the second voice reads as one piece (the breaks in site.md are for other layouts). */
	.rest :global(br) {
		display: none;
	}
	/* At the door: big, coming in as the island loads (the lead, then the rest, then the way in). The
	   two sizes keep about the same ratio, so the glide to small is one even scale. */
	.hero.door {
		top: 18vh;
		left: 32px;
		max-width: min(44vw, 600px);
	}
	.door .lead {
		font-size: clamp(34px, 3.3vw, 54px);
		white-space: normal;
		text-wrap: balance;
		animation: rise 0.9s ease-out both;
	}
	.door .rest {
		margin-top: 10px;
		font-size: clamp(24px, 2.3vw, 34px);
		white-space: normal;
		animation: rise 0.9s 0.35s ease-out both;
	}
	.simple {
		display: inline-block;
		margin-top: 8px;
		color: var(--ember-ink);
		font: 13px/1.4 var(--font-ui);
		text-decoration: underline;
		text-decoration-color: var(--ember-line);
		text-underline-offset: 3px;
		pointer-events: auto;
	}
	.simple:hover {
		text-decoration-color: currentColor;
	}
	.door .simple {
		margin-top: 16px;
		font-size: 15px;
		animation: rise 0.9s 0.6s ease-out both;
	}
	.way-in {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 22px;
		margin-top: 30px;
		pointer-events: auto;
		animation: rise 0.9s 0.8s ease-out both;
	}
	/* Off in red, on in green, with the nudge underneath. */
	.sound-wrap {
		--sound: #d0433b;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.sound-wrap:has([aria-checked='true']) {
		--sound: #2f9e57;
	}
	:global(.shell.dark) .sound-wrap {
		--sound: #ff6f66;
	}
	:global(.shell.dark) .sound-wrap:has([aria-checked='true']) {
		--sound: #5fd38a;
	}
	.sound {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--sound);
		font: 600 14px/1.2 var(--font-ui);
		text-shadow: inherit;
		cursor: pointer;
	}
	.why {
		margin: 0;
		color: var(--muted);
		font: 13px/1.3 var(--font-ui);
	}
	.knob {
		position: relative;
		flex: none;
		width: 32px;
		height: 18px;
		border-radius: 9px;
		background: var(--sound);
		transition: background 0.2s;
	}
	.knob::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--paper);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
		transition: translate 0.2s;
	}
	.sound[aria-checked='true'] .knob::after {
		translate: 14px 0;
	}
	.enter {
		padding: 12px 38px;
		border: 0;
		border-radius: 999px;
		background: var(--ember);
		color: #2b1a0e;
		font: 600 14px/1.2 var(--font-ui);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-shadow: none;
		text-decoration: none;
		cursor: pointer;
		box-shadow: 0 8px 24px var(--ember-glow);
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}
	.enter:hover {
		transform: translateY(-1px);
		box-shadow: 0 10px 28px var(--ember-line);
	}
	/* Loading: a thin bar where the Enter button will be. */
	.bar {
		position: relative;
		display: block;
		width: 160px;
		height: 3px;
		margin: 18px 0;
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
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
	/* At the door: a veil behind the title, fading into the island. Cream by day, deep purple by night.
	   From the left on desktop, from the bottom on phones. */
	.cover {
		position: absolute;
		inset: 0;
		z-index: 1;
		background: linear-gradient(
			to right,
			rgba(243, 234, 216, 0.95),
			rgba(243, 234, 216, 0.9) 20%,
			rgba(243, 234, 216, 0.55) 34%,
			transparent 50%
		);
	}
	.dark .cover {
		background: linear-gradient(
			to right,
			rgba(33, 25, 52, 0.95),
			rgba(33, 25, 52, 0.9) 20%,
			rgba(33, 25, 52, 0.55) 34%,
			transparent 50%
		);
	}
	@media (max-width: 760px) {
		.cover {
			background: linear-gradient(
				to top,
				rgba(243, 234, 216, 0.95),
				rgba(243, 234, 216, 0.88) 22%,
				rgba(243, 234, 216, 0.5) 36%,
				transparent 50%
			);
		}
		.dark .cover {
			background: linear-gradient(
				to top,
				rgba(33, 25, 52, 0.95),
				rgba(33, 25, 52, 0.88) 22%,
				rgba(33, 25, 52, 0.5) 36%,
				transparent 50%
			);
		}
	}
	@media (max-width: 760px) {
		.hero {
			top: 60px;
			left: 18px;
		}
		.lead {
			font-size: 18px;
		}
		.rest {
			font-size: 12.5px;
		}
		/* Phones: the door sits over the island's foot. */
		.hero.door {
			top: auto;
			bottom: calc(28px + env(safe-area-inset-bottom, 0px));
			left: 20px;
			right: 20px;
			max-width: none;
		}
		.door .lead {
			font-size: 30px;
		}
		.door .rest {
			margin-top: 6px;
			font-size: 21px;
		}
		.way-in {
			gap: 18px;
			margin-top: 22px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.door .lead,
		.door .rest,
		.door .simple,
		.way-in,
		.bar.waiting > span {
			animation: none;
		}
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
			background: var(--paper);
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
		font-weight: 600;
		color: var(--strong);
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
				var(--sky) 34vh
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
