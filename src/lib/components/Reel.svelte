<!-- A reel: its first seconds loop silently beside the title; a tap opens the whole thing (an HTML page,
     loaded only then) full screen over the island. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { Reel } from '../content/types';

	let { reel }: { reel: Reel } = $props();
	const { title, summary, page, preview, poster, alt } = $derived(reel);

	let video = $state<HTMLVideoElement>();
	let dialog: HTMLDialogElement;
	let open = $state(false);

	// Started here rather than with `autoplay`, so reduced motion keeps the poster still.
	onMount(() => {
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) video?.play().catch(() => {});
	});

	// Once the visitor clicks into the reel, keys go to its own page: listen there too (same origin).
	function hook(e: Event) {
		const win = (e.currentTarget as HTMLIFrameElement).contentWindow;
		win?.addEventListener('keydown', (k) => k.key === 'Escape' && dialog.close());
	}

	function watch() {
		open = true;
		dialog.showModal();
	}
</script>

<section class="reel" aria-labelledby="reel-{page}">
	<button class="preview" onclick={watch} aria-label="Watch {title}">
		{#if preview}
			<video bind:this={video} src={preview} {poster} muted loop playsinline preload="metadata" aria-hidden="true"></video>
		{:else}
			<img src={poster} {alt} />
		{/if}
		<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" /></svg></span>
	</button>
	<div class="text">
		<h2 id="reel-{page}">{title}</h2>
		{#if summary}<p class="summary">{summary}</p>{/if}
		<button class="watch" onclick={watch}>Watch the reel</button>
	</div>
</section>

<!-- Keys stay inside (Escape closes this, not the station; F shouldn't flip the island underneath). -->
<dialog bind:this={dialog} onclose={() => (open = false)} onkeydown={(e) => e.stopPropagation()} aria-label={title}>
	{#if open}<iframe src={page} {title} onload={hook}></iframe>{/if}
	<!-- Not .close: the layout styles that class inside the column. -->
	<button class="shut" onclick={() => dialog.close()} aria-label="Close the reel">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</button>
</dialog>

<style>
	.reel {
		display: flex;
		gap: 16px;
		align-items: center;
		margin-top: 26px;
	}
	.preview {
		position: relative;
		flex: none;
		width: 38%;
		max-width: 180px;
		padding: 0;
		border: 0;
		border-radius: 10px;
		overflow: hidden;
		background: var(--line);
		cursor: pointer;
	}
	.preview video,
	.preview img {
		display: block;
		width: 100%;
		aspect-ratio: 9 / 16;
		object-fit: cover;
	}
	.preview:hover {
		outline: 2px solid var(--ember);
		outline-offset: 2px;
	}
	.play {
		position: absolute;
		right: 8px;
		bottom: 8px;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--paper) 88%, transparent);
		box-shadow: 0 2px 8px rgba(40, 25, 10, 0.25);
	}
	.play svg {
		width: 15px;
		height: 15px;
		margin-left: 2px;
		fill: var(--ink);
	}
	h2 {
		margin: 0;
		font: 600 19px/1.25 var(--font-display);
	}
	.summary {
		margin: 6px 0 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--muted);
	}
	.watch {
		margin-top: 14px;
		padding: 8px 14px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: none;
		color: inherit;
		font: 500 14px/1.2 var(--font-ui);
		cursor: pointer;
	}
	.watch:hover {
		border-color: var(--ember);
	}

	/* Full screen, over everything; the reel centres its own 9:16 stage. */
	dialog {
		width: 100vw;
		height: 100dvh;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: #1d2b53;
	}
	dialog::backdrop {
		background: rgba(10, 12, 30, 0.6);
	}
	iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
	}
	.shut {
		position: absolute;
		top: 14px;
		right: 16px;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		background: rgba(29, 43, 83, 0.75);
		color: white;
		cursor: pointer;
	}
	.shut svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
</style>
