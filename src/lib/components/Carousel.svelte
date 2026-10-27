<!-- One project's images, one at a time: swipe or scroll the strip, or use the arrows and dots. The
     strip is a plain scroll-snap row, so it works with touch, trackpads and the keyboard without help. -->
<script lang="ts">
	import type { Carousel } from '../content/types';
	import { isExternal } from '../content/urls';

	let { carousel }: { carousel: Carousel } = $props();
	const { title, summary, url, images } = $derived(carousel);

	let track: HTMLElement;
	let index = $state(0);

	/** Shows image `i`, wrapping round at either end. */
	function go(i: number) {
		const n = images.length;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		track.scrollTo({ left: ((i + n) % n) * track.clientWidth, behavior: reduce ? 'instant' : 'smooth' });
	}
	const onscroll = () => (index = Math.round(track.scrollLeft / track.clientWidth));
</script>

<section class="carousel" aria-roledescription="carousel" aria-label={title}>
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
		{#if images.length > 1}
			<button class="arrow prev" onclick={() => go(index - 1)} aria-label="Previous image">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
			</button>
			<button class="arrow next" onclick={() => go(index + 1)} aria-label="Next image">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
			</button>
		{/if}
	</div>

	<div class="foot">
		<p class="caption" aria-live="polite">{images[index]?.caption ?? ''}</p>
		{#if images.length > 1}
			<div class="dots">
				{#each images as image, i (image.src)}
					<button onclick={() => go(i)} aria-label="Image {i + 1}" aria-current={i === index}></button>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.carousel {
		margin-top: 26px;
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
		font-size: 14px;
		line-height: 1.5;
		color: var(--muted);
	}

	.frame {
		position: relative;
		margin-top: 12px;
	}
	.track {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
		border-radius: 8px;
		background: var(--line);
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.track:focus-visible {
		outline: 2px solid var(--ember);
		outline-offset: 2px;
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

	.arrow {
		position: absolute;
		top: 50%;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: var(--chip);
		color: var(--ink);
		cursor: pointer;
		translate: 0 -50%;
		box-shadow: 0 2px 8px rgba(40, 25, 10, 0.18);
	}
	.arrow:hover {
		border-color: var(--ember);
	}
	.prev {
		left: 8px;
	}
	.next {
		right: 8px;
	}
	.arrow svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.foot {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 6px;
		min-height: 18px;
	}
	.caption {
		flex: 1;
		margin: 0;
		font-size: 13px;
		color: var(--muted);
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
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
