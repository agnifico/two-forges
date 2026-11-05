<!-- One project as a card: its images one at a time on top (swipe, scroll, or the arrows and dots
     under them), then title, summary and links. The strip is a plain scroll-snap row, so it works with
     touch, trackpads and the keyboard without help. Captions show on a strip over the image on hover. -->
<script lang="ts">
	import type { Carousel } from '../content/types';
	import { isExternal } from '../content/urls';

	import { onMount } from 'svelte';

	/** `start`: the image to open on (a logo picked from a strip, say). */
	let { carousel, start = 0 }: { carousel: Carousel; start?: number } = $props();
	const { title, summary, url, caseStudy, images } = $derived(carousel);

	let track: HTMLElement;
	let index = $state(0);
	onMount(() => {
		if (start) track.scrollLeft = start * track.clientWidth;
	});

	/** Shows image `i`, wrapping round at either end. */
	function go(i: number) {
		const n = images.length;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		track.scrollTo({ left: ((i + n) % n) * track.clientWidth, behavior: reduce ? 'instant' : 'smooth' });
	}
	const onscroll = () => (index = Math.round(track.scrollLeft / track.clientWidth));
	const caption = $derived(images[index]?.caption ?? '');
</script>

<section class="carousel" aria-roledescription="carousel" aria-label={title}>
	<div class="frame">
		<!-- Focusable so arrow keys scroll it (a scrolling region needs to be). -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="track" bind:this={track} {onscroll} role="region" tabindex="0" aria-label="{title} images">
			{#each images as image, i (image.src)}
				<div class="slide" role="group" aria-roledescription="slide" aria-label="{i + 1} of {images.length}">
					{#if image.url}
						<a href={image.url} target={isExternal(image.url) ? '_blank' : undefined} rel={isExternal(image.url) ? 'noopener' : undefined}>
							<img src={image.src} alt={image.alt} loading="lazy" draggable="false" />
						</a>
					{:else}
						<img src={image.src} alt={image.alt} loading="lazy" draggable="false" />
					{/if}
				</div>
			{/each}
		</div>
		{#if caption}<p class="caption" aria-live="polite">{caption}</p>{/if}
	</div>

	{#if images.length > 1}
		<div class="nav">
			<button class="arrow" onclick={() => go(index - 1)} aria-label="Previous image">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
			</button>
			<div class="dots">
				{#each images as image, i (image.src)}
					<button onclick={() => go(i)} aria-label="Image {i + 1}" aria-current={i === index}></button>
				{/each}
			</div>
			<button class="arrow" onclick={() => go(index + 1)} aria-label="Next image">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
			</button>
		</div>
	{/if}

	<div class="body">
		<h2>
			{#if url}
				<a href={url} target={isExternal(url) ? '_blank' : undefined} rel={isExternal(url) ? 'noopener' : undefined}
					>{title}{#if isExternal(url)}<span aria-hidden="true"> ↗</span><span class="sr">(opens in a new tab)</span>{/if}</a
				>
			{:else}
				{title}
			{/if}
		</h2>
		{#if summary}<p class="summary">{summary}</p>{/if}
		{#if caseStudy}
			<p class="case">
				<a href={caseStudy} target={isExternal(caseStudy) ? '_blank' : undefined} rel={isExternal(caseStudy) ? 'noopener' : undefined}
					>Read the case study{#if isExternal(caseStudy)}<span aria-hidden="true"> ↗</span><span class="sr">(opens in a new tab)</span>{/if}</a
				>
			</p>
		{/if}
	</div>
</section>

<style>
	/* The card: one block, set apart from the page by a hairline, a soft lift and its own padding. */
	.carousel {
		margin-top: 22px;
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--paper);
		box-shadow: 0 1px 2px rgba(40, 25, 10, 0.06), 0 6px 18px rgba(40, 25, 10, 0.07);
	}
	.carousel + :global(.carousel) {
		margin-top: 16px;
	}

	.frame {
		position: relative;
		overflow: hidden;
		border-radius: 7px;
		background: var(--line);
	}
	.track {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.track:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	.slide {
		flex: 0 0 100%;
		scroll-snap-align: start;
	}
	.track a {
		display: block;
	}
	img {
		display: block;
		width: 100%;
		aspect-ratio: 3 / 2;
		object-fit: cover;
	}

	/* Caption: a pale strip over the image's foot, slid in on hover or focus. Always on for touch. */
	.caption {
		position: absolute;
		inset: auto 0 0;
		margin: 0;
		padding: 7px 12px;
		background: rgba(255, 255, 255, 0.82);
		backdrop-filter: blur(6px);
		color: #2e261f;
		font-size: 13px;
		line-height: 1.35;
		pointer-events: none;
		opacity: 0;
		translate: 0 100%;
		transition: opacity 0.2s, translate 0.2s;
	}
	.frame:hover .caption,
	.frame:focus-within .caption {
		opacity: 1;
		translate: 0 0;
	}
	@media (hover: none) {
		.caption {
			opacity: 1;
			translate: 0 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.caption {
			transition: none;
		}
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 8px;
	}
	.arrow {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: none;
		color: var(--ink);
		cursor: pointer;
	}
	.arrow:hover {
		border-color: var(--ember);
		background: var(--chip-hover);
	}
	.arrow svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.dots {
		display: flex;
		gap: 2px;
	}
	/* A wide hit area round a small dot. */
	.dots button {
		width: 18px;
		height: 18px;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}
	.dots button::before {
		content: '';
		display: block;
		width: 7px;
		height: 7px;
		margin: auto;
		border-radius: 50%;
		background: var(--muted);
		opacity: 0.4;
		transition: opacity 0.2s, scale 0.2s;
	}
	.dots button[aria-current='true']::before {
		background: var(--ember);
		opacity: 1;
		scale: 1.25;
	}

	.body {
		padding: 12px 6px 4px;
		border-top: 1px solid var(--line);
		margin-top: 10px;
	}
	.nav + .body {
		margin-top: 8px;
	}
	h2 {
		margin: 0;
		font: 600 19px/1.25 var(--font-display);
	}
	h2 a {
		color: inherit;
		text-decoration: none;
	}
	h2 a:hover {
		color: var(--ember-ink);
	}
	.summary {
		margin: 4px 0 0;
		font-size: 15px;
		line-height: 1.45;
		color: var(--muted);
	}
	.case {
		margin: 8px 0 0;
		font: 600 13px/1.4 var(--font-ui);
	}
	.case a {
		color: var(--ember-ink);
		text-decoration: underline;
		text-decoration-color: var(--ember-line);
		text-underline-offset: 3px;
	}
	.case a:hover {
		text-decoration-color: currentColor;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
