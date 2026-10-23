// Dev-only Shapes mode: the control points of every tier and pond outline on the side that's up,
// shown as handles joined by a line. Dragging them edits a working copy of outlines.ts; saving
// writes it, and the reload rebuilds the terrain (and the waterfalls, which follow the ponds).

import {
	BufferAttribute,
	BufferGeometry,
	Group,
	LineBasicMaterial,
	LineLoop,
	Mesh,
	MeshBasicMaterial,
	SphereGeometry,
	type Raycaster,
	type Scene
} from 'three';
import type { Point } from '../scene/config';
import { outlineEdits } from '../scene/outlines';
import type { SideHandles } from '../scene/world';

interface Shape {
	id: string;
	kind: 'tier' | 'pond';
	/** Height the handles float at. */
	y: number;
	points: Point[];
	line: LineLoop;
	handles: Mesh[];
}

export type Shapes = ReturnType<typeof createShapes>;

export function createShapes(scene: Scene) {
	const group = new Group();
	group.name = 'dev-shapes';
	group.visible = false;
	scene.add(group);

	const edits = structuredClone(outlineEdits) as Record<string, Record<string, Point[]>>;
	let dirty = false;
	let side: SideHandles | undefined;
	let shapes: Shape[] = [];
	let selected: { id: string; index: number } | null = null;

	const sphere = new SphereGeometry(0.32, 10, 8);
	const look = (color: string) => ({
		handle: new MeshBasicMaterial({ color, depthTest: false, transparent: true }),
		line: new LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.85 })
	});
	const tierLook = look('#ffffff');
	const pondLook = look('#38d6ff');
	const pickedMaterial = new MeshBasicMaterial({ color: '#ff8a2a', depthTest: false, transparent: true });

	const clear = () => {
		for (const s of shapes) {
			s.line.geometry.dispose();
			s.line.removeFromParent();
			for (const h of s.handles) h.removeFromParent();
		}
		shapes = [];
	};

	const linePositions = (s: Shape) => new Float32Array(s.points.flatMap(([x, z]) => [x, s.y, z]));

	const build = () => {
		clear();
		if (!side) return;
		const own = edits[side.id] ?? {};
		const tierTop = new Map(side.config.tiers.map((t) => [t.id, t.top]));
		const add = (id: string, kind: Shape['kind'], y: number, base: Point[]) => {
			const points = (own[id] ?? base).map(([x, z]) => [x, z] as Point);
			const materials = kind === 'tier' ? tierLook : pondLook;
			const geometry = new BufferGeometry();
			const line = new LineLoop(geometry, materials.line);
			line.renderOrder = 998;
			const s: Shape = { id, kind, y, points, line, handles: [] };
			geometry.setAttribute('position', new BufferAttribute(linePositions(s), 3));
			group.add(line);
			s.handles = points.map(([x, z], index) => {
				const h = new Mesh(sphere, materials.handle);
				h.position.set(x, y, z);
				h.renderOrder = 999;
				h.userData = { shape: id, index };
				group.add(h);
				return h;
			});
			shapes.push(s);
		};
		for (const t of side.config.tiers) add(t.id, 'tier', t.top + 0.25, t.points);
		for (const p of side.config.ponds) add(p.id, 'pond', (tierTop.get(p.tier) ?? 0) + 0.1, p.points);
		highlight();
	};

	const find = (id: string) => shapes.find((s) => s.id === id);
	const highlight = () => {
		for (const s of shapes) {
			s.handles.forEach((h, i) => {
				const isPicked = selected?.id === s.id && selected.index === i;
				h.material = isPicked ? pickedMaterial : s.kind === 'tier' ? tierLook.handle : pondLook.handle;
			});
		}
	};
	const commit = (s: Shape) => {
		if (!side) return;
		(edits[side.id] ??= {})[s.id] = s.points.map(([x, z]) => [x, z] as Point);
		dirty = true;
	};

	return {
		get visible() {
			return group.visible;
		},
		get dirty() {
			return dirty;
		},
		show(on: boolean, current?: SideHandles) {
			group.visible = on;
			if (current) side = current;
			if (on) build();
		},
		/** Rebuilds the handles for another side (after a flip). */
		setSide(current: SideHandles) {
			side = current;
			selected = null;
			if (group.visible) build();
		},
		pick(raycaster: Raycaster): { id: string; index: number } | null {
			if (!group.visible) return null;
			const handles = shapes.flatMap((s) => s.handles);
			const hit = raycaster.intersectObjects(handles, false)[0];
			return hit ? { id: hit.object.userData.shape, index: hit.object.userData.index } : null;
		},
		select(target: { id: string; index: number } | null) {
			selected = target;
			highlight();
		},
		get(id: string, index: number) {
			const s = find(id);
			return s ? { x: s.points[index][0], z: s.points[index][1], y: s.y } : null;
		},
		/** Moves one control point. */
		set(id: string, index: number, x: number, z: number) {
			const s = find(id);
			if (!s) return;
			s.points[index] = [x, z];
			s.handles[index].position.set(x, s.y, z);
			s.line.geometry.setAttribute('position', new BufferAttribute(linePositions(s), 3));
			commit(s);
		},
		/** Adds a point halfway to the next one; returns its index. */
		insertAfter(id: string, index: number): number {
			const s = find(id);
			if (!s) return index;
			const [ax, az] = s.points[index];
			const [bx, bz] = s.points[(index + 1) % s.points.length];
			s.points.splice(index + 1, 0, [Math.round((ax + bx) * 50) / 100, Math.round((az + bz) * 50) / 100]);
			commit(s);
			build();
			return index + 1;
		},
		/** Removes a point (an outline keeps at least three). */
		remove(id: string, index: number): boolean {
			const s = find(id);
			if (!s || s.points.length <= 3) return false;
			s.points.splice(index, 1);
			commit(s);
			selected = null;
			build();
			return true;
		},
		/** Writes outlines.ts if anything changed. */
		async save() {
			if (!dirty) return;
			const res = await fetch('/__dev/outlines', { method: 'POST', body: JSON.stringify(edits) });
			if (!res.ok) throw new Error(await res.text());
			dirty = false;
		},
		dispose() {
			clear();
			scene.remove(group);
			sphere.dispose();
			for (const m of [tierLook.handle, tierLook.line, pondLook.handle, pondLook.line, pickedMaterial]) m.dispose();
		}
	};
}
