<!-- A station's content, in the column beside the island. Prerendered, so it reads (and indexes) before
     the island has loaded, or without JavaScript at all. -->
<script lang="ts">
	import { homeHref, isExternal } from '#lib/content/urls.ts';
	import { afterNavigate } from '$app/navigation';
	import SkillsPanel from '#lib/components/SkillsPanel.svelte';
	import Carousel from '#lib/components/Carousel.svelte';
	import Reel from '#lib/components/Reel.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { station: s, site, skills } = $derived(data);

	let heading: HTMLElement;
	// Opened from the island or the bubbles: move focus here so the content is read next.
	afterNavigate(({ type }) => {
		if (type !== 'enter') heading?.focus({ preventScroll: true });
	});
</script>

<svelte:head>
	<title>{s.title} · {site.name}</title>
	<meta name="description" content={s.description} />
	<meta property="og:title" content="{s.title} · {site.name}" />
	<meta property="og:description" content={s.description} />
	<meta property="og:type" content="article" />
	<!-- The station's first image, else the island's own card (og.png); both need site.url. -->
	{#if site.url}<meta property="og:image" content="{site.url}{s.gallery[0]?.src ?? '/og.png'}" />{/if}
	<meta name="twitter:card" content={site.url ? 'summary_large_image' : 'summary'} />
	{#if site.url}<link rel="canonical" href="{site.url}/{s.side}/{s.slug}" />{/if}
</svelte:head>

<article class="station" aria-labelledby="station-title">
	<a class="close" href={homeHref()} aria-label="Close">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</a>
	<!-- No eyebrow: the side shows beside Skills and Interests, and the label (still in the content) in the interest card's list. -->
	<h1 id="station-title" tabindex="-1" bind:this={heading}>{s.title}</h1>
	{#if s.introHtml}<p class="intro">{@html s.introHtml}</p>{/if}

	{#if s.html}<div class="prose">{@html s.html}</div>{/if}

	{#each s.reels as reel (reel.page)}
		<Reel {reel} />
	{/each}

	{#each s.carousels as carousel (carousel.title)}
		<Carousel {carousel} />
	{/each}

	{#if s.gallery.length}
		<ul class="gallery" aria-label="Gallery">
			{#each s.gallery as image (image.src)}
				<li>
					<figure>
						{#if image.url}
							<a href={image.url} target={isExternal(image.url) ? '_blank' : undefined} rel={isExternal(image.url) ? 'noopener' : undefined}>
								<img src={image.src} alt={image.alt} loading="lazy" />
							</a>
						{:else}
							<img src={image.src} alt={image.alt} loading="lazy" />
						{/if}
						{#if image.caption}<figcaption>{image.caption}</figcaption>{/if}
					</figure>
				</li>
			{/each}
		</ul>
	{/if}

	{#if s.entries.length}
		<section class="entries" aria-labelledby="entries-title">
			<h2 id="entries-title">Entries</h2>
			<ul>
				{#each s.entries as entry (entry.title)}
					<li>
						{#if entry.image}<img class="thumb" src={entry.image} alt="" loading="lazy" />{/if}
						{#if entry.date}<span class="date">{entry.date}</span>{/if}
						<span class="what">
							{#if entry.url}
								<a href={entry.url} target={isExternal(entry.url) ? '_blank' : undefined} rel={isExternal(entry.url) ? 'noopener' : undefined}
									>{entry.title}</a
								>
							{:else}
								<strong>{entry.title}</strong>
							{/if}
							{#if entry.summary}<span class="summary">{entry.summary}</span>{/if}
						</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if skills && s.skills}
		<div class="skills"><SkillsPanel {skills} open={s.skills} /></div>
	{/if}

	{#if s.links.length || s.socials.length}
		<ul class="links">
			{#each s.links as link (link.url)}
				<li>
					<a href={link.url} target={isExternal(link.url) ? '_blank' : undefined} rel={isExternal(link.url) ? 'noopener' : undefined}>
						{#if link.icon}<svg viewBox="0 0 24 24" aria-hidden="true"><path d={link.icon} /></svg>{/if}
						{link.label}{#if isExternal(link.url)}<span aria-hidden="true"> ↗</span><span class="sr">(opens in a new tab)</span>{/if}
					</a>
				</li>
			{/each}
			<!-- Socials: icons only, set a little apart from the links. -->
			{#each s.socials as social, i (social.url)}
				<li class:first-social={i === 0 && s.links.length > 0}>
					<a
						class="social"
						href={social.url}
						title={social.label}
						aria-label={social.label}
						target={isExternal(social.url) ? '_blank' : undefined}
						rel={isExternal(social.url) ? 'noopener' : undefined}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d={social.icon} /></svg>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</article>

<style>
	.station {
		position: relative;
		animation: enter 0.35s ease-out;
	}
	h1 {
		margin: 0 44px 14px 0;
		font: 600 clamp(30px, 3vw, 40px) / 1.1 var(--font-display);
		outline: none;
	}
	/* Longer reading: emphasis in the serif's italic, a touch larger. */
	.prose {
		margin-top: 20px;
		font-size: 16px;
		line-height: 1.65;
	}
	.prose :global(em) {
		font-family: var(--font-display);
		font-size: 1.06em;
	}
	.prose :global(a) {
		color: var(--ember-ink);
	}
	.prose :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
	}
	.prose :global(h2),
	.prose :global(h3) {
		margin: 1.6em 0 0.5em;
		font-family: var(--font-display);
		line-height: 1.2;
	}

	.gallery {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		margin: 24px 0 0;
		padding: 0;
		list-style: none;
	}
	/* The first image runs wide, and so does a last one left without a partner. */
	.gallery li:first-child,
	.gallery li:last-child:nth-child(even) {
		grid-column: 1 / -1;
	}
	/* Wide, an image keeps its own shape; in pairs, they're cropped to match. */
	.gallery li:first-child img,
	.gallery li:last-child:nth-child(even) img {
		aspect-ratio: auto;
	}
	figure {
		margin: 0;
	}
	figure a {
		display: block;
		border-radius: 8px;
	}
	figure a:hover img {
		outline: 2px solid var(--ember);
		outline-offset: 2px;
	}
	figure img {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: 8px;
		background: var(--line);
	}
	figcaption {
		margin-top: 6px;
		font-size: 13px;
		color: var(--muted);
	}

	.skills {
		margin-top: 26px;
	}

	.entries h2 {
		margin: 28px 0 4px;
		font: 600 11px/1.2 var(--font-ui);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.entries ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.entries li {
		display: flex;
		gap: 14px;
		padding: 12px 0;
		border-bottom: 1px solid var(--line);
	}
	.thumb {
		flex: none;
		width: 96px;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		border-radius: 6px;
		background: var(--line);
	}
	.date {
		flex: none;
		width: 3.2em;
		font-size: 13px;
		color: var(--muted);
		padding-top: 2px;
	}
	.what {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.what a,
	.what strong {
		font: 600 16px/1.3 var(--font-display);
		color: inherit;
	}
	.summary {
		font-size: 14px;
		line-height: 1.5;
		color: var(--muted);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 28px 0 0;
		padding: 0;
		list-style: none;
	}
	.links a {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 14px;
		border: 1px solid var(--line);
		border-radius: 999px;
		color: inherit;
		font: 500 14px/1.2 var(--font-ui);
		text-decoration: none;
	}
	.links a:hover {
		border-color: var(--ember);
	}
	.links svg {
		width: 16px;
		height: 16px;
		fill: currentColor;
	}
	/* Socials: round icon buttons, with a gap between them and the links before. */
	.links a.social {
		padding: 8px;
	}
	.links .first-social {
		margin-left: 14px;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.station {
			animation: none;
		}
	}
</style>
