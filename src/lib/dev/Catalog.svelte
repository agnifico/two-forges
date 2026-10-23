<!-- Dev-only model catalog: every Kenney model in the library, to tick the ones worth using.
     Picks save to docs/kenney-picks.json. Opened from the placement panel. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { buildings, decorKinds, packs, stationModels, type PackId } from '../scene/config';
	import { kindFiles } from '../scene/decor';
	import type { CatalogModel, CatalogPack, Picks } from './catalog-types';

	let { onclose }: { onclose: () => void } = $props();

	type Show = 'all' | 'picked' | 'unpicked' | 'in-use';

	let models = $state.raw<CatalogModel[]>([]);
	let packList = $state.raw<CatalogPack[]>([]);
	let picks = $state<Picks>({});
	let loading = $state(true);
	let search = $state('');
	let pack = $state('all');
	let show = $state<Show>('all');
	let status = $state('');

	// Models the site already uses, keyed like the catalog: `<pack folder>/<model>`.
	const key = (p: PackId, file: string) => `${packs[p].library}/${file}`;
	const inUse = new Set([
		...decorKinds.flatMap((k) => kindFiles(k.id).map((f) => key(f.pack, f.file))),
		...stationModels.flatMap((s) => s.props.flatMap((p) => ('pack' in p ? [key(p.pack, p.file)] : []))),
		...buildings.flatMap((b) => b.parts.map((p) => key(b.pack, p.file)))
	]);

	onMount(async () => {
		try {
			const res = await fetch('/__dev/catalog');
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as { packs: CatalogPack[]; models: CatalogModel[]; picks: Picks };
			models = data.models;
			packList = data.packs;
			picks = data.picks;
		} catch (err) {
			status = `Couldn't load the catalog: ${err instanceof Error ? err.message : err}`;
		}
		loading = false;
	});

	const visible = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return models.filter((m) => {
			if (pack !== 'all' && m.folder !== pack) return false;
			if (show === 'picked' && !picks[m.key]) return false;
			if (show === 'unpicked' && picks[m.key]) return false;
			if (show === 'in-use' && !inUse.has(m.key)) return false;
			if (!q) return true;
			return [m.name, m.description, m.category, ...(m.tags ?? [])].some((t) => t?.toLowerCase().includes(q));
		});
	});
	const pickedIn = (folder: string) => models.filter((m) => m.folder === folder && picks[m.key]).length;
	const pickedTotal = $derived(Object.keys(picks).length);

	let timer: ReturnType<typeof setTimeout> | undefined;
	const persist = () => {
		status = 'Saving…';
		clearTimeout(timer);
		timer = setTimeout(async () => {
			const res = await fetch('/__dev/picks', {
				method: 'POST',
				body: JSON.stringify({ picks: $state.snapshot(picks) })
			});
			status = res.ok ? 'Saved to docs/kenney-picks.json' : `Save failed: ${await res.text()}`;
		}, 500);
	};

	const toggle = (k: string) => {
		if (picks[k]) delete picks[k];
		else picks[k] = {};
		persist();
	};

	const setNote = (k: string, note: string) => {
		picks[k] = note.trim() ? { note: note.trim() } : {};
		persist();
	};

	const size = (m: CatalogModel) => (m.worldSize ? m.worldSize.map((v) => v.toFixed(1)).join(' × ') : '');
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !(e.target as HTMLElement).closest('input') && onclose()} />

<div class="catalog">
	<header>
		<strong>Model catalog</strong>
		<span class="count">{pickedTotal} picked of {models.length}</span>
		<input class="search" type="search" placeholder="Search names, tags, descriptions" bind:value={search} />
		<select bind:value={show}>
			<option value="all">All</option>
			<option value="picked">Picked</option>
			<option value="unpicked">Not picked</option>
			<option value="in-use">Already in use</option>
		</select>
		<span class="status">{status}</span>
		<button onclick={onclose}>Close <kbd>Esc</kbd></button>
	</header>

	<div class="body">
		<nav>
			<button class:active={pack === 'all'} onclick={() => (pack = 'all')}>
				All packs <em>{models.length}</em>
			</button>
			{#each packList as p (p.folder)}
				<button class:active={pack === p.folder} onclick={() => (pack = p.folder)}>
					{p.name} <em>{pickedIn(p.folder) ? `${pickedIn(p.folder)} / ` : ''}{p.count}</em>
				</button>
			{/each}
		</nav>

		<main>
			{#if loading}
				<p class="empty">Loading…</p>
			{:else if visible.length === 0}
				<p class="empty">Nothing matches.</p>
			{/if}
			<div class="grid">
				{#each visible as m (m.key)}
					<div class="card" class:picked={!!picks[m.key]} title={m.description ?? m.name}>
						<label>
							<input type="checkbox" checked={!!picks[m.key]} onchange={() => toggle(m.key)} />
							{#if m.preview}
								<img src={`/__dev/thumb/${m.folder}/${m.preview}`} alt="" loading="lazy" />
							{:else}
								<span class="noimg">no preview</span>
							{/if}
							<span class="name">{m.name}</span>
							<span class="meta">
								{pack === 'all' ? m.folder.replace(/^kenney_/, '') : ''}
								{size(m)}
							</span>
							{#if inUse.has(m.key)}<span class="badge">in use</span>{/if}
						</label>
						{#if picks[m.key]}
							<input
								class="note"
								placeholder="note: where / why"
								value={picks[m.key].note ?? ''}
								onchange={(e) => setNote(m.key, e.currentTarget.value)}
							/>
						{/if}
					</div>
				{/each}
			</div>
		</main>
	</div>
</div>

<style>
	.catalog {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		background: #f7f0e3;
		font: 13px/1.35 system-ui, sans-serif;
		color: #3b3128;
	}
	header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-bottom: 1px solid rgba(80, 60, 40, 0.15);
		background: #fffaf1;
	}
	.count,
	.status {
		font-size: 12px;
		opacity: 0.7;
	}
	.status {
		margin-left: auto;
	}
	.search {
		flex: 0 1 320px;
	}
	input,
	select,
	button {
		font: inherit;
		color: inherit;
		border: 1px solid rgba(80, 60, 40, 0.25);
		border-radius: 6px;
		background: #fff;
		padding: 4px 8px;
	}
	button {
		cursor: pointer;
	}
	kbd {
		font-size: 10px;
		opacity: 0.6;
	}
	.body {
		flex: 1;
		display: flex;
		min-height: 0;
	}
	nav {
		width: 220px;
		flex: none;
		overflow-y: auto;
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		border-right: 1px solid rgba(80, 60, 40, 0.12);
	}
	nav button {
		display: flex;
		justify-content: space-between;
		gap: 6px;
		text-align: left;
		text-transform: capitalize;
	}
	nav button.active {
		background: #3b3128;
		color: #fff8ee;
	}
	nav em {
		font-style: normal;
		opacity: 0.6;
		white-space: nowrap;
	}
	main {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
	}
	.empty {
		opacity: 0.6;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
		gap: 8px;
	}
	.card {
		background: #fff;
		border: 1px solid rgba(80, 60, 40, 0.15);
		border-radius: 8px;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.card.picked {
		border-color: #3b3128;
		box-shadow: 0 0 0 1px #3b3128;
		background: #fff6e4;
	}
	.card label {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		cursor: pointer;
		text-align: center;
	}
	.card label input {
		position: absolute;
		top: 0;
		left: 0;
		margin: 0;
	}
	.card img,
	.noimg {
		width: 96px;
		height: 96px;
		object-fit: contain;
	}
	.noimg {
		display: grid;
		place-items: center;
		font-size: 11px;
		opacity: 0.5;
	}
	.name {
		font-size: 12px;
		word-break: break-word;
	}
	.meta {
		font-size: 10px;
		opacity: 0.6;
	}
	.badge {
		position: absolute;
		top: 0;
		right: 0;
		font-size: 9px;
		padding: 1px 4px;
		border-radius: 4px;
		background: #5f9c4a;
		color: #fff;
	}
	.note {
		font-size: 11px;
		padding: 3px 5px;
	}
</style>
