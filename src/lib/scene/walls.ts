import { MathUtils, Vector2 } from 'three';
import type { DecorPlacement } from './config';
import type { WallRun } from './sides';
import { offsetOutline, type Island, type Outline } from './terrain';

/**
 * Lays a castle wall along a tier's edge (set in by `inset`): the edge is straightened into sides,
 * and each side gets wall blocks end to end, spaced a hair under a block's length so they overlap
 * slightly and never gap. Big towers stand on the corners, in the middle of long sides and beside
 * each opening where stairs land, with their flat faces along the wall's faces; the wall runs on
 * underneath them. Stretches where a higher tier covers the edge (a ridge, say) are left out.
 */
export function wallRunPlacements(run: WallRun, island: Island, tierTop: number): DecorPlacement[] {
	const outline = island.outlines[run.tier];
	if (!outline) throw new Error(`Wall run on unknown tier "${run.tier}"`);
	const line = offsetOutline(outline, -run.inset);
	const corners = straighten(line, run.blockLength);
	const gaps = island.landings.filter((l) => l.tier === run.tier).map((l) => nearestOn(line, l.at));

	const out: DecorPlacement[] = [];
	const onTier = (p: Vector2) => island.groundHeight(p.x, p.y) === tierTop;
	const inGap = (p: Vector2, extra: number) => gaps.some((g) => g.distanceTo(p) < run.gapWidth / 2 + extra);
	/** A wall block runs along its local z: this turn lays it along `d`. */
	const wallTurn = (d: Vector2) => MathUtils.radToDeg(Math.atan2(d.x, d.y));
	/** A tower's flat faces sit across its local z: this turn lines them up with a wall along `d`. */
	const towerTurn = (d: Vector2) => MathUtils.radToDeg(Math.atan2(-d.y, d.x));
	const tower = (at: Vector2, d: Vector2) =>
		out.push({ kind: run.tower, at: [at.x, at.y], rotationDeg: towerTurn(d), scale: run.towerScale });

	corners.forEach((a, i) => {
		const b = corners[(i + 1) % corners.length];
		const d = b.clone().sub(a);
		const length = d.length();
		d.normalize();
		const count = Math.max(1, Math.ceil(length / run.blockLength - 0.05));
		const spacing = length / count;
		for (let k = 0; k < count; k++) {
			const mid = a.clone().addScaledVector(d, (k + 0.5) * spacing);
			if (!onTier(mid) || inGap(mid, 0.3)) continue;
			out.push({ kind: run.wall, at: [mid.x, mid.y], rotationDeg: wallTurn(d) });
		}
		// Corner tower, lined up with the side that starts here; one more mid-way along long sides.
		if (onTier(a) && !inGap(a, run.towerLength)) tower(a, d);
		const mid = a.clone().addScaledVector(d, length / 2);
		if (count >= run.midTowerFrom && onTier(mid) && !inGap(mid, run.towerLength)) tower(mid, d);
	});

	// Towers flank each opening, astride the wall ends beside it.
	const lengths = line.map((p, i) => p.distanceTo(line[(i + 1) % line.length]));
	const total = lengths.reduce((x, y) => x + y, 0);
	const arcOf = (p: Vector2) => {
		let best = 0;
		let bestDistance = Infinity;
		let s = 0;
		line.forEach((q, i) => {
			if (q.distanceTo(p) < bestDistance) {
				bestDistance = q.distanceTo(p);
				best = s;
			}
			s += lengths[i];
		});
		return best;
	};
	const pointAt = (arc: number) => {
		let r = ((arc % total) + total) % total;
		for (let i = 0; i < line.length; i++) {
			const next = line[(i + 1) % line.length];
			if (r <= lengths[i]) return { at: line[i].clone().lerp(next, r / lengths[i]), d: next.clone().sub(line[i]).normalize() };
			r -= lengths[i];
		}
		return { at: line[0].clone(), d: new Vector2(1, 0) };
	};
	for (const g of gaps) {
		const s0 = arcOf(g);
		for (const sign of [-1, 1]) {
			const { at, d } = pointAt(s0 + sign * (run.gapWidth / 2 + run.towerLength / 2));
			if (onTier(at)) tower(at, d);
		}
	}
	return out;
}

/**
 * The corners of a closed line: points where it turns by more than ~25°, with corners closer than
 * `minSide` (a chamfer, say) merged into one.
 */
function straighten(line: Outline, minSide: number): Vector2[] {
	const n = line.length;
	// Turn at each point, measured over a few points either side to ignore small wobbles.
	const span = 3;
	const turn = line.map((_, i) => {
		const before = line[i].clone().sub(line[(i - span + n) % n]).normalize();
		const after = line[(i + span) % n].clone().sub(line[i]).normalize();
		return Math.acos(MathUtils.clamp(before.dot(after), -1, 1));
	});
	const threshold = MathUtils.degToRad(25);
	// Keep each local peak of turning above the threshold.
	let picks: Vector2[] = [];
	for (let i = 0; i < n; i++) {
		if (turn[i] < threshold) continue;
		if (turn[i] < turn[(i - 1 + n) % n] || turn[i] < turn[(i + 1) % n]) continue;
		picks.push(line[i].clone());
	}
	if (picks.length < 3) {
		// Round shape: fall back to evenly spaced points.
		picks = Array.from({ length: 12 }, (_, k) => line[Math.floor((k * n) / 12)].clone());
	}
	// Merge corners that sit closer than a side can be.
	const merged: Vector2[] = [];
	for (const p of picks) {
		const last = merged[merged.length - 1];
		if (last && last.distanceTo(p) < minSide) last.lerp(p, 0.5);
		else merged.push(p);
	}
	if (merged.length > 3 && merged[0].distanceTo(merged[merged.length - 1]) < minSide) {
		merged[0].lerp(merged.pop()!, 0.5);
	}
	return merged;
}

/** Index of the side (corners[i] → corners[i + 1]) nearest to `p`. */
function nearestSide(corners: Vector2[], p: Vector2): number {
	let best = 0;
	let bestDistance = Infinity;
	corners.forEach((a, i) => {
		const d = distanceToSegment(p, a, corners[(i + 1) % corners.length]);
		if (d < bestDistance) {
			bestDistance = d;
			best = i;
		}
	});
	return best;
}

function distanceToSegment(p: Vector2, a: Vector2, b: Vector2): number {
	const ab = b.clone().sub(a);
	const t = MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
	return a.clone().addScaledVector(ab, t).distanceTo(p);
}

/** The point on a closed line nearest to `p`. */
function nearestOn(line: Vector2[], p: Vector2): Vector2 {
	let best = line[0].clone();
	let bestDistance = Infinity;
	for (let i = 0; i < line.length; i++) {
		const a = line[i];
		const ab = line[(i + 1) % line.length].clone().sub(a);
		const t = MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
		const q = a.clone().addScaledVector(ab, t);
		const d = q.distanceTo(p);
		if (d < bestDistance) {
			bestDistance = d;
			best = q;
		}
	}
	return best;
}
