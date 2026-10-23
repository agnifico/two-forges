import {
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	CatmullRomCurve3,
	Color,
	CylinderGeometry,
	ExtrudeGeometry,
	Group,
	Mesh,
	Path,
	Shape,
	ShapeGeometry,
	Vector2,
	Vector3,
	type Material
} from 'three';
import {
	decorKinds,
	groundPatches,
	island,
	slots,
	stairStep,
	type CaveMouthConfig,
	type Point,
	type Roughness,
	type StairConfig,
	type WaterfallConfig
} from './config';
import { kindScale } from './decor';
import type { Materials } from './materials';
import { createLoopNoise, createNoise3, type Rng } from './rng';
import type { SideConfig, SidePond, SideTier } from './sides';

/** Closed outline on the ground plane: Vector2(x, z), counter-clockwise. */
export type Outline = Vector2[];
type Noise3 = ReturnType<typeof createNoise3>;

/** Each later tier's block stops this much above the one before, so their bottoms never z-fight. */
const TIER_BOTTOM_STEP = 0.25;

export interface Island {
	group: Group;
	/** Height of the ground at [x, z], or null off the island or over the pond. */
	groundHeight(x: number, z: number): number | null;
	/** Each tier's roughened outline, by tier id. */
	outlines: Record<string, Outline>;
	/** Where each flight of stairs meets the edge of the tier it climbs to. */
	landings: { tier: string; at: Vector2 }[];
	/** Stretches where a pond meets its tier's edge: the edge points, outward normals, and levels. */
	spills: {
		fall: WaterfallConfig;
		points: Vector2[];
		normals: Vector2[];
		tierTop: number;
		waterDrop: number;
	}[];
}

/** Builds one side of the island, centred on the world origin (see config.ts for axes). */
export function buildIsland(side: SideConfig, rng: Rng, materials: Materials): Island {
	const group = new Group();
	group.name = `island-${side.id}`;
	const wallNoise = createNoise3(rng);
	const tierById = new Map(side.tiers.map((t) => [t.id, t]));
	const top = (id: string) => {
		const tier = tierById.get(id);
		if (!tier) throw new Error(`The ${side.id} side has no tier "${id}"`);
		return tier.top;
	};

	const outlines: Record<string, Outline> = {};
	for (const tier of side.tiers) outlines[tier.id] = roughOutline(tier.points, tier.roughness, rng);
	const ponds = side.ponds.map((pond) => {
		const outline = roughOutline(pond.points, pond.roughness, rng);
		// snapped: cut onto the edge; pinned: near the edge, so never widened (it would poke through the cliff).
		return { pond, outline, snapped: outline.map(() => false), pinned: outline.map(() => false) };
	});
	// A pond with a waterfall is cut onto its tier's edge wherever it comes close; the water spills there.
	const spills: Island['spills'] = [];
	for (const fall of side.waterfalls ?? []) {
		const p = ponds.find((q) => q.pond.id === fall.pond);
		const tierOutline = p && outlines[p.pond.tier];
		if (!p || !tierOutline) {
			console.warn(`Waterfall from pond "${fall.pond}" has no such pond; skipped.`);
			continue;
		}
		snapToEdge(p.outline, p.snapped, p.pinned, tierOutline);
		const runs = spillRuns(p.outline, p.snapped);
		if (!runs.length) console.warn(`Pond "${fall.pond}" doesn't reach its tier's edge, so it has no waterfall.`);
		const tierTop = top(p.pond.tier);
		for (const run of runs) spills.push({ fall, ...run, tierTop, waterDrop: p.pond.waterDrop });
	}

	const rock = materials.solid(side.colors.rock, true);
	side.tiers.forEach((tier, i) => {
		const holes = ponds.filter((p) => p.pond.tier === tier.id).map((p) => p.outline);
		const bottom = island.baseY + i * TIER_BOTTOM_STEP;
		group.add(buildTier(tier, outlines[tier.id], holes, bottom, materials, rock, rng, wallNoise));
	});
	for (const p of ponds) group.add(buildPond(p.pond, p.outline, p.pinned, top(p.pond.tier), materials));
	const undersideTop = island.baseY + side.tiers.length * TIER_BOTTOM_STEP;
	const underside = materials.solid(side.colors.rockUnderside, true);
	group.add(buildUnderside(Object.values(outlines), undersideTop, underside, rng, wallNoise));

	const stairsMaterial = materials.solid(side.colors.stairs, true);
	const landings: Island['landings'] = [];
	for (const stair of side.stairs) {
		const built = buildStairs(stair, outlines, top, stairsMaterial, rng);
		group.add(built.group);
		landings.push({ tier: stair.to, at: built.edge });
	}

	const groundHeight = (x: number, z: number) => {
		// Tiers overlap; the highest one containing the point is the ground there.
		let best: SideTier | undefined;
		for (const tier of side.tiers) {
			if (contains(outlines[tier.id], x, z) && (!best || tier.top > best.top)) best = tier;
		}
		if (!best) return null;
		const tierId = best.id;
		if (ponds.some((p) => p.pond.tier === tierId && contains(p.outline, x, z))) return null;
		return best.top;
	};
	for (const cave of side.caveMouths) group.add(buildCaveMouth(cave, outlines, groundHeight, materials));

	// Random draws in an order where layout edits disturb as little as possible: the scattered
	// patches don't depend on the layout, the lily pads only on what floats on the pond.
	const patches = createPatchLayer(groundHeight, rng, side.colors.patches.map((c) => materials.solid(c)));
	addScatteredPatches(patches, side.tiers, outlines, groundHeight, rng);
	for (const p of ponds) {
		if (p.pond.lilyPads) group.add(buildLilyPads(p.pond, p.outline, top(p.pond.tier), side, groundHeight, rng, materials));
	}
	addDecorPatches(patches, side, rng);

	for (const slot of slots) {
		const at = side.stations.includes(slot.id) ? side.layout.stations[slot.id]?.at : undefined;
		if (!at) continue;
		const disc = new CylinderGeometry(slot.radius, slot.radius, 0.08, 28);
		disc.translate(at[0], (groundHeight(at[0], at[1]) ?? top(slot.tier)) + 0.05, at[1]);
		const mesh = new Mesh(disc, materials.slot);
		mesh.name = `slot-${slot.id}`;
		mesh.userData.station = slot.id;
		group.add(mesh);
	}

	group.traverse((o) => {
		if (o instanceof Mesh) {
			o.castShadow = true;
			o.receiveShadow = true;
		}
	});
	// Flat decals: they take shadows but don't cast them.
	group.add(patches.group);
	if (side.paths?.length) group.add(buildPaths(side, groundHeight, materials));
	return { group, groundHeight, outlines, landings, spills };
}

/**
 * A cave mouth painted onto a cliff: a stone rim standing proud of the rock around three arches
 * that darken towards the middle, which reads as depth without taking any floor space.
 */
function buildCaveMouth(
	cfg: CaveMouthConfig,
	outlines: Record<string, Outline>,
	groundHeight: Island['groundHeight'],
	materials: Materials
): Group {
	const dir = new Vector2(...cfg.into).normalize();
	const start = new Vector2(...cfg.at);
	const hits = rayHits(outlines[cfg.wallOf], start, dir);
	if (hits.length === 0) {
		throw new Error(`Cave mouth at [${cfg.at}] never reaches the ${cfg.wallOf} tier's cliff`);
	}
	const wall = start.clone().addScaledVector(dir, Math.min(...hits));

	// Local frame: x along the cliff, y up, +z out of the cliff towards the viewer.
	const group = new Group();
	group.name = 'cave-mouth';
	group.position.set(wall.x, groundHeight(...cfg.at) ?? 0, wall.y);
	group.rotation.y = Math.atan2(-dir.x, -dir.y);

	const { width: w, height: h } = cfg;
	// Horseshoe rim, open at the bottom: the outer arch, then the inner arch back the other way.
	const rimShape = new Shape([...arch(w + 0.7, h + 0.35), ...arch(w, h).reverse()]);
	const rim = new ExtrudeGeometry(rimShape, { depth: 1.2, bevelEnabled: false });
	// The back 0.7 is buried in the cliff (which is bumpy); the front stands 0.5 proud.
	rim.translate(0, 0, -0.7);
	group.add(new Mesh(rim, materials.caveRim));

	const layers: [width: number, height: number, z: number][] = [
		[1, 1, 0.3],
		[0.74, 0.84, 0.33],
		[0.46, 0.62, 0.36]
	];
	layers.forEach(([sw, sh, z], i) => {
		const layer = new ExtrudeGeometry(new Shape(arch(w * sw, h * sh)), { depth: 0.02, bevelEnabled: false });
		layer.translate(0, 0, z);
		group.add(new Mesh(layer, materials.caveMouth[i]));
	});
	return group;
}

/**
 * Irregular colour patches lying on the grass. Each patch sits a hair above the one before, so
 * overlapping patches never share a depth (which flickers).
 */
function createPatchLayer(groundHeight: Island['groundHeight'], rng: Rng, colors: Material[]) {
	const group = new Group();
	group.name = 'ground-patches';
	let lift = 0.006;

	/** Adds a wobbly disc; false if any part of it would leave the flat ground it starts on. */
	const add = (x: number, z: number, r: number, material: Material) => {
		const ground = groundHeight(x, z);
		if (ground === null) return false;
		const wobble = createLoopNoise(rng, 5);
		const points = Array.from({ length: 20 }, (_, i) => {
			const a = (i / 20) * Math.PI * 2;
			const rr = r * (1 + 0.32 * wobble(i / 20));
			return new Vector2(x + Math.cos(a) * rr, z + Math.sin(a) * rr);
		});
		if (points.some((p) => groundHeight(p.x, p.y) !== ground)) return false;
		const geometry = new ShapeGeometry(new Shape(toShapePoints(points)));
		geometry.rotateX(-Math.PI / 2);
		geometry.translate(0, ground + lift, 0);
		lift += 0.002;
		const mesh = new Mesh(geometry, material);
		mesh.receiveShadow = true;
		group.add(mesh);
		return true;
	};
	return { group, add, materials: colors };
}
type PatchLayer = ReturnType<typeof createPatchLayer>;

/** A few patches of dry grass, deep grass and earth scattered over each tier that asks for them. */
function addScatteredPatches(
	patches: PatchLayer,
	tiers: SideTier[],
	outlines: Record<string, Outline>,
	groundHeight: Island['groundHeight'],
	rng: Rng
) {
	const [dryGrass, deepGrass, , earth] = patches.materials;
	const choices = [dryGrass, deepGrass, earth, dryGrass, deepGrass];
	for (const tier of tiers) {
		if (!tier.patches) continue;
		const min = new Vector2(Infinity, Infinity);
		const max = new Vector2(-Infinity, -Infinity);
		for (const p of outlines[tier.id]) {
			min.min(p);
			max.max(p);
		}
		let count = 0;
		for (let tries = 0; count < tier.patches && tries < 60; tries++) {
			const x = rng.range(min.x, max.x);
			const z = rng.range(min.y, max.y);
			const r = rng.range(...groundPatches.radius);
			const material = choices[Math.floor(rng.next() * choices.length)];
			if (groundHeight(x, z) !== tier.top) continue;
			if (patches.add(x, z, r, material)) count++;
		}
	}
}

/** A sandy patch ringed with dry grass under every copy of a decor kind marked `patch` (rocks). */
function addDecorPatches(patches: PatchLayer, side: SideConfig, rng: Rng) {
	const [dryGrass, , sand] = patches.materials;
	const kinds = new Map(decorKinds.map((k) => [k.id, k]));
	for (const p of side.layout.decor) {
		const kind = kinds.get(p.kind);
		if (!kind?.patch) continue;
		const [x, z] = p.at;
		const r = 0.55 * kindScale(kind) * (p.scale ?? 1);
		// Shrink until it fits on its tier.
		for (const fit of [1, 0.75, 0.55]) {
			if (patches.add(x, z, r * 1.25 * fit, dryGrass)) {
				patches.add(x + rng.range(-0.2, 0.2), z + rng.range(-0.2, 0.2), r * 0.8 * fit, sand);
				break;
			}
		}
	}
}

/**
 * Paved paths: a light surface on a slightly wider, darker border, laid flat on the ground in short
 * pieces. Pieces that would cross a change in height (a step up to the next level) are left out;
 * the stairs carry the path there.
 */
function buildPaths(side: SideConfig, groundHeight: Island['groundHeight'], materials: Materials): Group {
	const group = new Group();
	group.name = 'paths';
	/** Each path's own width, plus `extra` (the border). */
	const strip = (extra: number, lift: number) => {
		const positions: number[] = [];
		for (const path of side.paths ?? []) {
			const width = path.width + extra;
			for (let i = 0; i < path.points.length - 1; i++) {
				const a = new Vector2(...path.points[i]);
				const b = new Vector2(...path.points[i + 1]);
				const d = b.clone().sub(a);
				const steps = Math.max(1, Math.ceil(d.length() / 0.5));
				const side = new Vector2(-d.y, d.x).normalize().multiplyScalar(width / 2);
				for (let k = 0; k < steps; k++) {
					const p = a.clone().lerp(b, k / steps);
					const q = a.clone().lerp(b, (k + 1) / steps);
					const y = groundHeight(p.x, p.y);
					if (y === null || y !== groundHeight(q.x, q.y)) continue;
					const corners = [p.clone().add(side), p.clone().sub(side), q.clone().sub(side), q.clone().add(side)];
					if (corners.some((c) => groundHeight(c.x, c.y) !== y)) continue;
					const [c0, c1, c2, c3] = corners;
					for (const c of [c0, c2, c1, c0, c3, c2]) positions.push(c.x, y + lift, c.y);
				}
			}
		}
		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
		geometry.computeVertexNormals();
		return geometry;
	};
	const edge = new Mesh(strip(0.6, 0.12), materials.solid(side.colors.pathEdge ?? '#cbbfa9'));
	const surface = new Mesh(strip(0, 0.13), materials.solid(side.colors.path ?? '#efe8dc'));
	for (const m of [edge, surface]) {
		m.receiveShadow = true;
		group.add(m);
	}
	return group;
}

/** Outline of an arch standing on y = 0: straight sides and a round top, left foot to right foot. */
function arch(width: number, height: number): Vector2[] {
	const r = Math.min(width / 2, height);
	const springing = height - r;
	const points = [new Vector2(-width / 2, 0)];
	const segments = 10;
	for (let i = 0; i <= segments; i++) {
		const a = Math.PI - (i / segments) * Math.PI;
		points.push(new Vector2(Math.cos(a) * (width / 2), springing + Math.sin(a) * r));
	}
	points.push(new Vector2(width / 2, 0));
	return points;
}

/** Lily pads on the pond: flat discs with a wedge cut out, kept clear of the edge and of things on the water. */
function buildLilyPads(
	pond: SidePond,
	pondOutline: Outline,
	groundTop: number,
	side: SideConfig,
	groundHeight: Island['groundHeight'],
	rng: Rng,
	materials: Materials
): Group {
	const group = new Group();
	group.name = 'lily-pads';
	const area = offsetOutline(pondOutline, -0.8);
	const min = new Vector2(Infinity, Infinity);
	const max = new Vector2(-Infinity, -Infinity);
	for (const p of area) {
		min.min(p);
		max.max(p);
	}
	const floating = new Set(decorKinds.filter((k) => k.height !== undefined).map((k) => k.id));
	const keepClear = [
		...Object.values(side.layout.stations).flatMap((s) => (s ? [s.at] : [])),
		...side.layout.decor.filter((p) => floating.has(p.kind)).map((p) => p.at)
	];
	const y = groundTop - pond.waterDrop + 0.03;
	const placed: [x: number, z: number, r: number][] = [];
	for (let tries = 0; placed.length < pond.lilyPads && tries < 400; tries++) {
		const x = rng.range(min.x, max.x);
		const z = rng.range(min.y, max.y);
		const r = rng.range(0.35, 0.6);
		// Open water only: not under a higher tier's cliff.
		if (!contains(area, x, z) || groundHeight(x, z) !== null) continue;
		if (keepClear.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 2.8)) continue;
		// Leave open water between pads.
		if (placed.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < r + pr + 0.5)) continue;
		placed.push([x, z, r]);
		const pad = new CylinderGeometry(r, r, 0.04, 14, 1, false, 0, Math.PI * 2 - 0.7);
		pad.rotateY(rng.range(0, Math.PI * 2));
		pad.translate(x, y, z);
		group.add(new Mesh(pad, materials.lilyPad));
	}
	return group;
}

/** A tier: rock block from `bottom` up to a top slab (grass, sand, earth or rock) flush with it. */
function buildTier(
	tier: SideTier,
	outline: Outline,
	holes: Outline[],
	bottom: number,
	materials: Materials,
	rock: Material,
	rng: Rng,
	noise: Noise3
): Group {
	const { top } = tier;
	const grassBottom = top - island.grassThickness;
	const group = new Group();
	group.name = `tier-${tier.id}`;

	const block = prism(outline, holes, bottom, grassBottom + 0.05);
	roughenWalls(block, noise, grassBottom);
	jitterColors(block, rng, 0.07, block.groups[1].start);
	block.computeVertexNormals();
	group.add(new Mesh(block, rock));

	const lip = prism(
		offsetOutline(outline, island.grassOverhang),
		holes.map((h) => offsetOutline(h, -island.grassOverhang)),
		grassBottom,
		top
	);
	const edge = tier.edge ?? `#${new Color(tier.surface).multiplyScalar(0.78).getHexString()}`;
	group.add(new Mesh(lip, [materials.solid(tier.surface), materials.solid(edge)]));
	return group;
}

/**
 * Pond floor (wider than the hole so it tucks under the bumpy walls) and a flat water surface.
 * Near the tier's edge (`pinned`: where the pond was cut onto it), both stop flush with the cliff.
 */
function buildPond(
	pond: SidePond,
	outline: Outline,
	pinned: boolean[],
	groundTop: number,
	materials: Materials
): Group {
	const group = new Group();
	group.name = 'pond';
	const normals = vertexNormals(outline);
	const grow = (by: number) => outline.map((p, i) => (pinned[i] ? p.clone() : p.clone().addScaledVector(normals[i], by)));

	const bed = prism(grow(0.4), [], island.baseY, groundTop - pond.depth);
	group.add(new Mesh(bed, materials.pondBed));

	const water = new ShapeGeometry(new Shape(toShapePoints(grow(0.2))));
	water.rotateX(-Math.PI / 2);
	water.translate(0, groundTop - pond.waterDrop, 0);
	group.add(new Mesh(water, materials.water));
	return group;
}

/**
 * Rocky mass hanging under the island: rings that follow the union of the tier outlines at the
 * top, then taper with growing lumpiness to an off-centre tip. Closed with a hidden top cap.
 */
function buildUnderside(
	outlines: Outline[],
	topY: number,
	material: Material,
	rng: Rng,
	noise: Noise3
): Mesh {
	const { depth, rings, segments, taper, jaggedness, drift } = island.underside;
	const centre = outlinesCentre(outlines);

	const spokes = Array.from({ length: segments }, (_, k) => {
		const angle = (k / segments) * Math.PI * 2;
		const dir = new Vector2(Math.cos(angle), Math.sin(angle));
		const reach = Math.max(0, ...outlines.flatMap((o) => rayHits(o, centre, dir)));
		return { dir, reach: reach * 0.97 };
	});

	const tipOffset = new Vector2(rng.range(-1, 1), rng.range(-1, 1)).multiplyScalar(drift);
	const positions: number[] = [];
	for (let j = 0; j < rings; j++) {
		const t = j / rings;
		const y = topY - t * depth;
		const scale = Math.pow(Math.cos((t * Math.PI) / 2), taper);
		const c = centre.clone().addScaledVector(tipOffset, t * t);
		for (const { dir, reach } of spokes) {
			const x0 = c.x + dir.x * reach * scale;
			const z0 = c.y + dir.y * reach * scale;
			const lump =
				1 + t * jaggedness * (1.5 * noise(x0 * 0.3, y * 0.45, z0 * 0.3) + rng.range(-0.3, 0.3));
			positions.push(c.x + dir.x * reach * scale * lump, y, c.y + dir.y * reach * scale * lump);
		}
	}
	const tip = positions.length / 3;
	positions.push(centre.x + tipOffset.x, topY - depth, centre.y + tipOffset.y);
	const cap = tip + 1;
	positions.push(centre.x, topY, centre.y);

	const index: number[] = [];
	const at = (j: number, k: number) => j * segments + (k % segments);
	for (let j = 0; j < rings; j++) {
		for (let k = 0; k < segments; k++) {
			const a = at(j, k);
			const b = at(j, k + 1);
			if (j === rings - 1) {
				index.push(a, b, tip);
			} else {
				const c = at(j + 1, k);
				const d = at(j + 1, k + 1);
				index.push(a, b, d, a, d, c);
			}
		}
	}
	for (let k = 0; k < segments; k++) index.push(cap, at(0, k + 1), at(0, k));

	const indexed = new BufferGeometry();
	indexed.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	indexed.setIndex(index);
	// Non-indexed so every face gets its own flat normal: chunky, faceted rock.
	const geometry = indexed.toNonIndexed();
	indexed.dispose();
	jitterColors(geometry, rng, 0.08);
	geometry.computeVertexNormals();

	const mesh = new Mesh(geometry, material);
	mesh.name = 'underside';
	return mesh;
}

/** Blocky steps running from `at` along `climb` up to the edge of the higher tier. */
function buildStairs(
	stair: StairConfig,
	outlines: Record<string, Outline>,
	top: (tier: string) => number,
	material: Material,
	rng: Rng
): { group: Group; edge: Vector2 } {
	const dir = new Vector2(...stair.climb).normalize();
	const start = new Vector2(...stair.at);
	const hits = rayHits(outlines[stair.to], start, dir);
	if (hits.length === 0) {
		throw new Error(
			`Stairs ${stair.from}→${stair.to}: climbing from [${stair.at}] never reaches the ${stair.to} tier`
		);
	}
	const edge = start.clone().addScaledVector(dir, Math.min(...hits));

	const low = top(stair.from);
	const high = top(stair.to);
	const count = Math.max(2, Math.round((high - low) / stairStep.rise));
	const rise = (high - low) / count;
	const run = stairStep.run;

	// Local frame: origin on the tier edge, +z pointing back down the stairs.
	const group = new Group();
	group.name = `stairs-${stair.from}-${stair.to}`;
	group.position.set(edge.x, 0, edge.y);
	group.rotation.y = Math.atan2(-dir.x, -dir.y);

	// The final rise lands on the higher tier's ground, so there is one box fewer than rises.
	for (let i = 1; i < count; i++) {
		const front = (count - i) * run;
		// The top step reaches back into the wall so it never floats off a bumpy edge.
		const back = i === count - 1 ? -0.8 : front - run;
		const bottom = low - 0.4;
		const stepTop = low + i * rise;
		const box = new BoxGeometry(stair.width, stepTop - bottom, front - back);
		box.translate(0, (stepTop + bottom) / 2, (front + back) / 2);
		const shade = 1 + rng.range(-0.06, 0.06);
		box.setAttribute(
			'color',
			new BufferAttribute(new Float32Array(box.getAttribute('position').count * 3).fill(shade), 3)
		);
		group.add(new Mesh(box, material));
	}
	return { group, edge };
}

/** Smooths a control polygon into a rounded loop, then wobbles it along its normals. */
function roughOutline(points: Point[], roughness: Roughness, rng: Rng): Outline {
	const curve = new CatmullRomCurve3(
		points.map(([x, z]) => new Vector3(x, 0, z)),
		true,
		'centripetal'
	);
	const length = curve.getLength();
	const count = Math.max(24, Math.round(length / island.edgeSegmentLength));
	const smooth = curve
		.getSpacedPoints(count)
		.slice(0, count)
		.map((p) => new Vector2(p.x, p.z));
	if (signedArea(smooth) < 0) smooth.reverse();

	const normals = vertexNormals(smooth);
	const bumps = length / roughness.wavelength;
	const wobble = createLoopNoise(rng, bumps);
	const chips = createLoopNoise(rng, bumps * 4);
	return smooth.map((p, i) => {
		const t = i / count;
		const offset = wobble(t) * roughness.amplitude + chips(t) * roughness.chipAmplitude;
		return p.clone().addScaledVector(normals[i], offset);
	});
}

/** Vertical block between two heights. Groups: 0 = top/bottom caps, 1 = side walls. */
function prism(outer: Outline, holes: Outline[], bottom: number, top: number): ExtrudeGeometry {
	const shape = new Shape(toShapePoints(outer));
	shape.holes = holes.map((h) => new Path(toShapePoints(h)));
	const depth = top - bottom;
	const geometry = new ExtrudeGeometry(shape, {
		depth,
		steps: Math.max(1, Math.round(depth / 0.6)),
		bevelEnabled: false
	});
	// Shape space (x, y) extruded along +z becomes island space (x, -z) extruded along +y.
	geometry.rotateX(-Math.PI / 2);
	geometry.translate(0, bottom, 0);
	return geometry;
}

/** Pushes vertices below `fadeFrom` sideways with 3D noise, ramping in over one unit. */
function roughenWalls(geometry: BufferGeometry, noise: Noise3, fadeFrom: number) {
	const pos = geometry.getAttribute('position');
	const f = island.wallFrequency;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const strength = Math.min(1, Math.max(0, fadeFrom - y)) * island.wallAmplitude;
		if (strength === 0) continue;
		pos.setX(i, x + noise(x * f, y * f, z * f) * strength);
		pos.setZ(i, z + noise(x * f + 41.3, y * f + 7.1, z * f - 17.9) * strength);
	}
	pos.needsUpdate = true;
}

/** Per-quad brightness jitter as vertex colours (non-indexed geometry: 6 vertices per quad). */
function jitterColors(geometry: BufferGeometry, rng: Rng, amount: number, from = 0) {
	const count = geometry.getAttribute('position').count;
	const colors = new Float32Array(count * 3).fill(1);
	for (let i = from; i < count; i += 6) {
		colors.fill(1 + rng.range(-amount, amount), i * 3, Math.min(count, i + 6) * 3);
	}
	geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

const toShapePoints = (outline: Outline) => outline.map((p) => new Vector2(p.x, -p.y));

function signedArea(outline: Outline): number {
	let area = 0;
	for (let i = 0; i < outline.length; i++) {
		const a = outline[i];
		const b = outline[(i + 1) % outline.length];
		area += a.x * b.y - b.x * a.y;
	}
	return area / 2;
}

/** Outward unit normals at each vertex of a counter-clockwise outline. */
function vertexNormals(outline: Outline): Vector2[] {
	const n = outline.length;
	const edgeNormal = (a: Vector2, b: Vector2) => new Vector2(b.y - a.y, a.x - b.x).normalize();
	return outline.map((p, i) =>
		edgeNormal(outline[(i - 1 + n) % n], p)
			.add(edgeNormal(p, outline[(i + 1) % n]))
			.normalize()
	);
}

/** Grows (positive) or shrinks (negative) an outline along its normals. */
export function offsetOutline(outline: Outline, distance: number): Outline {
	const normals = vertexNormals(outline);
	return outline.map((p, i) => p.clone().addScaledVector(normals[i], distance));
}

function outlinesCentre(outlines: Outline[]): Vector2 {
	const min = new Vector2(Infinity, Infinity);
	const max = new Vector2(-Infinity, -Infinity);
	for (const p of outlines.flat()) {
		min.min(p);
		max.max(p);
	}
	return min.add(max).multiplyScalar(0.5);
}

/** How close (world units) a pond point must come to its tier's edge to be cut onto it. */
const SPILL_REACH = 1.1;

/**
 * Moves the pond's outline points within `SPILL_REACH` of the tier's edge onto it (just inside),
 * easing nearby points part of the way, so the pond meets the cliff in a clean line.
 */
function snapToEdge(pond: Outline, snapped: boolean[], pinned: boolean[], tier: Outline) {
	const inner = offsetOutline(tier, -0.08);
	const ease = 0.7;
	pond.forEach((v, i) => {
		const q = nearestPoint(inner, v);
		const d = v.distanceTo(q);
		if (d < SPILL_REACH) {
			v.copy(q);
			snapped[i] = pinned[i] = true;
		} else if (d < SPILL_REACH + ease) {
			v.lerp(q, 1 - (d - SPILL_REACH) / ease);
			pinned[i] = true;
		}
	});
}

/** Runs of consecutive snapped points (wrapping round), with outward normals from each run's own line. */
function spillRuns(pond: Outline, snapped: boolean[]): { points: Vector2[]; normals: Vector2[] }[] {
	const n = pond.length;
	if (snapped.every(Boolean) || !snapped.some(Boolean)) return [];
	const start = snapped.findIndex((s, i) => s && !snapped[(i - 1 + n) % n]);
	const runs: number[][] = [];
	for (let k = 0; k < n; k++) {
		const i = (start + k) % n;
		if (!snapped[i]) continue;
		if (!snapped[(i - 1 + n) % n] || !runs.length) runs.push([]);
		runs[runs.length - 1].push(i);
	}
	const outward = vertexNormals(pond);
	return runs
		.filter((r) => r.length >= 2)
		.map((r) => {
			const points = r.map((i) => pond[i].clone());
			const normals = points.map((p, k) => {
				const a = points[Math.max(0, k - 1)];
				const b = points[Math.min(points.length - 1, k + 1)];
				const nrm = new Vector2(b.y - a.y, a.x - b.x).normalize();
				return nrm.dot(outward[r[k]]) < 0 ? nrm.negate() : nrm;
			});
			return { points, normals };
		});
}

/** The point on a closed outline nearest to `p`. */
function nearestPoint(outline: Outline, p: Vector2): Vector2 {
	let best = outline[0].clone();
	let bestDistance = Infinity;
	for (let i = 0; i < outline.length; i++) {
		const a = outline[i];
		const ab = outline[(i + 1) % outline.length].clone().sub(a);
		const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()));
		const q = a.clone().addScaledVector(ab, t);
		if (q.distanceTo(p) < bestDistance) {
			bestDistance = q.distanceTo(p);
			best = q;
		}
	}
	return best;
}

/** Even-odd point-in-polygon test on the ground plane. */
export function contains(outline: Outline, x: number, z: number): boolean {
	let inside = false;
	for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
		const a = outline[i];
		const b = outline[j];
		if (a.y > z !== b.y > z && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) inside = !inside;
	}
	return inside;
}

/** Distances along a ray (origin + s * dir, s > 0) at which it crosses the outline. */
export function rayHits(outline: Outline, origin: Vector2, dir: Vector2): number[] {
	const hits: number[] = [];
	for (let i = 0; i < outline.length; i++) {
		const a = outline[i];
		const edge = outline[(i + 1) % outline.length].clone().sub(a);
		const denom = dir.cross(edge);
		if (Math.abs(denom) < 1e-9) continue;
		const w = a.clone().sub(origin);
		const s = w.cross(edge) / denom;
		const u = w.cross(dir) / denom;
		if (s > 0 && u >= 0 && u <= 1) hits.push(s);
	}
	return hits;
}
