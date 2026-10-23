// Visitors pointing at things: stations (and a few decor pieces that hide secret notes) light up
// under the cursor and report clicks or taps. Only hovering lights things: an open station shows
// its true colours. Everything is off while the dev placement tool's free camera is on, and during
// a flip.

import {
	Box3,
	Group,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshToonMaterial,
	Raycaster,
	Vector2,
	Vector3,
	type Material,
	type Object3D
} from 'three';
import type { StationId } from './config';
import type { SideId } from './sides';
import type { SideHandles, WorldHandles } from './world';

/** Warm glow added to whatever is lit. */
const GLOW = '#ffb45c';
const GLOW_INTENSITY = 0.32;
/** A press that moves further than this (px) is a drag, not a click. */
const CLICK_SLOP = 6;

export type Pick = { type: 'station'; id: StationId } | { type: 'secret'; id: string };

/** A secret note hidden in a decor piece: the kind, and for kinds with many copies, a point near the one. */
export interface SecretTarget {
	id: string;
	side: SideId;
	decor: string;
	near?: readonly [x: number, z: number];
}

export type Interaction = ReturnType<typeof createInteraction>;

export function createInteraction(
	handles: WorldHandles,
	secrets: SecretTarget[],
	onPick: (pick: Pick | null) => void
) {
	const { canvas, rig } = handles;
	const raycaster = new Raycaster();
	const ndc = new Vector2();

	/** One glowing copy per original material, shared by every mesh that uses it. */
	const glowing = new Map<Material, MeshToonMaterial>();
	const glowFor = (m: MeshToonMaterial) => {
		let g = glowing.get(m);
		if (!g) {
			g = m.clone();
			g.emissive.set(GLOW);
			g.emissiveIntensity = GLOW_INTENSITY;
			// Secret overlays sit exactly on their instance; this keeps them in front of it.
			g.polygonOffset = true;
			g.polygonOffsetFactor = -1;
			g.polygonOffsetUnits = -1;
			glowing.set(m, g);
		}
		return g;
	};
	const canGlow = (m: Material): m is MeshToonMaterial => m instanceof MeshToonMaterial && !m.transparent;

	/** Meshes wearing a glowing material, with what they wore before. */
	const swapped = new Map<Mesh, Material | Material[]>();
	/** Glowing stand-ins for a lit secret's instances (decor is instanced, so it can't glow alone). */
	const overlay = new Group();
	overlay.name = 'secret-glow';

	let hovered: Pick | null = null;

	const active = () => !rig.free && rig.controls.enabled;
	const side = () => handles.side();

	// --- Secrets: which decor copy each one hides in -------------------------------------------

	/** layout.decor index of each secret on `s`, re-found on use since the placement tool can shift them. */
	const secretIndices = (s: SideHandles) => {
		const byIndex = new Map<number, string>();
		for (const secret of secrets) {
			if (secret.side !== s.id) continue;
			let best = -1;
			let bestDistance = Infinity;
			s.layout.decor.forEach((p, i) => {
				if (p.kind !== secret.decor) return;
				const d = secret.near ? Math.hypot(p.at[0] - secret.near[0], p.at[1] - secret.near[1]) : 0;
				if (d < bestDistance) {
					best = i;
					bestDistance = d;
				}
			});
			if (best >= 0) byIndex.set(best, secret.id);
		}
		return byIndex;
	};

	const kindMeshes = (s: SideHandles, kind: string) =>
		s.props.decor.group.children.filter((o): o is InstancedMesh => o instanceof InstancedMesh && o.name === `decor-${kind}`);

	/** Each instanced mesh showing a secret's copy, with that copy's world matrix. */
	const secretInstances = (s: SideHandles, id: string) => {
		const secret = secrets.find((x) => x.id === id);
		const index = [...secretIndices(s)].find(([, sid]) => sid === id)?.[0];
		if (!secret || index === undefined) return [];
		const found: { mesh: InstancedMesh; matrix: Matrix4 }[] = [];
		for (const mesh of kindMeshes(s, secret.decor)) {
			for (let i = 0; i < mesh.count; i++) {
				if (s.props.decor.pick(mesh, i) !== index) continue;
				const matrix = new Matrix4();
				mesh.getMatrixAt(i, matrix);
				found.push({ mesh, matrix: matrix.premultiply(mesh.matrixWorld) });
			}
		}
		return found;
	};

	// --- Glow ------------------------------------------------------------------------------------

	const restore = () => {
		for (const [mesh, material] of swapped) mesh.material = material;
		swapped.clear();
		for (const child of [...overlay.children]) child.removeFromParent();
		overlay.removeFromParent();
	};

	const glowStation = (object: Object3D) =>
		object.traverse((o) => {
			if (!(o instanceof Mesh) || o instanceof InstancedMesh || swapped.has(o)) return;
			const original = o.material as Material | Material[];
			const list = [original].flat();
			if (!list.some(canGlow)) return;
			swapped.set(o, original);
			o.material = Array.isArray(original)
				? original.map((m) => (canGlow(m) ? glowFor(m) : m))
				: glowFor(original as MeshToonMaterial);
		});

	const glowSecret = (s: SideHandles, id: string) => {
		for (const { mesh, matrix } of secretInstances(s, id)) {
			if (!canGlow(mesh.material as Material)) continue;
			const stand = new Mesh(mesh.geometry, glowFor(mesh.material as MeshToonMaterial));
			stand.matrixAutoUpdate = false;
			stand.matrix.copy(matrix);
			overlay.add(stand);
		}
		// The side's root is upright whenever pointing works, so world matrices hold inside it.
		if (overlay.children.length) s.root.add(overlay);
	};

	const relight = () => {
		restore();
		const s = side();
		if (hovered?.type === 'station') {
			const object = s.props.stationObjects.get(hovered.id);
			if (object) glowStation(object);
		}
		if (hovered?.type === 'secret') glowSecret(s, hovered.id);
		canvas.style.cursor = hovered ? 'pointer' : '';
	};

	// --- Picking ---------------------------------------------------------------------------------

	const pickAt = (clientX: number, clientY: number): Pick | null => {
		const rect = canvas.getBoundingClientRect();
		ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
		raycaster.setFromCamera(ndc, rig.camera);
		const s = side();
		const indices = secretIndices(s);
		const kinds = new Set(secrets.filter((x) => x.side === s.id).map((x) => x.decor));
		const targets: Object3D[] = [...s.props.stationObjects.values(), ...[...kinds].flatMap((k) => kindMeshes(s, k))];
		for (const hit of raycaster.intersectObjects(targets, true)) {
			const material = (hit.object as Mesh).material as Material | undefined;
			// Smoke, glow panels and other effects don't count.
			if (!hit.object.visible || (material && !Array.isArray(material) && material.transparent)) continue;
			if (hit.instanceId !== undefined) {
				const index = s.props.decor.pick(hit.object, hit.instanceId);
				const id = index === null ? undefined : indices.get(index);
				if (id) return { type: 'secret', id };
				continue;
			}
			for (let o: Object3D | null = hit.object; o; o = o.parent) {
				if (o.userData.station) return { type: 'station', id: o.userData.station };
			}
		}
		return null;
	};

	const same = (a: Pick | null, b: Pick | null) => a?.type === b?.type && a?.id === b?.id;
	const setHovered = (next: Pick | null) => {
		if (same(hovered, next)) return;
		hovered = next;
		relight();
	};

	let pending = 0;
	let last = { x: 0, y: 0 };
	const onPointerMove = (e: PointerEvent) => {
		if (e.pointerType === 'touch') return;
		last = { x: e.clientX, y: e.clientY };
		if (pending) return;
		pending = requestAnimationFrame(() => {
			pending = 0;
			// While dragging to orbit, keep whatever was lit.
			if (e.buttons !== 0) return;
			setHovered(active() ? pickAt(last.x, last.y) : null);
		});
	};
	const onPointerLeave = () => setHovered(null);

	let down: { x: number; y: number; id: number } | null = null;
	const onPointerDown = (e: PointerEvent) => {
		down = e.button === 0 && active() ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
	};
	const onPointerUp = (e: PointerEvent) => {
		if (!down || down.id !== e.pointerId || !active()) return;
		const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
		down = null;
		if (moved > CLICK_SLOP) return;
		onPick(pickAt(e.clientX, e.clientY));
	};

	const offSideChange = handles.onSideChange(() => {
		hovered = null;
		relight();
	});

	canvas.addEventListener('pointermove', onPointerMove);
	canvas.addEventListener('pointerleave', onPointerLeave);
	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointerup', onPointerUp);

	// --- Where things are on screen -----------------------------------------------------------

	/** World-space box of a station's solid parts (effects like smoke left out). */
	const stationBox = (id: StationId): Box3 | null => {
		const object = side().props.stationObjects.get(id);
		if (!object) return null;
		const box = new Box3();
		const part = new Box3();
		object.updateWorldMatrix(true, true);
		object.traverse((o) => {
			if (!(o instanceof Mesh) || o instanceof InstancedMesh) return;
			if (![o.material].flat().some(canGlow)) return;
			if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
			box.union(part.copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld));
		});
		return box.isEmpty() ? null : box;
	};

	const secretBox = (id: string): Box3 | null => {
		const box = new Box3();
		const part = new Box3();
		for (const { mesh, matrix } of secretInstances(side(), id)) {
			if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
			box.union(part.copy(mesh.geometry.boundingBox!).applyMatrix4(matrix));
		}
		return box.isEmpty() ? null : box;
	};

	const topOf = (box: Box3 | null) => {
		if (!box) return null;
		const c = box.getCenter(new Vector3());
		return c.setY(box.max.y);
	};

	const projected = new Vector3();

	return {
		/** Stations on the side that's up. */
		stations: (): StationId[] => [...side().props.stationObjects.keys()],
		stationBox,
		/** The point just above a station, for its pin. */
		stationTop: (id: StationId) => topOf(stationBox(id)),
		/** The point just above a secret's decor piece, for its note. */
		secretTop: (id: string) => topOf(secretBox(id)),
		/** A world point in canvas pixels (CSS), or null if it's behind the camera. */
		toScreen(point: Vector3) {
			projected.copy(point).project(rig.camera);
			if (projected.z > 1) return null;
			return {
				x: ((projected.x + 1) / 2) * canvas.clientWidth,
				y: ((1 - projected.y) / 2) * canvas.clientHeight
			};
		},
		dispose() {
			cancelAnimationFrame(pending);
			restore();
			canvas.style.cursor = '';
			canvas.removeEventListener('pointermove', onPointerMove);
			canvas.removeEventListener('pointerleave', onPointerLeave);
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointerup', onPointerUp);
			offSideChange();
			// Maps belong to the originals.
			for (const g of glowing.values()) g.dispose();
		}
	};
}
