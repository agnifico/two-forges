// Things that move or glow: fire, smoke, lamps and windows that light up at night, water in
// buckets, waterfalls, and fireflies around the plants after dark. Built per side after its props; `tick` runs every frame while the side
// is up, with `night` from 0 (day) to 1 (night).

import {
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DoubleSide,
	Group,
	IcosahedronGeometry,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	PointLight,
	RepeatWrapping,
	SphereGeometry,
	type MeshToonMaterial,
	type Object3D
} from 'three';
import {
	SEED,
	decorKinds,
	fireflies,
	palette,
	stationEffects,
	stationModels,
	type DecorKind,
	type EffectConfig,
	type Layout,
	type StationId
} from './config';
import { createGlowPoints } from './glow-points';
import type { Materials } from './materials';
import { createRng, type Rng } from './rng';
import type { SideConfig } from './sides';
import type { Island } from './terrain';

export interface Life {
	group: Group;
	tick(time: number, night: number): void;
	dispose(): void;
}

type Ticker = (time: number, night: number) => void;

export function buildLife(
	side: SideConfig,
	island: Island,
	stationObjects: Map<StationId, Object3D>,
	layout: Layout,
	materials: Materials,
	rng: Rng
): Life {
	const group = new Group();
	group.name = 'life';
	const tickers: Ticker[] = [];
	const owned: { dispose(): void }[] = [];
	const own = <T extends { dispose(): void }>(thing: T) => (owned.push(thing), thing);

	// Effects on stations: children of the station, so they move and turn with it.
	for (const id of side.stations) {
		const station = stationObjects.get(id);
		for (const effect of stationEffects[id] ?? []) {
			if (!station) continue;
			const made = makeEffect(effect, materials, rng, own);
			made.object.position.set(...effect.offset);
			station.add(made.object);
			tickers.push(made.tick);
		}
	}

	// Decor that lights up, burns or holds water: each copy gets a holder placed like it.
	const kinds = new Map(decorKinds.map((k) => [k.id, k]));
	const hasLife = (kind: DecorKind | undefined): kind is DecorKind => !!kind && !!(kind.light || kind.fill || kind.effects);
	/** Adds a kind's fire, smoke, light and liquid to `holder`, in the copy's own frame. */
	const kindLife = (kind: DecorKind, holder: Object3D) => {
		for (const effect of kind.effects ?? []) {
			const made = makeEffect(effect, materials, rng, own);
			made.object.position.set(...effect.offset);
			holder.add(made.object);
			tickers.push(made.tick);
		}
		if (kind.light) {
			const made = makeEffect(
				{ kind: 'light', offset: [0, 0, 0], color: kind.light.color ?? palette.glow, size: kind.light.intensity ?? 1.2, when: 'night' },
				materials,
				rng,
				own
			);
			made.object.position.set(0, kind.light.height, 0);
			// A small glowing bulb so the lamp itself reads as lit.
			const bulb = new Mesh(own(new SphereGeometry(0.22, 8, 6)), own(new MeshBasicMaterial({ color: palette.glow, transparent: true })));
			made.object.add(bulb);
			holder.add(made.object);
			tickers.push(made.tick, (_t, night) => {
				(bulb.material as MeshBasicMaterial).opacity = night;
				bulb.visible = night > 0.05;
			});
		}
		if (kind.fill) {
			const r = kind.fill.radius;
			const disc = new Mesh(own(new CylinderGeometry(r, r, 0.04, 16)), materials.solid(kind.fill.color));
			disc.position.set(0, kind.fill.height, 0);
			holder.add(disc);
		}
	};
	for (const p of layout.decor) {
		const kind = kinds.get(p.kind);
		if (!hasLife(kind)) continue;
		const ground = island.groundHeight(p.at[0], p.at[1]);
		if (ground === null) continue;
		const holder = new Group();
		holder.position.set(p.at[0], ground - (kind.sink ?? 0) + (p.lift ?? 0), p.at[1]);
		holder.rotation.y = MathUtils.degToRad(p.rotationDeg ?? 0);
		holder.scale.setScalar(p.scale ?? 1);
		kindLife(kind, holder);
		group.add(holder);
	}
	// The same for decor kinds used inside stations (the reading nook's lamp), moving with the station.
	for (const cfg of stationModels) {
		const station = stationObjects.get(cfg.station);
		if (!station || !side.stations.includes(cfg.station)) continue;
		for (const prop of cfg.props) {
			const kind = 'kind' in prop ? kinds.get(prop.kind) : undefined;
			if (!hasLife(kind)) continue;
			const holder = new Group();
			holder.position.set(...(prop.offset ?? ([0, 0, 0] as const)));
			holder.rotation.y = MathUtils.degToRad(prop.rotationDeg ?? 0);
			if (typeof prop.scale === 'number') holder.scale.setScalar(prop.scale);
			kindLife(kind, holder);
			station.add(holder);
		}
	}

	// Waterfalls.
	const streaks = own(streakTexture(rng));
	for (const spill of island.spills) {
		const made = makeWaterfall(spill, streaks, materials, own, rng);
		group.add(made.object);
		tickers.push(made.tick);
	}
	tickers.push((time) => {
		streaks.offset.y = time * 0.0009;
	});

	// Fireflies: wandering around trees, bushes and flowers at night. Their own random stream, so
	// adding or removing them never changes anything else on the island.
	const near = new Set<string>(fireflies.near);
	const plants = layout.decor.filter((p) => near.has(p.kind) && island.groundHeight(p.at[0], p.at[1]) !== null);
	if (plants.length > 0) {
		const flyRng = createRng(SEED + (side.id === 'forge' ? 11 : 12));
		const dots = Array.from({ length: fireflies.count }, () => {
			const plant = plants[Math.floor(flyRng.next() * plants.length)];
			const angle = flyRng.range(0, Math.PI * 2);
			const out = flyRng.range(0.6, 1.8);
			const x = plant.at[0] + Math.cos(angle) * out;
			const z = plant.at[1] + Math.sin(angle) * out;
			const ground = island.groundHeight(x, z) ?? island.groundHeight(plant.at[0], plant.at[1])!;
			return { at: [x, ground + flyRng.range(0.5, 2.2), z] as const, size: flyRng.range(9, 14), phase: flyRng.next() };
		});
		const glow = own(createGlowPoints(dots, { color: fireflies.color, wander: 0.7, blink: true, additive: true }));
		group.add(glow.points);
		tickers.push((time, night) => glow.tick(time, night * night));
	}

	return {
		group,
		tick(time, night) {
			for (const t of tickers) t(time, night);
		},
		dispose() {
			for (const thing of owned) thing.dispose();
		}
	};
}

/** One station effect: fire, smoke, a point light or a glowing window panel. */
function makeEffect(
	effect: EffectConfig,
	materials: Materials,
	rng: Rng,
	own: <T extends { dispose(): void }>(thing: T) => T
): { object: Object3D; tick: Ticker } {
	const size = effect.size ?? 1;
	const nightOnly = effect.when === 'night';

	if (effect.kind === 'fire') {
		// Three nested flames, each flickering on its own beat.
		const object = new Group();
		const flames = palette.fire.map((color, i) => {
			const r = size * (0.55 - i * 0.13);
			const flame = new Mesh(own(new ConeGeometry(r, size * (1.2 - i * 0.25), 6)), own(new MeshBasicMaterial({ color })));
			flame.position.y = size * (0.5 - i * 0.1);
			object.add(flame);
			return { flame, phase: rng.range(0, Math.PI * 2), speed: rng.range(0.008, 0.013) };
		});
		return {
			object,
			tick: (time) => {
				for (const { flame, phase, speed } of flames) {
					const f = 0.85 + 0.2 * Math.sin(time * speed + phase) + 0.08 * Math.sin(time * speed * 2.7 + phase);
					flame.scale.set(1, f, 1);
					flame.rotation.y = time * 0.002 + phase;
				}
			}
		};
	}

	if (effect.kind === 'smoke') {
		// Puffs rise, drift, swell and fade, then start again at the chimney.
		const object = new Group();
		const base = materials.solid(palette.smoke);
		const puffs = Array.from({ length: 7 }, (_, i) => {
			const material = own((base as MeshToonMaterial).clone());
			material.transparent = true;
			material.depthWrite = false;
			const puff = new Mesh(own(new IcosahedronGeometry(0.4 * size, 0)), material);
			object.add(puff);
			return { puff, material, offset: i / 7, drift: rng.range(-0.4, 0.4) };
		});
		const period = 5200;
		return {
			object,
			tick: (time) => {
				for (const { puff, material, offset, drift } of puffs) {
					const t = (time / period + offset) % 1;
					puff.position.set(drift * t * 3 + t * 1.2, t * 4.5 * size, drift * t * 1.5);
					puff.scale.setScalar(0.5 + t * 1.6);
					puff.rotation.set(t * 2, t * 3 + offset * 6, 0);
					material.opacity = Math.min(1, t * 6) * (1 - t) * 0.8;
				}
			}
		};
	}

	if (effect.kind === 'light') {
		const light = new PointLight(effect.color ?? palette.glow, 0, 7 * size, 1);
		const base = 7 * size;
		const flicker = rng.range(0, 10);
		return {
			object: light,
			tick: (time, night) => {
				const on = nightOnly ? night : 0.3 + 0.7 * night;
				const wobble = effect.color === '#ff9a3c' ? 0.85 + 0.15 * Math.sin(time * 0.017 + flicker) : 1;
				light.intensity = base * on * wobble;
				light.visible = on > 0.02;
			}
		};
	}

	// Glow: a warm panel just outside a window or screen, showing only after dark.
	const material = own(
		new MeshBasicMaterial({ color: effect.color ?? palette.glow, transparent: true, depthWrite: false, side: DoubleSide })
	);
	const panel = new Mesh(own(new PlaneGeometry(size, size * 0.85)), material);
	panel.rotation.y = MathUtils.degToRad(effect.turnDeg ?? 0);
	return {
		object: panel,
		tick: (_time, night) => {
			material.opacity = (nightOnly ? night : 1) * 0.85;
			panel.visible = material.opacity > 0.02;
		}
	};
}

/** Waterfall colours: bright by day (unlit, so it reads as moving water), deep blue at night. */
const FALL_DAY = new Color('#a6ece6');
const FALL_NIGHT = new Color('#4d5fa6');

/**
 * Water spilling over a pond's edge (see Island.spills): one sheet following the edge exactly,
 * curving from the pond's surface over the lip, then straight down just clear of the bumpy cliff.
 * Foam where it lands, or a fade for water falling off the island.
 */
function makeWaterfall(
	spill: Island['spills'][number],
	streaks: CanvasTexture,
	materials: Materials,
	own: <T extends { dispose(): void }>(thing: T) => T,
	rng: Rng
): { object: Object3D; tick: Ticker } {
	const { fall, points, normals, tierTop, waterDrop } = spill;
	const surface = tierTop - waterDrop;
	const bottom = tierTop - fall.drop;
	/** Profile across the edge, top to bottom: [offset along the normal, height]. */
	const profile: [number, number][] = [
		[-0.4, surface + 0.02],
		[0, tierTop + 0.06],
		[0.55, tierTop - 0.2],
		...Array.from({ length: 8 }, (_, j) => [0.55, MathUtils.lerp(tierTop - 0.2, bottom, (j + 1) / 8)] as [number, number])
	];
	// Distance down the profile (for the texture), and the fade for falls off the island.
	const along = profile.map((_, j) =>
		profile.slice(1, j + 1).reduce((d, p, k) => d + Math.hypot(p[0] - profile[k][0], p[1] - profile[k][1]), 0)
	);
	const total = along[along.length - 1];

	const positions: number[] = [];
	const uvs: number[] = [];
	const colors: number[] = [];
	let across = 0;
	points.forEach((p, k) => {
		if (k > 0) across += p.distanceTo(points[k - 1]);
		profile.forEach(([out, y], j) => {
			positions.push(p.x + normals[k].x * out, y, p.y + normals[k].y * out);
			uvs.push(across / 2, -along[j] / 2);
			const t = along[j] / total;
			colors.push(1, 1, 1, fall.fade ? MathUtils.clamp(1.4 - t * 1.6, 0, 1) : 1);
		});
	});
	const rows = profile.length;
	const index: number[] = [];
	for (let k = 0; k < points.length - 1; k++) {
		for (let j = 0; j < rows - 1; j++) {
			const a = k * rows + j;
			const b = (k + 1) * rows + j;
			index.push(a, b, a + 1, b, b + 1, a + 1);
		}
	}
	const geometry = own(new BufferGeometry());
	geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 4));
	geometry.setIndex(index);
	const material = own(
		new MeshBasicMaterial({
			color: FALL_DAY,
			map: streaks,
			vertexColors: true,
			transparent: true,
			opacity: 0.95,
			side: DoubleSide
		})
	);
	const object = new Group();
	object.name = 'waterfall';
	object.add(new Mesh(geometry, material));

	// Foam where it lands.
	const foam: { mesh: Mesh; phase: number }[] = [];
	if (!fall.fade) {
		const foamMaterial = materials.solid(palette.foam);
		const count = Math.max(3, Math.round(across / 0.8));
		for (let i = 0; i < count; i++) {
			const k = Math.round((i / (count - 1)) * (points.length - 1));
			const at = points[k].clone().addScaledVector(normals[k], 0.9);
			const mesh = new Mesh(own(new IcosahedronGeometry(rng.range(0.22, 0.38), 0)), foamMaterial);
			mesh.position.set(at.x, bottom + 0.05, at.y);
			object.add(mesh);
			foam.push({ mesh, phase: rng.range(0, Math.PI * 2) });
		}
	}
	return {
		object,
		tick: (time, night) => {
			material.color.copy(FALL_DAY).lerp(FALL_NIGHT, night);
			for (const { mesh, phase } of foam) mesh.scale.setScalar(0.8 + 0.25 * Math.sin(time * 0.006 + phase));
		}
	};
}

/** Bright vertical streaks, tiling, for flowing water. */
function streakTexture(rng: Rng): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 64;
	canvas.height = 128;
	const g = canvas.getContext('2d')!;
	// The texture multiplies the water colour: a slightly dark base with bright streaks.
	g.fillStyle = '#cfe2e2';
	g.fillRect(0, 0, 64, 128);
	for (let i = 0; i < 18; i++) {
		g.globalAlpha = rng.range(0.35, 0.8);
		g.fillStyle = '#ffffff';
		const x = rng.range(0, 64);
		const y = rng.range(0, 128);
		const h = rng.range(18, 48);
		g.fillRect(x, y, rng.range(2, 5), h);
		g.fillRect(x, y - 128, rng.range(2, 5), h); // wrap
	}
	g.globalAlpha = 1;
	const texture = new CanvasTexture(canvas);
	texture.wrapS = texture.wrapT = RepeatWrapping;
	texture.repeat.set(2, 2);
	return texture;
}
