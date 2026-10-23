<!-- Dev-only placement panel. Mounted by SceneCanvas under `vite dev` only. -->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { decorKinds, packs, type Layout } from '../scene/config';
	import { kindFiles } from '../scene/decor';
	import type { World } from '../scene/world';
	import Catalog from './Catalog.svelte';
	import { DRAG_TYPE, SIDE_KEY, startEditor, type Editor, type Mode, type SelectionInfo, type View } from './editor';

	let { world }: { world: World } = $props();

	let editor: Editor | undefined;
	let layout: Layout | undefined;
	let sideName = $state('forge');
	let destroyed = false;

	let selected = $state<SelectionInfo | null>(null);
	let mode = $state<Mode>('translate');
	let dirty = $state(false);
	let status = $state('');
	let open = $state(true);
	let catalogOpen = $state(false);
	let counts = $state<Record<string, number>>({});

	const countKinds = () => {
		const next: Record<string, number> = {};
		for (const p of layout?.decor ?? []) next[p.kind] = (next[p.kind] ?? 0) + 1;
		counts = next;
	};

	onMount(async () => {
		const handles = await world.ready;
		if (!handles || destroyed) return;
		// After a save on the war side, come back to it.
		if (sessionStorage.getItem(SIDE_KEY) === 'war' && (await world.flipReady)) await world.flip({ instant: true });
		sessionStorage.removeItem(SIDE_KEY);
		if (destroyed) return;
		const follow = () => {
			layout = handles.side().layout;
			sideName = handles.side().id;
			countKinds();
		};
		follow();
		handles.onSideChange(follow);
		ready = handles;
		if (devOn) startDev();
	});

	// Dev mode: the placement tool on, or off for the full visitor experience (the backtick key toggles).
	let ready: Awaited<typeof world.ready>;
	let devOn = $state(readDev());
	function readDev() {
		try {
			return localStorage.getItem('forge-dev') !== 'off';
		} catch {
			return true;
		}
	}
	function startDev() {
		if (!ready || editor) return;
		editor = startEditor(ready, {
			select: (info) => (selected = info),
			change: () => {
				dirty = true;
				status = '';
				countKinds();
			}
		});
		editor.restoreView();
		shapesOn = editor.shapes;
		editor.setHeight(heightOn);
	}
	function stopDev() {
		if (!editor) return;
		editor.view('iso');
		editor.dispose();
		editor = undefined;
		selected = null;
		shapesOn = false;
	}
	function toggleDev() {
		if (devOn && dirty && !confirm('Leave dev mode without saving your placement changes?')) return;
		devOn = !devOn;
		dirty = false;
		try {
			localStorage.setItem('forge-dev', devOn ? 'on' : 'off');
		} catch {
			// Private mode: the choice just isn't remembered.
		}
		if (devOn) startDev();
		else stopDev();
	}

	onDestroy(() => {
		destroyed = true;
		editor?.dispose();
	});

	const setMode = (next: Mode) => {
		mode = next;
		editor?.setMode(next);
	};

	const save = async () => {
		if (!editor) return;
		status = 'Saving…';
		try {
			await editor.save();
			dirty = false;
			status = 'Saved. Reloading…';
		} catch (err) {
			status = `Save failed: ${err instanceof Error ? err.message : err}`;
		}
	};

	const field = (key: 'x' | 'z' | 'rotationDeg' | 'scale') => (e: Event) => {
		const value = Number((e.currentTarget as HTMLInputElement).value);
		if (Number.isFinite(value)) editor?.setValues({ [key]: value });
	};

	const onKey = (e: KeyboardEvent) => {
		if ((e.target as HTMLElement).closest('input, textarea, select')) return;
		if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			toggleDev();
			return;
		}
		if (!editor || catalogOpen) return;
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			save();
			return;
		}
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		const key = e.key.toLowerCase();
		if (key === 'w') setMode('translate');
		else if (key === 'e') setMode('rotate');
		else if (key === 'r') setMode('scale');
		else if (key === 'd') editor.duplicate();
		else if (key === 't') toggleShapes();
		else if (key === 'delete' || key === 'backspace') editor.remove();
		else if (key === 'escape') editor.deselect();
		else if (key in viewKeys) editor.view(viewKeys[key]);
	};

	/** A kind's preview image; a composite shows its first part. */
	const thumb = (kindId: string) => {
		const [first] = kindFiles(kindId);
		const { library, previews = 'Previews/{file}.png' } = first ? packs[first.pack] : {};
		if (!first || !library) return '';
		return `/__dev/thumb/${library}/${previews.replace('{file}', first.file)}`;
	};
	const describe = (kindId: string) => kindFiles(kindId).map((f) => `${f.pack}/${f.file}`).join(' + ');

	const views: [View, string, string][] = [
		['iso', 'Iso', '1'],
		['top', 'Top', '2'],
		['front', 'Front', '3'],
		['side', 'Side', '4']
	];
	const viewKeys: Record<string, View> = Object.fromEntries(views.map(([v, , k]) => [k, v]));

	/** Open panel = editing with the free camera; collapsed = preview the visitor's camera. */
	const toggle = () => {
		open = !open;
		editor?.setFreeCamera(open);
	};

	let shapesOn = $state(false);
	let heightOn = $state(false);
	const toggleHeight = () => {
		heightOn = !heightOn;
		editor?.setHeight(heightOn);
	};
	const toggleShapes = () => {
		if (editor) shapesOn = editor.toggleShapes();
	};

	const modes: [Mode, string, string][] = [
		['translate', 'Move', 'W'],
		['rotate', 'Turn', 'E'],
		['scale', 'Scale', 'R']
	];
</script>

<svelte:window onkeydown={onKey} />

{#if catalogOpen}
	<Catalog onclose={() => (catalogOpen = false)} />
{/if}

<button class="dev-switch" class:on={devOn} onclick={toggleDev} title="Dev mode: the placement tool (`)">
	Dev {devOn ? 'on' : 'off'} <kbd>`</kbd>
</button>

{#if devOn}
<aside class="panel" class:closed={!open}>
	<header>
		<button class="toggle" onclick={toggle} aria-expanded={open} title={open ? 'Collapse to preview the visitor camera' : 'Edit'}>
			{open ? '›' : '‹ Placement'}
		</button>
		{#if open}
			<strong>Placement <span class="side">{sideName === 'war' ? 'war side' : 'forge'}</span></strong>
			<button onclick={() => (catalogOpen = true)} title="All Kenney models, to pick from">Catalog</button>
			<button class="save" onclick={save} disabled={!dirty}>{dirty ? 'Save ⌘S' : 'Saved'}</button>
		{/if}
	</header>

	{#if open}
		{#if status}<p class="status">{status}</p>{/if}

		<div class="modes">
			{#each views as [value, label, key] (value)}
				<button onclick={() => editor?.view(value)}>{label} <kbd>{key}</kbd></button>
			{/each}
		</div>
		<p class="hint">Free camera: drag to orbit, right-drag or Shift-drag to pan, scroll to zoom.</p>

		<div class="modes">
			{#each modes as [value, label, key] (value)}
				<button class:active={mode === value} onclick={() => setMode(value)}>{label} <kbd>{key}</kbd></button>
			{/each}
			<button class:active={shapesOn} onclick={toggleShapes} title="Edit tier and pond outlines">Shapes <kbd>T</kbd></button>
		</div>
		<label class="height">
			<input type="checkbox" checked={heightOn} onchange={toggleHeight} />
			Unlock height (Move gets an up/down handle)
		</label>

		<section class="selection">
			{#if selected}
				<h3>{selected.label}</h3>
				<div class="fields">
					<label>x <input type="number" step="0.1" value={selected.x} onchange={field('x')} /></label>
					<label>z <input type="number" step="0.1" value={selected.z} onchange={field('z')} /></label>
					{#if selected.rotationDeg !== null}
						<label>turn <input type="number" step="5" value={selected.rotationDeg} onchange={field('rotationDeg')} /></label>
					{/if}
					{#if selected.scale !== null}
						<label>scale <input type="number" step="0.05" min="0.05" value={selected.scale} onchange={field('scale')} /></label>
					{/if}
				</div>
				{#if selected.type === 'point'}
					<div class="actions">
						<button onclick={() => editor?.duplicate()}>Add point <kbd>D</kbd></button>
						<button onclick={() => editor?.remove()}>Delete <kbd>Del</kbd></button>
					</div>
				{:else if selected.type === 'decor'}
					<div class="actions">
						<button onclick={() => editor?.duplicate()}>Duplicate <kbd>D</kbd></button>
						<button onclick={() => editor?.remove()}>Delete <kbd>Del</kbd></button>
					</div>
				{/if}
			{:else}
				{#if shapesOn}
					<p class="hint">Shapes: drag the points of tier (white) and pond (blue) outlines. A pond point within about a unit of its tier's edge is cut onto it, and the water spills there. Saving rebuilds the terrain.</p>
				{:else}
					<p class="hint">Click a piece to select it. Drag a thumbnail onto the island to add one.</p>
				{/if}
			{/if}
		</section>

		<section class="kinds">
			{#each decorKinds as kind (kind.id)}
				<div
					class="kind"
					role="button"
					tabindex="0"
					draggable="true"
					title={describe(kind.id)}
					ondragstart={(e) => {
						e.dataTransfer?.setData(DRAG_TYPE, kind.id);
						if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
					}}
				>
					<img src={thumb(kind.id)} alt="" loading="lazy" draggable="false" />
					<span>{kind.id}</span>
					{#if counts[kind.id]}<em>{counts[kind.id]}</em>{/if}
				</div>
			{/each}
		</section>

		<p class="hint">Esc deselects. Saving rewrites the side's layout file (layout.ts or layout-war.ts). Collapse the panel to see the visitor camera.</p>
	{/if}
</aside>
{/if}

<style>
	.dev-switch {
		position: fixed;
		right: 12px;
		bottom: 12px;
		z-index: 11;
		padding: 4px 10px;
		border: 1px solid rgba(80, 60, 40, 0.25);
		border-radius: 999px;
		background: rgba(255, 251, 243, 0.9);
		color: #3b3128;
		font: 12px/1.3 system-ui, sans-serif;
		cursor: pointer;
	}
	.dev-switch.on {
		background: #3b3128;
		color: #fff8ee;
	}
	.dev-switch kbd {
		font-size: 10px;
		opacity: 0.6;
	}
	.height {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}
	.panel {
		position: fixed;
		top: 12px;
		right: 12px;
		/* Leaves room for the dev switch below it. */
		bottom: 48px;
		width: 330px;
		box-sizing: border-box;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px 12px;
		overflow-y: auto;
		background: rgba(255, 251, 243, 0.94);
		border: 1px solid rgba(80, 60, 40, 0.18);
		border-radius: 10px;
		box-shadow: 0 6px 24px rgba(60, 40, 20, 0.14);
		font: 13px/1.35 system-ui, sans-serif;
		color: #3b3128;
		z-index: 10;
	}
	.panel.closed {
		bottom: auto;
		width: auto;
		padding: 6px;
	}
	header {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	header strong {
		flex: 1;
	}
	.side {
		font-weight: normal;
		font-size: 11px;
		opacity: 0.6;
	}
	button {
		font: inherit;
		border: 1px solid rgba(80, 60, 40, 0.25);
		background: #fff;
		border-radius: 6px;
		padding: 4px 8px;
		cursor: pointer;
		color: inherit;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button.active,
	.save:not(:disabled) {
		background: #3b3128;
		color: #fff8ee;
	}
	.toggle {
		padding: 2px 8px;
	}
	kbd {
		font-size: 10px;
		opacity: 0.6;
	}
	.modes,
	.actions {
		display: flex;
		gap: 6px;
	}
	.modes button,
	.actions button {
		flex: 1;
	}
	.status {
		margin: 0;
		font-size: 12px;
	}
	.selection h3 {
		margin: 0 0 6px;
		font-size: 13px;
	}
	.fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-bottom: 8px;
	}
	.fields label {
		display: flex;
		flex-direction: column;
		font-size: 11px;
		opacity: 0.85;
	}
	.fields input {
		font: inherit;
		padding: 3px 5px;
		border: 1px solid rgba(80, 60, 40, 0.25);
		border-radius: 5px;
	}
	.hint {
		margin: 0;
		font-size: 12px;
		opacity: 0.7;
	}
	.kinds {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.kind {
		min-width: 0;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4px;
		background: #fff;
		border: 1px solid rgba(80, 60, 40, 0.15);
		border-radius: 6px;
		cursor: grab;
		font-size: 10px;
		text-align: center;
		word-break: break-word;
	}
	.kind img {
		width: 56px;
		height: 56px;
		object-fit: contain;
	}
	.kind em {
		position: absolute;
		top: 2px;
		right: 4px;
		font-style: normal;
		font-size: 10px;
		opacity: 0.6;
	}
</style>
