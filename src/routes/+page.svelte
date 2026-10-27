<script lang="ts">
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { site } = $derived(data);
	/** Past the front door (see the layout, which also shows the title). */
	const entered = getContext<() => boolean>('entered');
</script>

<svelte:head>
	<title>{site.name}</title>
	<meta name="description" content={site.description} />
	<meta property="og:title" content={site.name} />
	<meta property="og:description" content={site.description} />
	<meta property="og:type" content="website" />
	<!-- Link previews need an absolute image URL, so the card image waits for site.url. -->
	{#if site.url}
		<meta property="og:image" content="{site.url}/og.png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<link rel="canonical" href="{site.url}/" />
	{/if}
	<meta name="twitter:card" content={site.url ? 'summary_large_image' : 'summary'} />
</svelte:head>

<!-- How to get around: a mouse legend in the bottom-right corner, desktop only, once in. -->
{#if entered()}
<div class="how" in:fade={{ duration: 400 }}>
	<ul class="mouse" aria-label="Mouse controls">
		<li>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path class="on" d="M12 3a6 6 0 0 0-6 6v2h6z" /><rect x="6" y="3" width="12" height="18" rx="6" /><path d="M12 3v8M6 11h12" /></svg>
			Drag to orbit
		</li>
		<li>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path class="on" d="M12 3a6 6 0 0 1 6 6v2h-6z" /><rect x="6" y="3" width="12" height="18" rx="6" /><path d="M12 3v8M6 11h12" /></svg>
			Right-drag to pan
		</li>
		<li>
			<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="6" /><rect class="on" x="10.5" y="6" width="3" height="5" rx="1.5" /></svg>
			Scroll to zoom
		</li>
	</ul>
</div>
{/if}

<style>
	.how {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		text-align: right;
		color: var(--muted);
	}
	/* A game-style control legend: one per row, the mouse icons lined up on the right edge. */
	.mouse {
		display: flex;
		align-items: flex-end;
		gap: 7px;
		margin: 0;
		padding: 0;
		list-style: none;
		font: 11.5px/1 var(--font-ui);
	}
	.mouse li {
		display: inline-flex;
		flex-direction: row-reverse;
		align-items: center;
		gap: 7px;
	}
	.mouse svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
	}
	.mouse .on {
		fill: var(--ember);
		stroke: none;
	}
	@media (pointer: coarse) {
		.mouse {
			display: none;
		}
	}

	/*
	 * Desktop: no column at home. The legend sits in the bottom-right corner on a dark panel, so it reads
	 * over grass and rock, day or night.
	 */
	@media (min-width: 761px) {
		.how {
			position: absolute;
			z-index: 1;
			right: 32px;
			bottom: 36px;
			padding: 8px 12px;
			border-radius: 12px;
			background: rgba(30, 24, 20, 0.55);
			color: #efe6d8;
		}
	}

	/* Phones: no mouse, so no legend. */
	@media (max-width: 760px) {
		.how {
			display: none;
		}
	}
</style>
