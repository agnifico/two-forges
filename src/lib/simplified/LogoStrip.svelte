<!-- The logos as one bento tile: a strip that scrolls sideways, three or four at a time with the
     next one peeking in. Its logos are the drafting desk's gallery on the island
     (src/content/stations/forge/drafting-desk.md): add one there and it shows here too. Clicking a
     logo opens the Logos & Type card on it. -->
<script lang="ts">
	import type { GalleryImage } from '#lib/content/types.ts';

	let { logos, onopen }: { logos: GalleryImage[]; onopen: (i: number) => void } = $props();

	let row: HTMLElement;
	let atStart = $state(true);
	let atEnd = $state(false);
	const onscroll = () => {
		atStart = row.scrollLeft < 4;
		atEnd = row.scrollLeft + row.clientWidth > row.scrollWidth - 4;
	};
	/** One tile's width on, either way. */
	function step(dir: 1 | -1) {
		const tile = row.firstElementChild as HTMLElement | null;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		row.scrollBy({ left: dir * ((tile?.offsetWidth ?? 200) + 12), behavior: reduce ? 'instant' : 'smooth' });
	}
</script>

<section class="logo-strip" aria-label="Logos and type">
	<div class="head">
		<div class="card-tag">◦ LOGOS &amp; TYPE <span class="count">{logos.length}</span></div>
		<div class="arrows">
			<button onclick={() => step(-1)} disabled={atStart} aria-label="Earlier logos">←</button>
			<button onclick={() => step(1)} disabled={atEnd} aria-label="More logos">→</button>
		</div>
	</div>
	<div class="row" class:more={!atEnd} bind:this={row} {onscroll}>
		{#each logos as logo, i (logo.src)}
			<button class="logo" onclick={() => onopen(i)} aria-label="{logo.caption ?? logo.alt} (opens the card)">
				<img src={logo.src} alt="" loading="lazy" draggable="false" />
			</button>
		{/each}
	</div>
</section>

<style>
	.logo-strip {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px 16px;
		min-height: 0;
		min-width: 0;
		overflow: hidden;
		background: var(--surface);
		border: 1px solid var(--accent-soft);
		border-radius: var(--radius-card);
		box-shadow: var(--card-shadow);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.card-tag {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.2em;
		color: var(--accent-text);
	}
	.count {
		margin-left: 6px;
		color: var(--text-dim);
	}
	.arrows {
		display: flex;
		gap: 6px;
	}
	.arrows button {
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--accent-soft);
		border-radius: 50%;
		background: none;
		color: var(--text);
		font: 0.875rem/1 var(--font-mono);
		cursor: pointer;
	}
	.arrows button:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent-text);
	}
	.arrows button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.row {
		flex: 1;
		min-height: 0;
		display: flex;
		gap: 12px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}
	.row::-webkit-scrollbar {
		display: none;
	}
	/* The hint that there are more: the far edge fades while the strip can still scroll. */
	.row.more {
		mask-image: linear-gradient(to right, #000 85%, transparent);
	}
	.logo {
		flex: none;
		height: 100%;
		aspect-ratio: 4 / 3;
		padding: 0;
		border: 1px solid var(--accent-soft);
		border-radius: 10px;
		overflow: hidden;
		background: #0e0e0e;
		cursor: pointer;
		scroll-snap-align: start;
	}
	.logo img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.5s ease;
	}
	.logo:hover img {
		transform: scale(1.04);
	}
	.logo:hover {
		border-color: var(--accent);
	}
	.logo:focus-visible {
		outline: 2px solid var(--accent-text);
		outline-offset: 2px;
	}

	@media (max-width: 900px) {
		.row {
			height: 200px;
			flex: none;
		}
	}
</style>
