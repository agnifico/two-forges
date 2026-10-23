<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { site } = $derived(data);
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

<h1 class="welcome">
	<span class="lead">{@html site.heroLead}</span>
	{#if site.heroRest}<span class="rest">{@html site.heroRest}</span>{/if}
</h1>

<!-- How to get around (pointer screens only) and the invitation to; at the foot of the column. -->
<div class="how">
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
	{#if site.invite}<p class="invite">{@html site.invite}</p>{/if}
	<!-- Everything on one plain page, for those who'd rather not explore. -->
	<a class="simple" href="/simplified">Short on time? See the simplified version →</a>
</div>

<style>
	/* Desktop: the hero right-aligned in the middle of the column, the how-to at its foot. */
	.welcome {
		margin: auto 0;
		padding-bottom: 6vh;
		font-family: var(--font-display);
		text-align: right;
		text-wrap: balance;
	}
	/* One voice, two lines: the lead in the ember colour, the rest in the text colour, same serif. */
	.lead {
		display: block;
		font-size: clamp(34px, 3.3vw, 54px);
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: -0.015em;
		color: var(--ember-ink);
	}
	.rest {
		display: block;
		margin: 10px 0 0 auto;
		width: fit-content;
		font-size: clamp(24px, 2.3vw, 34px);
		font-weight: 500;
		line-height: 1.2;
	}
	/* One line, so the second voice reads as one piece (the breaks in site.md are for other layouts). */
	.rest :global(br) {
		display: none;
	}

	.how {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 14px;
		text-align: right;
		color: var(--muted);
	}
	/* A game-style control legend: one per row, the mouse icons lined up on the right edge. */
	.mouse {
		display: flex;
		flex-direction: column;
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
	.invite {
		max-width: 34ch;
		margin: 0;
		font: 14px/1.5 var(--font-text);
	}
	.simple {
		margin-top: -6px;
		color: var(--ember-ink);
		font: 14px/1.5 var(--font-text);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--ember) 45%, transparent);
		text-underline-offset: 3px;
		pointer-events: auto;
	}
	.simple:hover {
		text-decoration-color: currentColor;
	}
	@media (pointer: coarse) {
		.mouse {
			display: none;
		}
	}

	/*
	 * Desktop: no column at home. The hero sits under the wordmark, over the scene, and the legend in
	 * the bottom-right corner; a soft halo in the sky's colour keeps them readable over grass and rock.
	 */
	@media (min-width: 761px) {
		.welcome,
		.how {
			position: absolute;
			z-index: 1;
			text-shadow:
				0 0 2px var(--sky),
				0 0 10px var(--sky),
				0 0 22px color-mix(in srgb, var(--sky) 70%, transparent);
		}
		.welcome {
			top: 82px;
			left: 32px;
			max-width: min(44vw, 600px);
			margin: 0;
			padding: 0;
			text-align: left;
		}
		.rest {
			margin-left: 0;
		}
		.how {
			right: 32px;
			bottom: 24px;
		}
	}

	@media (max-width: 760px) {
		/* Phones: the hero over the island's foot, left-aligned. */
		.welcome {
			margin: 0;
			padding-bottom: 0;
			text-align: left;
		}
		.lead {
			font-size: 30px;
		}
		.rest {
			margin: 6px 0 0;
			font-size: 22px;
		}
		/* Phones: only the way to the simplified page, under the hero. */
		.how {
			align-items: flex-start;
			margin-top: 12px;
			text-align: left;
		}
		.invite,
		.mouse {
			display: none;
		}
		.simple {
			margin-top: 0;
		}
	}
</style>
