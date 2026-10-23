<!-- An interest that lives in several stations: its blurb, and a link to each. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { Interest, StationSummary } from '../content/types';
	import { stationHref } from '../content/urls';

	let { interest, stations, onclose }: { interest: Interest; stations: StationSummary[]; onclose: () => void } =
		$props();

	let heading: HTMLElement;
	onMount(() => heading.focus({ preventScroll: true }));
</script>

<section class="card" aria-labelledby="interest-title">
	<button class="close" onclick={onclose} aria-label="Close">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</button>
	<p class="kicker">Interest</p>
	<h2 id="interest-title" tabindex="-1" bind:this={heading}>{interest.label}</h2>
	{#if interest.blurb}<p class="intro">{interest.blurb}</p>{/if}
	<ul>
		{#each stations as s (s.station)}
			<li>
				<a href={stationHref(s.side, s.station)}>
					<span class="title">{s.title}</span>
					{#if s.label}<span class="label">{s.label}</span>{/if}
				</a>
			</li>
		{/each}
	</ul>
</section>

<style>
	.card {
		position: relative;
	}
	h2 {
		margin: 0 40px 12px 0;
		font: 600 clamp(28px, 3vw, 36px) / 1.1 var(--font-display);
		outline: none;
	}
	ul {
		margin: 24px 0 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--line);
	}
	li a {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 14px 0;
		border-bottom: 1px solid var(--line);
		color: inherit;
		text-decoration: none;
	}
	li a:hover .title {
		color: var(--ember-ink);
	}
	.title {
		font: 600 17px/1.3 var(--font-display);
	}
	.label {
		font-size: 14px;
		color: var(--muted);
	}
</style>
