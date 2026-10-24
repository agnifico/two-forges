<!-- The skills panel: three tabs (at a glance, tech stack, miscellaneous skills), each with its own look.
     Shown on the cottage and on /simplified. Every tab is in the page, the others hidden, so the
     prerendered page reads (and indexes) whole and the opening tab shows without JavaScript.

     Hosts theme it with --sk-* properties; unset, it takes the island's (--ink, --muted, --line,
     --ember-ink, --font-ui, --font-display). --sk-highlight colours the item names (default: the ink). -->
<script lang="ts">
	import { skillsTabs, type Skills, type SkillsTab } from '../content/types';

	let { skills, open = 'glance' }: { skills: Skills; open?: SkillsTab } = $props();

	const names: Record<SkillsTab, { label: string; short: string }> = {
		glance: { label: 'At a glance', short: 'Glance' },
		stack: { label: 'Tech stack', short: 'Stack' },
		misc: { label: 'Misc skills', short: 'Misc' }
	};

	const uid = $props.id();
	// svelte-ignore state_referenced_locally
	let current = $state(open);
	const at = $derived(skillsTabs.indexOf(current));
	const buttons: HTMLButtonElement[] = [];

	// Arrow keys move along the tabs (and wrap), Home and End jump to the ends.
	function onkeydown(event: KeyboardEvent) {
		const n = skillsTabs.length;
		const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[event.key];
		if (to === undefined) return;
		event.preventDefault();
		current = skillsTabs[(to + n) % n];
		buttons[(to + n) % n].focus();
	}

	const two = (n: number) => String(n).padStart(2, '0');

	// Miscellaneous skills: an accordion. A note opens on hover (where there is one) or on a tap, one at a time.
	let opened = $state(-1);

	// When the open tab outgrows a fixed height (as on /simplified), a drawn scroll track shows where
	// you are, and the bottom fades while there is more below. Drawn, not the browser's, since macOS
	// hides scrollbars until you scroll.
	let body: HTMLElement;
	let bar = $state({ show: false, top: 0, size: 1, more: false });
	function measure() {
		const el = body?.querySelector<HTMLElement>('[role=tabpanel]:not([hidden])');
		if (!el) return;
		const { scrollTop, scrollHeight, clientHeight } = el;
		bar = {
			show: scrollHeight > clientHeight + 1,
			top: scrollTop / scrollHeight,
			size: clientHeight / scrollHeight,
			more: scrollTop + clientHeight < scrollHeight - 1
		};
	}
	$effect(() => {
		void current;
		measure();
		// The panel's content changes height as notes open, so watch that too.
		const observer = new ResizeObserver(measure);
		observer.observe(body);
		for (const panel of body.querySelectorAll('[role=tabpanel] > *')) observer.observe(panel);
		return () => observer.disconnect();
	});
</script>

<section class="skills" aria-label="Skills">
	<div class="tabs" role="tablist" aria-label="Skills" style:--at={at}>
		{#each skillsTabs as tab, i (tab)}
			<button
				role="tab"
				id="{uid}-{tab}-tab"
				aria-label={names[tab].label}
				aria-selected={tab === current}
				aria-controls="{uid}-{tab}"
				tabindex={tab === current ? 0 : -1}
				bind:this={buttons[i]}
				onclick={() => (current = tab)}
				{onkeydown}
			>
				<span class="long">{names[tab].label}</span><span class="short">{names[tab].short}</span>
			</button>
		{/each}
		<span class="rail" aria-hidden="true"></span>
	</div>

	<div class="body" class:more={bar.more} bind:this={body}>
		<!-- At a glance: what I do, numbered, one line of scope under each. -->
		<div class="panel" role="tabpanel" id="{uid}-glance" aria-labelledby="{uid}-glance-tab" hidden={current !== 'glance'} onscroll={measure}>
			<ol class="glance">
				{#each skills.glance as item, i (item.title)}
					<li>
						<span class="idx" aria-hidden="true">{two(i + 1)}</span>
						<span class="what">
							<strong>{item.title}</strong>
							{#if item.scope}<span>{item.scope}</span>{/if}
						</span>
					</li>
				{/each}
			</ol>
		</div>

		<!-- Tech stack: brand-coloured tags in groups. -->
		<div class="panel" role="tabpanel" id="{uid}-stack" aria-labelledby="{uid}-stack-tab" hidden={current !== 'stack'} onscroll={measure}>
			{#each skills.stack as group, g (group.title)}
				<section class="group" aria-labelledby="{uid}-group-{g}">
					<h3 id="{uid}-group-{g}"><span>{group.title}</span><span class="leader" aria-hidden="true"></span></h3>
					<ul class="tags">
						{#each group.tags as tag (tag.label)}
							<li style:--tag={tag.color} style:--tag-ink={tag.text}>
								{#if tag.icon}<svg viewBox="0 0 24 24" aria-hidden="true"><path d={tag.icon} /></svg>{/if}{tag.label}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<!-- Miscellaneous skills: the rest of the toolbelt by name, each opening onto a note in my own words. -->
		<div class="panel" role="tabpanel" id="{uid}-misc" aria-labelledby="{uid}-misc-tab" hidden={current !== 'misc'} onscroll={measure}>
			<p class="lede">Elsewhere in the toolbelt</p>
			<ul class="misc">
				{#each skills.misc as item, i (item.title)}
					<li class:open={opened === i}>
						{#if item.note}
							<button aria-expanded={opened === i} aria-controls="{uid}-misc-{i}" onclick={() => (opened = opened === i ? -1 : i)}>
								<strong>{item.title}</strong><span class="sign" aria-hidden="true"></span>
							</button>
							<div class="note" id="{uid}-misc-{i}"><div><p>{item.note}</p></div></div>
						{:else}
							<strong class="name">{item.title}</strong>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if bar.show}
			<span class="track" aria-hidden="true"><span class="thumb" style:top="{bar.top * 100}%" style:height="{bar.size * 100}%"></span></span>
		{/if}
	</div>
</section>

<style>
	.skills {
		--_ink: var(--sk-ink, var(--ink));
		--_muted: var(--sk-muted, var(--muted));
		--_line: var(--sk-line, var(--line));
		--_accent: var(--sk-accent, var(--ember-ink));
		--_label: var(--sk-label-font, var(--font-ui));
		--_title: var(--sk-title-font, var(--font-display));
		--_note: var(--sk-note-font, var(--font-ui));
		--_hi: var(--sk-highlight, var(--_ink));
		display: flex;
		flex-direction: column;
		min-height: 0;
		container-type: inline-size;
		color: var(--_ink);
	}

	/* Tabs: three equal columns over a hairline, the open one marked by a rail that slides under it. */
	.tabs {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		flex: none;
		border-bottom: 1px solid var(--_line);
		outline: none;
	}
	.tabs button {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
		padding: 4px 2px 10px;
		border: 0;
		background: none;
		color: var(--_muted);
		font: 600 var(--sk-tab-size, 12px) / 1.2 var(--_label);
		letter-spacing: var(--sk-tab-spacing, 0.1em);
		text-transform: uppercase;
		white-space: nowrap;
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.tabs button:hover,
	.tabs button[aria-selected='true'] {
		color: var(--_ink);
	}
	.tabs button:focus-visible {
		outline: 2px solid var(--_accent);
		outline-offset: -2px;
		border-radius: 4px;
	}
	.short {
		display: none;
	}
	.rail {
		position: absolute;
		left: 0;
		bottom: -1px;
		width: calc(100% / 3);
		height: 2px;
		background: var(--_accent);
		transform: translateX(calc(var(--at) * 100%));
		transition: transform 0.3s cubic-bezier(0.65, 0, 0.35, 1);
	}
	/* Narrow: the short names. */
	@container (max-width: 300px) {
		.long {
			display: none;
		}
		.short {
			display: inline;
		}
	}

	.body {
		position: relative;
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}
	.panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		padding-top: 16px;
		overflow-y: auto;
		/* Scrolling past the end stays here, so a snapping page behind doesn't jump to its next panel. */
		overscroll-behavior: contain;
		scrollbar-width: none;
		animation: enter 0.3s ease-out;
	}
	.panel[hidden] {
		display: none;
	}
	.more .panel {
		mask-image: linear-gradient(to bottom, #000 calc(100% - 32px), transparent);
	}
	.track {
		position: absolute;
		top: 16px;
		right: -12px;
		bottom: 0;
		width: 3px;
		border-radius: 2px;
		background: var(--_line);
		pointer-events: none;
	}
	.thumb {
		position: absolute;
		left: 0;
		width: 100%;
		border-radius: 2px;
		background: var(--_accent);
	}

	/* At a glance: quiet numbers down the left, the work and its scope beside them. Given a fixed
	   height (as on /simplified), the rows share it evenly. */
	.glance {
		display: flex;
		flex-direction: column;
		flex: 1;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.glance li {
		display: grid;
		grid-template-columns: auto 1fr;
		align-content: center;
		align-items: baseline;
		flex: 1;
		column-gap: 14px;
		padding: 9px 0;
		border-bottom: 1px dashed var(--_line);
	}
	.glance li:last-child {
		border-bottom: 0;
	}
	.idx {
		width: 1.6em;
		font: 600 13px/1 var(--_label);
		color: var(--_accent);
		opacity: 0.55;
		transition: opacity 0.2s ease;
	}
	.glance li:hover .idx {
		opacity: 1;
	}
	.what {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}
	.what strong {
		font: 600 var(--sk-title-size, 17px) / 1.25 var(--_title);
		color: var(--_hi);
	}
	.what span {
		font: var(--sk-note-size, 13px) / 1.45 var(--_note);
		color: var(--_muted);
	}

	/* Tech stack: each group headed by its name and a dotted rule to the edge. */
	.group + .group {
		margin-top: 18px;
	}
	.group h3 {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin: 0 0 9px;
		font: 600 11px/1.2 var(--_label);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--_muted);
	}
	.leader {
		flex: 1;
		border-bottom: 1px dotted var(--_line);
		transform: translateY(-3px);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tags li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 26px;
		padding: 0 9px;
		border-radius: 5px;
		background: var(--tag);
		color: var(--tag-ink);
		font: 500 13px/1 var(--sk-tag-font, var(--font-ui));
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18);
		transition: transform 0.15s ease;
	}
	.tags li:hover {
		transform: translateY(-1px);
	}
	.tags svg {
		width: 14px;
		height: 14px;
		fill: currentColor;
	}

	/* Miscellaneous skills: names down an accent stroke; a note slides open under its name. */
	.lede {
		margin: 0 0 8px;
		font: italic 400 15px/1.3 var(--_title);
		color: var(--_muted);
	}
	.misc {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.misc li {
		padding-left: 12px;
		border-left: 2px solid var(--_line);
		transition: border-color 0.2s ease;
	}
	.misc button,
	.name {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		width: 100%;
		padding: 7px 0;
		border: 0;
		background: none;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.misc button:focus-visible {
		outline: 2px solid var(--_accent);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.misc strong {
		font: 600 14px/1.3 var(--_label);
		color: var(--_hi);
	}
	/* A plus that flattens to a minus while its note is open. */
	.sign {
		position: relative;
		flex: none;
		width: 9px;
		height: 9px;
		color: var(--_muted);
	}
	.sign::before,
	.sign::after {
		content: '';
		position: absolute;
		inset: 4px 0;
		background: currentColor;
		transition: transform 0.25s ease;
	}
	.sign::after {
		transform: rotate(90deg);
	}
	.note {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.25s ease;
	}
	.note > div {
		min-height: 0;
		overflow: hidden;
	}
	.note p {
		margin: 0;
		padding-bottom: 8px;
		font: var(--sk-note-size, 13px) / 1.5 var(--_note);
		color: var(--_muted);
	}
	.misc li.open,
	.misc li:has(:focus-visible) {
		border-left-color: var(--_accent);
	}
	.misc li.open .note,
	.misc li:has(:focus-visible) .note {
		grid-template-rows: 1fr;
	}
	.misc li.open .sign::after,
	.misc li:has(:focus-visible) .sign::after {
		transform: rotate(0deg);
	}
	/* Mouse and trackpad: hovering a name opens its note too. */
	@media (hover: hover) {
		.misc li:hover {
			border-left-color: var(--_accent);
		}
		.misc li:hover .note {
			grid-template-rows: 1fr;
		}
		.misc li:hover .sign::after {
			transform: rotate(0deg);
		}
	}

	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.panel {
			animation: none;
		}
		.rail,
		.note,
		.sign::before,
		.sign::after {
			transition: none;
		}
	}
</style>
