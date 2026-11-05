<!-- A project's card over the page: the island's own card (Carousel.svelte), in this page's colours.
     Esc, the × or a click outside closes it. -->
<script lang="ts">
	import Carousel from '#lib/components/Carousel.svelte';
	import type { Carousel as CarouselData } from '#lib/content/types.ts';

	let { card, start = 0, onclose }: { card: CarouselData | null; start?: number; onclose: () => void } = $props();

	let dialog: HTMLDialogElement;
	// Before the DOM updates, so the card mounts into an open dialog and can measure itself.
	$effect.pre(() => {
		const open = card !== null; // read first, so the effect tracks it even before the dialog exists
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
	// A click on the backdrop lands on the dialog itself.
	const onclick = (e: MouseEvent) => e.target === dialog && dialog.close();
</script>

<dialog bind:this={dialog} {onclick} onclose={onclose} aria-label={card?.title}>
	{#if card}
		{#key card}
			<div class="sheet">
				<button class="close" onclick={() => dialog.close()} aria-label="Close">×</button>
				<Carousel carousel={card} {start} />
			</div>
		{/key}
	{/if}
</dialog>

<style>
	dialog {
		width: min(760px, calc(100vw - 32px));
		max-height: calc(100dvh - 32px);
		padding: 0;
		border: 0;
		background: none;
		overflow: visible;
		/* The card's colours, from this page's theme. */
		--paper: var(--surface);
		--line: var(--accent-soft);
		--ink: var(--text);
		--muted: var(--text-muted);
		--ember: var(--accent);
		--ember-ink: var(--accent-text);
		--ember-line: var(--accent-dim);
		--focus: var(--accent-text);
		--chip-hover: var(--surface-raised);
		--font-display: var(--font-body);
		--font-ui: var(--font-mono);
		color: var(--text);
		font-family: var(--font-body);
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(3px);
	}
	.sheet {
		position: relative;
	}
	.sheet :global(.carousel) {
		margin: 0;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
	}
	.close {
		position: absolute;
		top: -14px;
		right: -14px;
		z-index: 1;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1px solid var(--accent-soft);
		border-radius: 50%;
		background: var(--surface-raised);
		color: var(--text);
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
	}
	.close:hover {
		border-color: var(--accent);
	}
	@media (max-width: 600px) {
		.close {
			top: 8px;
			right: 8px;
		}
	}
</style>
