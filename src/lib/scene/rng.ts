/** Seeded randomness. Everything random in the scene draws from one Rng so the island is stable across loads. */

export interface Rng {
	/** Uniform float in [0, 1). */
	next(): number;
	/** Uniform float in [min, max). */
	range(min: number, max: number): number;
}

/** mulberry32: tiny, fast, good enough for procedural shapes. */
export function createRng(seed: number): Rng {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return { next, range: (min, max) => min + (max - min) * next() };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Periodic 1D value noise over t in [0, 1), in [-1, 1]. Used to wobble closed outlines. */
export function createLoopNoise(rng: Rng, knots: number): (t: number) => number {
	const n = Math.max(3, Math.round(knots));
	const values = Array.from({ length: n }, () => rng.range(-1, 1));
	return (t) => {
		const f = (((t % 1) + 1) % 1) * n;
		const i = Math.floor(f);
		const a = values[i % n];
		const b = values[(i + 1) % n];
		return a + (b - a) * smooth(f - i);
	};
}

/** 3D value noise in [-1, 1], with lattice values drawn from the rng. */
export function createNoise3(rng: Rng): (x: number, y: number, z: number) => number {
	const perm = Array.from({ length: 256 }, (_, i) => i);
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rng.next() * (i + 1));
		[perm[i], perm[j]] = [perm[j], perm[i]];
	}
	const values = Array.from({ length: 256 }, () => rng.range(-1, 1));
	const lattice = (x: number, y: number, z: number) =>
		values[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];

	return (x, y, z) => {
		const ix = Math.floor(x);
		const iy = Math.floor(y);
		const iz = Math.floor(z);
		const fx = smooth(x - ix);
		const fy = smooth(y - iy);
		const fz = smooth(z - iz);
		const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
		const plane = (zz: number) =>
			lerp(
				lerp(lattice(ix, iy, zz), lattice(ix + 1, iy, zz), fx),
				lerp(lattice(ix, iy + 1, zz), lattice(ix + 1, iy + 1, zz), fx),
				fy
			);
		return lerp(plane(iz), plane(iz + 1), fz);
	};
}
