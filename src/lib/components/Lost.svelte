<!-- The column for a path that leads nowhere: the island stays, the column says so and points home.
     Used by the prerendered 404 page (which static hosts serve for unknown paths) and the error page. -->
<script lang="ts">
	import { homeHref } from '#lib/content/urls.ts';

	let { site, status = 404 }: { site: { name: string }; status?: number } = $props();
	const lost = $derived(status === 404);
</script>

<svelte:head>
	<title>{lost ? 'Off the edge' : 'Something broke'} · {site.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<article class="lost" aria-labelledby="lost-title">
	<p class="kicker">{lost ? 'Off the edge' : 'In the forge'}&ensp;·&ensp;{status}</p>
	<h1 id="lost-title">{lost ? 'Nothing out here but sky.' : 'Something cracked in the fire.'}</h1>
	<p class="intro">
		{#if lost}
			This path runs off the edge of the island. The island's still here, though, and so is everything on it.
		{:else}
			This page didn't come out of the forge right. Try again, or head back to the island.
		{/if}
	</p>
	<p><a class="home" href={homeHref()}>Back to the island</a></p>
</article>

<style>
	/* Laid out like a station's article (the column's shared kicker and intro styles), in the middle of the column. */
	.lost {
		margin: auto 0;
	}
	.lost > :last-child {
		margin-bottom: 0;
	}
	h1 {
		margin: 0 0 14px;
		font: 600 clamp(30px, 3vw, 40px) / 1.1 var(--font-display);
		text-wrap: balance;
	}
	.intro {
		text-wrap: pretty;
	}
	.home {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		margin-top: 8px;
		padding: 0 18px;
		border: 1px solid var(--ember-line);
		border-radius: 999px;
		background: var(--ember-tint);
		color: var(--ink);
		font: 600 14px/1 var(--font-ui);
		text-decoration: none;
	}
	.home:hover {
		background: var(--ember-tint-strong);
	}
</style>
