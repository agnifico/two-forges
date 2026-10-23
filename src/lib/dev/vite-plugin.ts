// Dev-server endpoints for the placement tool and the model catalog. Only active under `vite dev`
// (apply: 'serve'). Deliberately doesn't import the scene config: anything vite.config imports is
// watched, and saving layout.ts would then restart the dev server.

import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { CatalogModel, CatalogPack, Picks } from './catalog-types';
import { assertLayout, assertOutlines, layoutToSource, outlinesToSource } from './layout-file';

/** The shared Kenney library, for previews and the catalog. Override with KENNEY_LIBRARY. */
const LIBRARY = process.env.KENNEY_LIBRARY ?? join(homedir(), 'Documents/code/3DResources/kenney-models');
const FOLDER = /^kenney_[a-zA-Z0-9._-]+$/;
const SEGMENT = /^[a-zA-Z0-9._ ()-]+$/;
/** Where model files sit inside a pack, in order of preference. */
const MODEL_DIRS = ['Models/GLB format', 'Models/GLTF format'];

const exists = (path: string) =>
	access(path).then(
		() => true,
		() => false
	);

const readBody = async (req: IncomingMessage) => {
	let body = '';
	for await (const chunk of req) body += chunk;
	return body;
};

const respond = (res: ServerResponse, status: number, message = '') => {
	res.statusCode = status;
	res.end(message);
};

/** Scans every pack folder with 3D models; enriches entries from the library's _index when it has them. */
async function buildCatalog(): Promise<{ packs: CatalogPack[]; models: CatalogModel[] }> {
	type IndexModel = Omit<CatalogModel, 'key' | 'folder' | 'preview'> & { glb: string; pack: string };
	type IndexPack = { folder: string; name: string };
	let index: { models: IndexModel[]; packs: IndexPack[] } = { models: [], packs: [] };
	try {
		index = JSON.parse(await readFile(join(LIBRARY, '_index/index.json'), 'utf8'));
	} catch {
		// No index: the catalog still lists everything, just without descriptions.
	}
	const byGlb = new Map(index.models.map((m) => [m.glb, m]));
	const packNames = new Map(index.packs.map((p) => [p.folder, p.name]));

	const packs: CatalogPack[] = [];
	const models: CatalogModel[] = [];
	const folders = (await readdir(LIBRARY, { withFileTypes: true }))
		.filter((d) => d.isDirectory() && FOLDER.test(d.name))
		.map((d) => d.name)
		.sort();
	for (const folder of folders) {
		let dir: string | undefined;
		for (const candidate of MODEL_DIRS) {
			if (await exists(join(LIBRARY, folder, candidate))) {
				dir = candidate;
				break;
			}
		}
		if (!dir) continue; // no 3D models (e.g. the 2D isometric dungeon)
		const names = (await readdir(join(LIBRARY, folder, dir)))
			.filter((f) => f.endsWith('.glb'))
			.map((f) => f.slice(0, -4))
			.sort();
		if (names.length === 0) continue;
		for (const name of names) {
			let preview: string | null = null;
			for (const candidate of [`Previews/${name}.png`, `Isometric/${name}_SE.png`, `Side/${name}.png`]) {
				if (await exists(join(LIBRARY, folder, candidate))) {
					preview = candidate;
					break;
				}
			}
			const known = byGlb.get(`${folder}/${dir}/${name}.glb`);
			models.push({
				key: `${folder}/${name}`,
				folder,
				name,
				preview,
				category: known?.category,
				description: known?.description,
				tags: known?.tags,
				worldSize: known?.worldSize,
				triangles: known?.triangles
			});
		}
		const fallbackName = folder.replace(/^kenney_/, '').replace(/[-_]/g, ' ');
		packs.push({ folder, name: packNames.get(folder) ?? fallbackName, count: names.length });
	}
	return { packs, models };
}

export function placementTool(): Plugin {
	return {
		name: 'forge-placement-tool',
		apply: 'serve',
		configureServer(server) {
			const root = server.config.root;
			// One layout file per side of the island.
			const layoutFiles = {
				forge: resolve(root, 'src/lib/scene/layout.ts'),
				war: resolve(root, 'src/lib/scene/layout-war.ts')
			} as const;
			const picksFile = resolve(root, 'docs/kenney-picks.json');

			const readPicks = async (): Promise<Picks> => {
				try {
					return JSON.parse(await readFile(picksFile, 'utf8')).picks ?? {};
				} catch {
					return {};
				}
			};

			// POST /__dev/layout with { side, layout }: rewrites that side's layout file.
			server.middlewares.use('/__dev/layout', async (req, res) => {
				if (req.method !== 'POST') return respond(res, 405);
				try {
					const { side, layout } = JSON.parse(await readBody(req)) as { side: unknown; layout: unknown };
					if (side !== 'forge' && side !== 'war') throw new Error(`unknown side ${side}`);
					assertLayout(layout);
					await writeFile(layoutFiles[side], layoutToSource(layout, side));
					respond(res, 204);
				} catch (err) {
					respond(res, 400, String(err));
				}
			});

			// POST /__dev/outlines with the hand-shaped outlines: rewrites src/lib/scene/outlines.ts.
			server.middlewares.use('/__dev/outlines', async (req, res) => {
				if (req.method !== 'POST') return respond(res, 405);
				try {
					const edits: unknown = JSON.parse(await readBody(req));
					assertOutlines(edits);
					await writeFile(resolve(root, 'src/lib/scene/outlines.ts'), outlinesToSource(edits));
					respond(res, 204);
				} catch (err) {
					respond(res, 400, String(err));
				}
			});

			// GET /__dev/catalog: every model in the library, plus the current picks.
			server.middlewares.use('/__dev/catalog', async (_req, res) => {
				try {
					const catalog = await buildCatalog();
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ ...catalog, picks: await readPicks() }));
				} catch (err) {
					respond(res, 500, String(err));
				}
			});

			// POST /__dev/picks with { picks }: rewrites docs/kenney-picks.json (keys sorted for clean diffs).
			server.middlewares.use('/__dev/picks', async (req, res) => {
				if (req.method !== 'POST') return respond(res, 405);
				try {
					const { picks } = JSON.parse(await readBody(req)) as { picks: Picks };
					if (typeof picks !== 'object' || picks === null) throw new Error('no picks');
					const sorted: Picks = {};
					for (const key of Object.keys(picks).sort()) {
						const [folder, name, ...rest] = key.split('/');
						if (!FOLDER.test(folder) || !SEGMENT.test(name ?? '') || rest.length) throw new Error(`bad key ${key}`);
						const note = picks[key]?.note?.trim();
						sorted[key] = note ? { note } : {};
					}
					const file = {
						about: 'Kenney models picked for the site, from the dev catalog. Keys are <pack folder>/<model>.',
						picks: sorted
					};
					await writeFile(picksFile, JSON.stringify(file, null, '\t') + '\n');
					respond(res, 204);
				} catch (err) {
					respond(res, 400, String(err));
				}
			});

			// GET /__dev/thumb/<pack folder>/<model>.png (its Previews image), or
			// /__dev/thumb/<pack folder>/<path inside the pack>.png.
			server.middlewares.use('/__dev/thumb', async (req, res) => {
				const parts = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\//, '').split('/');
				const [folder, ...rest] = parts;
				if (!FOLDER.test(folder ?? '') || rest.length === 0 || !rest.every((p) => SEGMENT.test(p) && p !== '..')) {
					return respond(res, 404);
				}
				const path = rest.length === 1 ? join('Previews', rest[0]) : join(...rest);
				if (!path.endsWith('.png')) return respond(res, 404);
				try {
					const png = await readFile(join(LIBRARY, folder, path));
					res.setHeader('Content-Type', 'image/png');
					res.end(png);
				} catch {
					respond(res, 404);
				}
			});
		}
	};
}
