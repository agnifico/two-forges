<!-- The credits card: who made what, from src/content/credits.md. Opens in the column like a station. -->
<script lang="ts">
	import { homeHref } from '#lib/content/urls.ts';
	import { afterNavigate } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { credits, site } = $derived(data);

	let heading: HTMLElement;
	// Opened from a link: move focus here so the card is read next.
	afterNavigate(({ type }) => {
		if (type !== 'enter') heading?.focus({ preventScroll: true });
	});
</script>

<svelte:head>
	<title>{credits.title} · {site.name}</title>
	<meta name="description" content="Who made what on {site.name}: type, models, sound and music." />
	{#if site.url}<link rel="canonical" href="{site.url}/credits" />{/if}
</svelte:head>

<article class="credits" aria-labelledby="credits-title">
	<a class="close" href={homeHref()} aria-label="Close">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</a>
	<h1 id="credits-title" tabindex="-1" bind:this={heading}>{credits.title}</h1>
	<div class="prose">{@html credits.html}</div>
</article>

<style>
	.credits {
		position: relative;
	}
	/* Same as a station's title. */
	h1 {
		margin: 0 44px 14px 0;
		font: 600 clamp(30px, 3vw, 40px) / 1.1 var(--font-display);
		outline: none;
	}
	.prose {
		font-size: 16px;
		line-height: 1.6;
	}
	.prose :global(p) {
		margin: 0 0 14px;
	}
	.prose :global(h2) {
		margin: 22px 0 6px;
		font: 600 12px/1.2 var(--font-ui);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.prose :global(a) {
		color: var(--ember-ink);
		text-decoration: underline;
		text-decoration-color: var(--ember-line);
		text-underline-offset: 3px;
	}
	.prose :global(a:hover) {
		text-decoration-color: currentColor;
	}
</style>
