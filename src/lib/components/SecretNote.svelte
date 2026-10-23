<!-- A secret's note: a small box floating above the decor piece it hides in. Closes with Esc (see the
     layout), its close button, or a click anywhere outside it. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { Secret } from '../content/types';
	import { isExternal } from '../content/urls';
	import type { IslandView } from './island-view.svelte';

	let { view, secret, onclose }: { view: IslandView; secret: Secret; onclose: () => void } = $props();

	let box: HTMLElement;
	let heading: HTMLElement;
	/** Keeps the box inside the stage, this far from its edges. */
	const MARGIN = 12;

	onMount(() => {
		heading.focus({ preventScroll: true });
		return view.onFrame(() => {
			const top = view.interaction?.secretTop(secret.id);
			const at = top && view.interaction?.toScreen(top);
			const stage = box.parentElement;
			if (!at || !stage) return;
			const x = Math.min(Math.max(at.x - box.offsetWidth / 2, MARGIN), stage.clientWidth - box.offsetWidth - MARGIN);
			// Above the piece if there's room, else below it.
			const above = at.y - box.offsetHeight - 16;
			const y = above >= MARGIN ? above : Math.min(at.y + 16, stage.clientHeight - box.offsetHeight - MARGIN);
			box.style.transform = `translate(${x}px, ${y}px)`;
		});
	});

	const onWindowPointerDown = (e: PointerEvent) => {
		if (!box.contains(e.target as Node)) onclose();
	};
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="note" role="dialog" aria-labelledby="secret-title" bind:this={box}>
	<button class="close" onclick={onclose} aria-label="Close note">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</button>
	<h2 id="secret-title" tabindex="-1" bind:this={heading}>{secret.title}</h2>
	<div class="text">{@html secret.html}</div>
	{#if secret.links.length}
		<p class="links">
			{#each secret.links as link (link.url)}
				<a href={link.url} target={isExternal(link.url) ? '_blank' : undefined} rel={isExternal(link.url) ? 'noopener' : undefined}
					>{link.label} →</a
				>
			{/each}
		</p>
	{/if}
</div>

<style>
	.note {
		position: absolute;
		left: 0;
		top: 0;
		width: min(260px, calc(100% - 24px));
		padding: 14px 16px 12px;
		border-radius: 12px;
		background: var(--paper);
		color: var(--ink);
		box-shadow: 0 10px 30px rgba(30, 20, 10, 0.22);
		font: 14px/1.5 var(--font-text);
		animation: rise 0.25s ease-out;
	}
	h2 {
		margin: 0 24px 6px 0;
		font: 600 15px/1.3 var(--font-display);
		outline: none;
	}
	.text :global(p) {
		margin: 0 0 6px;
	}
	.links {
		margin: 8px 0 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	a {
		color: var(--ember-ink);
		font-weight: 600;
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
	.close {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.close:hover {
		background: var(--line);
	}
	.close svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	@keyframes rise {
		from {
			opacity: 0;
			translate: 0 6px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.note {
			animation: none;
		}
	}
</style>
