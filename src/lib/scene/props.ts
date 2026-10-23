import {
	Box3,
	Color,
	Group,
	InstancedMesh,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	TextureSource,
	SRGBColorSpace,
	Vector3,
	type Material,
	type MeshToonMaterial,
	type Object3D,
	type Texture
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { asset } from '$app/paths';
import {
	buildings,
	decorKinds,
	landmarks,
	packs,
	personHeight,
	slots,
	stationModels,
	type Edge,
	type PackId,
	type Repaint,
	type StationId
} from './config';
import { createDecorLayer, kindFiles, kindScale, type DecorLayer } from './decor';
import type { Materials } from './materials';
import type { Rng } from './rng';
import { buildLife } from './life';
import { buildShape } from './shapes';
import type { SideConfig } from './sides';
import type { Island } from './terrain';
import { wallRunPlacements } from './walls';

/**
 * A file in static/, under the base path. Not page-relative: station pages sit deeper (/forge/furnace).
 * The paths are built at runtime, so they can't be checked against static/'s file list.
 */
const staticUrl = (path: string) => asset(path as Parameters<typeof asset>[0]);

const modelUrl = (pack: PackId, file: string) => staticUrl(`${packs[pack].dir ?? `models/kenney/${pack}`}/${file}.glb`);
/** Non-Kenney models, served from static/models/other. */
const otherUrl = (file: string) => staticUrl(`models/other/${file}.glb`);

/** Turn that makes a kit part's +x side face each edge. */
const EDGE_TURN: Record<Edge, number> = {
	'+x': 0,
	'-z': Math.PI / 2,
	'-x': Math.PI,
	'+z': -Math.PI / 2
};

/** Pack units to world units, so the pack's characters stand `personHeight` tall. */
const packScale = (pack: PackId) => personHeight / packs[pack].personHeight;

export interface Props {
	group: Group;
	/** Stations that now have a model (their slot discs can go). */
	stations: StationId[];
	/** Each placed station's root object. */
	stationObjects: Map<StationId, Object3D>;
	/** Editable decor, from the side's layout. */
	decor: DecorLayer;
	/** Moves a station's object to match its layout entry. */
	placeStation(id: StationId): void;
	/** Loads a decor kind this side doesn't use yet (for the placement tool); false if it failed. */
	loadKind(kindId: string): Promise<boolean>;
	/** Runs fire, smoke, water and night lights; `night` is 0 (day) to 1 (night). */
	tick(time: number, night: number): void;
	dispose(): void;
}

/**
 * Loads one side's station models, building parts and decor models (only those the side uses), once
 * each, switches them to toon shading and places them where the side's layout says. A station with
 * a missing file is skipped with a warning, so it keeps its disc.
 */
export async function loadProps(
	side: SideConfig,
	materials: Materials,
	rng: Rng,
	island: Island
): Promise<Props> {
	const { layout } = side;
	const { groundHeight } = island;
	const onSide = <T extends { station: StationId }>(list: T[]) =>
		list.filter((s) => side.stations.includes(s.station));
	const sideStationModels = onSide(stationModels);
	const sideBuildings = onSide(buildings);
	const kindById = new Map(decorKinds.map((k) => [k.id, k]));

	// Castle walls: generated from the wall runs until the layout holds wall pieces of its own (after
	// the first save on this side). Generated pieces join the working layout, so they are editable and
	// the next save writes them out.
	const wallKinds = new Set(side.wallRuns.flatMap((r) => [r.wall, r.tower]));
	if (wallKinds.size && !layout.decor.some((p) => wallKinds.has(p.kind))) {
		const tierTop = new Map(side.tiers.map((t) => [t.id, t.top]));
		for (const run of side.wallRuns) {
			layout.decor.push(...wallRunPlacements(run, island, tierTop.get(run.tier) ?? 0));
		}
	}

	const usedKinds = new Set(layout.decor.map((p) => p.kind));
	// Toppers (a tower's crown) load with the kinds that carry them.
	for (const id of [...usedKinds]) {
		const topper = kindById.get(id)?.topper;
		if (topper) usedKinds.add(topper.kind);
	}
	const sideLandmarks = side.id === 'forge' ? landmarks : [];

	const kindUrls = (id: string) => kindFiles(id).map((f) => modelUrl(f.pack, f.file));
	const urls = new Set([
		...sideStationModels.flatMap((s) =>
			s.props.flatMap((p) => ('pack' in p ? [modelUrl(p.pack, p.file)] : 'kind' in p ? kindUrls(p.kind) : []))
		),
		...sideBuildings.flatMap((b) => b.parts.map((p) => modelUrl(b.pack, p.file))),
		...[...usedKinds].flatMap(kindUrls),
		...sideLandmarks.map((l) => otherUrl(l.file))
	]);
	const recutsByUrl = new Map(
		(Object.entries(packs) as [PackId, (typeof packs)[PackId]][]).flatMap(([pack, cfg]) =>
			(cfg.recuts ?? []).flatMap((recut) => recut.files.map((file) => [modelUrl(pack, file), recut] as const))
		)
	);
	const swapsByUrl = new Map(
		(Object.entries(packs) as [PackId, (typeof packs)[PackId]][]).flatMap(([pack, cfg]) =>
			(cfg.swaps ?? []).flatMap((swap) => swap.files.map((file) => [modelUrl(pack, file), swap.areas] as const))
		)
	);
	const loader = new GLTFLoader();
	const sources = new Map<string, Object3D>();
	const load = async (url: string) => {
		if (sources.has(url)) return true;
		try {
			const scene = (await loader.loadAsync(url)).scene;
			const swap = swapsByUrl.get(url);
			if (swap) swapSwatches(scene, swap);
			const recut = recutsByUrl.get(url);
			if (recut) recutThin(scene, recut);
			sources.set(url, scene);
			return true;
		} catch (err) {
			console.warn(`Model ${url} failed to load.`, err);
			return false;
		}
	};
	await Promise.all([...urls].map(load));

	const group = new Group();
	group.name = 'props';
	const stationObjects = new Map<StationId, Object3D>();
	/** Props that keep turning (a waterwheel). */
	const spinners: { object: Object3D; axis: 'x' | 'y' | 'z'; rpm: number }[] = [];
	const toon = createToonCache(materials);

	/** Stands a station on its spot, turned. Kenney models and shapes sit on y = 0. */
	const placeStation = (id: StationId) => {
		const object = stationObjects.get(id);
		const slot = slots.find((s) => s.id === id);
		if (!object || !slot) return;
		const placement = layout.stations[id];
		if (!placement) return;
		const { at, rotationDeg } = placement;
		object.rotation.y = MathUtils.degToRad(rotationDeg);
		object.scale.setScalar(placement.scale ?? 1);
		object.position.set(at[0], (groundHeight(at[0], at[1]) ?? 0) + (placement.lift ?? 0), at[1]);
	};
	const addStation = (id: StationId, object: Object3D) => {
		object.name = `station-${id}`;
		object.userData.station = id;
		stationObjects.set(id, object);
		placeStation(id);
		group.add(object);
	};

	/** Toon-shaded model per decor kind, in its pack's units (kindScale takes it to world units). */
	const decorModels = new Map<string, Object3D>();
	/** Builds a kind's model from its file, or a composite's from its parts; false if a file is missing. */
	const prepareKind = (id: string): boolean => {
		if (decorModels.has(id)) return true;
		const kind = kindById.get(id);
		if (!kind) return false;
		let model: Object3D;
		if ('file' in kind) {
			const source = sources.get(modelUrl(kind.pack, kind.file));
			if (!source) return false;
			model = source.clone();
			toon.apply(model, kind.pack, kind.tint, kind.brighten, kind.repaint);
		} else {
			model = new Group();
			for (const part of kind.parts) {
				let piece: Object3D;
				/** The part's units to the composite's. */
				let scale: number;
				if ('file' in part) {
					const pack = part.pack ?? kind.pack;
					const source = sources.get(modelUrl(pack, part.file));
					if (!source) return false;
					piece = source.clone();
					toon.apply(piece, pack, kind.tint, kind.brighten, part.repaint ?? (pack === kind.pack ? kind.repaint : undefined));
					scale = packScale(pack) / packScale(kind.pack);
				} else {
					if (!prepareKind(part.kind)) return false;
					piece = decorModels.get(part.kind)!.clone();
					// Kit size, not the kind's own `scale` (that's for placing it alone), so parts stay on the grid.
					scale = packScale(kindById.get(part.kind)!.pack) / packScale(kind.pack);
				}
				if (part.spin) {
					// The part turns inside a holder that carries its placement (see decor.ts).
					piece.userData.spin = part.spin;
					piece = new Group().add(piece);
				}
				piece.scale.multiplyScalar(scale);
				const partScale = part.scale ?? 1;
				if (typeof partScale === 'number') piece.scale.multiplyScalar(partScale);
				else piece.scale.multiply(new Vector3(...partScale));
				piece.position.set(...(part.offset ?? ([0, 0, 0] as const)));
				piece.rotation.y = MathUtils.degToRad(part.rotationDeg ?? 0);
				model.add(piece);
			}
		}
		model.updateMatrixWorld(true);
		decorModels.set(kind.id, model);
		return true;
	};

	for (const cfg of sideStationModels) {
		const missing = cfg.props.filter((p) =>
			'pack' in p ? !sources.has(modelUrl(p.pack, p.file)) : 'kind' in p && !prepareKind(p.kind)
		);
		if (missing.length > 0) {
			console.warn(`The ${cfg.station} is missing ${missing.length} model(s); keeping its disc.`);
			continue;
		}
		const station = new Group();
		for (const prop of cfg.props) {
			let object: Object3D;
			if ('pack' in prop) {
				object = sources.get(modelUrl(prop.pack, prop.file))!.clone();
				toon.apply(object, prop.pack);
				if (prop.recolor) toon.recolor(object, prop.recolor.material, prop.recolor.color);
				object.scale.setScalar(packScale(prop.pack));
			} else if ('kind' in prop) {
				object = decorModels.get(prop.kind)!.clone();
				object.scale.setScalar(kindScale(kindById.get(prop.kind)!));
			} else {
				object = buildShape(prop.shape, materials);
			}
			const scale = prop.scale ?? 1;
			if (typeof scale === 'number') object.scale.multiplyScalar(scale);
			else object.scale.multiply(new Vector3(...scale));
			object.position.set(...(prop.offset ?? ([0, 0, 0] as const)));
			object.rotation.y = MathUtils.degToRad(prop.rotationDeg ?? 0);
			if (prop.spin) spinners.push({ object, ...prop.spin });
			station.add(object);
		}
		addStation(cfg.station, station);
	}

	for (const cfg of sideBuildings) {
		const missing = cfg.parts.filter((p) => !sources.has(modelUrl(cfg.pack, p.file)));
		if (missing.length > 0) {
			console.warn(`The ${cfg.station} is missing ${missing.length} part(s); keeping its disc.`);
			continue;
		}
		// The parts are scaled inside a holder, so the station root stays at scale 1.
		const parts = new Group();
		for (const part of cfg.parts) {
			const piece = sources.get(modelUrl(cfg.pack, part.file))!.clone();
			piece.position.set(part.cell[0], part.level, part.cell[1]);
			piece.rotation.y =
				part.turnDeg !== undefined ? MathUtils.degToRad(part.turnDeg) : EDGE_TURN[part.edge ?? '+x'];
			parts.add(piece);
		}
		toon.apply(parts, cfg.pack);
		parts.scale.setScalar(packScale(cfg.pack) * (cfg.scale ?? 1));
		const building = new Group();
		building.add(parts);
		addStation(cfg.station, building);
	}

	for (const id of usedKinds) prepareKind(id);
	const decor = createDecorLayer(layout, decorModels, groundHeight, rng);
	group.add(decor.group);

	for (const cfg of sideLandmarks) {
		const source = sources.get(otherUrl(cfg.file));
		if (!source) continue;
		const model = source.clone();
		const material = toon.solid(cfg.color);
		model.traverse((o) => {
			if (!(o instanceof Mesh)) return;
			o.material = material;
			o.castShadow = true;
			o.receiveShadow = true;
		});
		// Imported models come in any unit and orientation: centre it, stand its base on y = 0 and
		// scale its largest horizontal size to `width`.
		const box = new Box3().setFromObject(model);
		const size = box.getSize(new Vector3());
		const centre = box.getCenter(new Vector3());
		model.position.set(-centre.x, -box.min.y, -centre.z);
		const holder = new Group();
		holder.name = `landmark-${cfg.file}`;
		holder.add(model);
		holder.scale.setScalar(cfg.width / Math.max(size.x, size.z));
		holder.rotation.y = MathUtils.degToRad(cfg.rotationDeg);
		const [x, z] = cfg.at;
		holder.position.set(x, (groundHeight(x, z) ?? 0) - cfg.sink, z);
		group.add(holder);
	}

	// Fire, smoke, lights, water: attached to stations and decor once everything is placed.
	const life = buildLife(side, island, stationObjects, layout, materials, rng);
	group.add(life.group);

	const loadKind = async (id: string): Promise<boolean> => {
		if (decorModels.has(id)) return true;
		const kind = kindById.get(id);
		if (!kind || (await Promise.all(kindUrls(id).map(load))).includes(false)) return false;
		if (kind.topper && !(await loadKind(kind.topper.kind))) return false;
		return prepareKind(id);
	};

	return {
		group,
		stations: [...stationObjects.keys()],
		stationObjects,
		decor,
		placeStation,
		loadKind,
		tick(time, night) {
			life.tick(time, night);
			decor.tick(time);
			for (const { object, axis, rpm } of spinners) object.rotation[axis] = (time / 60_000) * rpm * Math.PI * 2;
		},
		dispose() {
			life.dispose();
			decor.dispose();
			// Covers shape geometry. Model clones share geometry with their sources (disposed below);
			// disposing a geometry twice is harmless. Shape materials belong to `materials`.
			group.traverse((o) => {
				if (o instanceof Mesh && !(o instanceof InstancedMesh)) o.geometry.dispose();
			});
			for (const source of sources.values()) {
				source.traverse((o) => {
					if (!(o instanceof Mesh)) return;
					o.geometry.dispose();
					for (const m of [o.material].flat() as MeshStandardMaterial[]) {
						m.map?.dispose();
						m.dispose();
					}
				});
			}
			toon.dispose();
		}
	};
}

/** Moves UVs in either block of swatches onto the matching spot in the other (see PackConfig.swaps). */
function swapSwatches(root: Object3D, [a, b]: [Repaint['area'], Repaint['area']]) {
	root.traverse((o) => {
		if (!(o instanceof Mesh)) return;
		const material = [o.material].flat()[0] as MeshStandardMaterial;
		const size = (material.map?.image as { width: number } | undefined)?.width;
		const uv = o.geometry.getAttribute('uv');
		if (!size || !uv) return;
		const inside = ([x, y, w, h]: Repaint['area'], u: number, v: number) => u >= x && u < x + w && v >= y && v < y + h;
		for (let i = 0; i < uv.count; i++) {
			const u = uv.getX(i) * size;
			const v = uv.getY(i) * size;
			const [from, to] = inside(a, u, v) ? [a, b] : inside(b, u, v) ? [b, a] : [];
			if (!from || !to) continue;
			uv.setXY(i, (u - from[0] + to[0]) / size, (v - from[1] + to[1]) / size);
		}
		uv.needsUpdate = true;
	});
}

/** Moves the UVs of thin pieces in one swatch block onto another (see PackConfig.recuts). */
function recutThin(
	root: Object3D,
	{ from, to, thinnerThan }: { from: Repaint['area']; to: Repaint['area']; thinnerThan: number }
) {
	root.traverse((o) => {
		if (!(o instanceof Mesh)) return;
		const material = [o.material].flat()[0] as MeshStandardMaterial;
		const size = (material.map?.image as { width: number } | undefined)?.width;
		const uv = o.geometry.getAttribute('uv');
		const position = o.geometry.getAttribute('position');
		const index = o.geometry.getIndex();
		if (!size || !uv || !index) return;
		const [x, y, w, h] = from;
		const inside = (i: number) => {
			const u = uv.getX(i) * size;
			const v = uv.getY(i) * size;
			return u >= x && u < x + w && v >= y && v < y + h;
		};
		// Triangles in the block, grouped into pieces by shared vertex positions.
		const key = (i: number) => `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
		const parent = new Map<string, string>();
		const find = (k: string): string => {
			while (parent.get(k) !== k) k = parent.get(k)!;
			return k;
		};
		const tris: number[][] = [];
		for (let t = 0; t < index.count; t += 3) {
			const vs = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
			if (!vs.every(inside)) continue;
			tris.push(vs);
			const [a, b, c] = vs.map(key);
			for (const k of [a, b, c]) if (!parent.has(k)) parent.set(k, k);
			parent.set(find(b), find(a));
			parent.set(find(c), find(a));
		}
		const pieces = new Map<string, Set<number>>();
		for (const vs of tris) {
			const root = find(key(vs[0]));
			if (!pieces.has(root)) pieces.set(root, new Set());
			for (const v of vs) pieces.get(root)!.add(v);
		}
		const du = (to[0] - x) / size;
		const dv = (to[1] - y) / size;
		for (const vertices of pieces.values()) {
			const xs = [...vertices].map((i) => position.getX(i));
			const zs = [...vertices].map((i) => position.getZ(i));
			const thickness = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
			if (thickness >= thinnerThan) continue;
			for (const i of vertices) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
		}
		uv.needsUpdate = true;
	});
}

/** A copy of a Kenney colour map with blocks of swatches repainted (see Repaint). */
function repaintMap(map: Texture, repaints: Repaint[]): Texture {
	const image = map.image as CanvasImageSource & { width: number; height: number };
	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;
	// Read back once per block; the hint keeps the browser from warning about it.
	const context = canvas.getContext('2d', { willReadFrequently: true })!;
	context.drawImage(image, 0, 0);
	for (const repaint of repaints) repaintBlock(context, repaint);
	const texture = map.clone();
	texture.source = new TextureSource(canvas); // the clone shares the original's source; this one is its own
	texture.needsUpdate = true;
	return texture;
}

/** Repaints one block in one colour, keeping each pixel's shade relative to the block's average. */
function repaintBlock(context: CanvasRenderingContext2D, { area: [x, y, width, height], color }: Repaint) {
	const block = context.getImageData(x, y, width, height);
	const px = block.data;
	const c = new Color();
	const hsl = { h: 0, s: 0, l: 0 };
	const lightness: number[] = [];
	for (let i = 0; i < px.length; i += 4) {
		c.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, SRGBColorSpace).getHSL(hsl, SRGBColorSpace);
		lightness.push(hsl.l);
	}
	const mean = lightness.reduce((a, b) => a + b, 0) / lightness.length;
	const target = new Color(color).getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
	const rgb = { r: 0, g: 0, b: 0 };
	lightness.forEach((l, j) => {
		c.setHSL(target.h, target.s, Math.min(1, (target.l * l) / mean), SRGBColorSpace).getRGB(rgb, SRGBColorSpace);
		px.set([rgb.r * 255, rgb.g * 255, rgb.b * 255].map(Math.round), j * 4);
	});
	context.putImageData(block, x, y);
}

/**
 * Converts materials to toon, reusing one toon material per pack material. Kenney packs texture
 * everything from one shared colour map, so materials alike in name and colour are interchangeable,
 * and the whole pack ends up with a single texture on the GPU (one more per repaint).
 */
function createToonCache(materials: Materials) {
	const cache = new Map<string, MeshToonMaterial>();
	const repainted = new Map<string, Texture>();
	return {
		/**
		 * `tint` is multiplied into the model's colours, then `brighten` scales them up. `repaint`
		 * defaults to the pack's.
		 */
		apply(root: Object3D, pack: PackId, tint?: string, brighten = 1, repaint = packs[pack].repaint) {
			const repaints = repaint ? [repaint].flat() : [];
			const convert = (source: Material) => {
				let s = source as MeshStandardMaterial;
				const paint = repaints.length && s.map ? `${pack}|${repaints.map((r) => `${r.area}|${r.color}`).join('|')}` : '';
				const key = `${pack}|${s.name}|${s.color.getHexString()}|${s.opacity}|${s.vertexColors}|${tint}|${brighten}|${paint}`;
				let toon = cache.get(key);
				if (!toon) {
					if (paint) {
						let map = repainted.get(paint);
						if (!map) repainted.set(paint, (map = repaintMap(s.map!, repaints)));
						s = s.clone();
						s.map = map;
					}
					toon = materials.toonFrom(s, !packs[pack].painted);
					if (tint) toon.color.multiply(new Color(tint));
					toon.color.multiplyScalar(brighten);
					cache.set(key, toon);
				}
				return toon;
			};
			root.traverse((o) => {
				if (!(o instanceof Mesh)) return;
				o.castShadow = true;
				o.receiveShadow = true;
				o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
			});
		},
		/** Gives one of a model's (already converted) materials a new colour: paint in a vat, say. */
		recolor(root: Object3D, materialName: string, color: string) {
			const key = `recolor|${materialName}|${color}`;
			root.traverse((o) => {
				if (!(o instanceof Mesh)) return;
				const swap = (m: Material) => {
					if (m.name !== materialName) return m;
					let toon = cache.get(key);
					if (!toon) {
						toon = (m as MeshToonMaterial).clone();
						toon.color.set(color);
						toon.opacity = 1;
						toon.transparent = false;
						cache.set(key, toon);
					}
					return toon;
				};
				o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
			});
		},
		/** A flat-coloured toon material, for untextured models. */
		solid(color: string) {
			const key = `solid|${color}`;
			let toon = cache.get(key);
			if (!toon) {
				toon = materials.toonFrom(new MeshStandardMaterial({ color }));
				cache.set(key, toon);
			}
			return toon;
		},
		dispose() {
			for (const m of cache.values()) {
				m.map?.dispose();
				m.dispose();
			}
		}
	};
}
