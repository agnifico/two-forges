// Dev-only placement tool: select, drag in, move, turn, scale and save decor and stations.
// Loaded only under `vite dev` (see SceneCanvas.svelte); never part of the production build.

import { MathUtils, Object3D, Raycaster, Vector2, type InstancedMesh } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { ISO_POLAR } from '../scene/camera';
import type { DecorPlacement, StationId } from '../scene/config';
import type { SideId } from '../scene/sides';
import type { WorldHandles } from '../scene/world';
import { createShapes } from './shapes';

export type Mode = 'translate' | 'rotate' | 'scale';
export type View = 'iso' | 'top' | 'front' | 'side';
export type Selection =
	| { type: 'decor'; index: number }
	| { type: 'station'; id: StationId }
	/** A control point of a tier or pond outline (Shapes mode). */
	| { type: 'point'; id: string; index: number };

/** What the panel shows for the selection. */
export interface SelectionInfo {
	type: Selection['type'];
	label: string;
	x: number;
	z: number;
	/** Null for outline points, which don't turn. */
	rotationDeg: number | null;
	/** Null for outline points, which don't scale. */
	scale: number | null;
}

export interface EditorEvents {
	select(info: SelectionInfo | null): void;
	/** The layout was edited and not yet saved. */
	change(): void;
}

export type Editor = ReturnType<typeof startEditor>;

/** MIME type the panel uses when a decor kind is dragged onto the canvas. */
export const DRAG_TYPE = 'text/x-forge-decor-kind';
const CAMERA_KEY = 'forge-placement-camera';
const SHAPES_KEY = 'forge-placement-shapes';
/** Which side was up when the layout was saved, so the reload comes back to it. */
export const SIDE_KEY = 'forge-placement-side';
const round = (n: number) => Math.round(n * 100) / 100;

export function startEditor(world: WorldHandles, events: EditorEvents) {
	const { canvas, scene, rig } = world;
	// Everything below works on whichever side is up.
	const side = () => world.side();
	const layoutNow = () => side().layout;
	const propsNow = () => side().props;
	const decorNow = () => side().props.decor;
	/** Sides edited since the last save. */
	const dirty = new Set<SideId>();

	// Editing uses the free camera.
	rig.setFree(true);

	// The gizmo drives a proxy; its transform is copied into the layout on every change.
	const proxy = new Object3D();
	proxy.rotation.order = 'YXZ'; // keeps rotation.y meaningful through full turns
	scene.add(proxy);
	const gizmo = new TransformControls(rig.camera, canvas);
	gizmo.setSpace('world');
	const helper = gizmo.getHelper();
	scene.add(helper);

	// Shapes mode: tier and pond outlines as draggable control points.
	const shapes = createShapes(scene);

	let selection: Selection | null = null;
	let mode: Mode = 'translate';
	/** Height unlocked: Move also drags up and down (saved as `lift`). Off, pieces stay on the ground. */
	let heightOn = false;
	let lastScale = 1;

	const info = (): SelectionInfo | null => {
		if (!selection) return null;
		if (selection.type === 'point') {
			const p = shapes.get(selection.id, selection.index);
			if (!p) return null;
			const label = `${selection.id} · point ${selection.index + 1}`;
			return { type: 'point', label, x: p.x, z: p.z, rotationDeg: null, scale: null };
		}
		const layout = layoutNow();
		if (selection.type === 'decor') {
			const p = layout.decor[selection.index];
			return { type: 'decor', label: p.kind, x: p.at[0], z: p.at[1], rotationDeg: p.rotationDeg ?? 0, scale: p.scale ?? 1 };
		}
		const s = layout.stations[selection.id];
		if (!s) return null;
		return { type: 'station', label: `station: ${selection.id}`, x: s.at[0], z: s.at[1], rotationDeg: s.rotationDeg, scale: s.scale ?? 1 };
	};

	const showHandles = () => {
		gizmo.setMode(selection?.type === 'point' ? 'translate' : mode);
		gizmo.showX = gizmo.mode !== 'rotate';
		gizmo.showY = gizmo.mode !== 'translate' || (heightOn && selection?.type !== 'point');
		gizmo.showZ = gizmo.mode !== 'rotate';
	};

	/** Puts the proxy where the selection is. */
	const syncProxy = () => {
		const current = info();
		if (!selection || !current) return;
		if (selection.type === 'point') {
			proxy.position.set(current.x, shapes.get(selection.id, selection.index)!.y, current.z);
			proxy.rotation.set(0, 0, 0);
			proxy.scale.setScalar(1);
			return;
		}
		const y =
			selection.type === 'decor'
				? (decorNow().heightAt(layoutNow().decor[selection.index]) ?? 0)
				: propsNow().stationObjects.get(selection.id)!.position.y;
		proxy.position.set(current.x, y, current.z);
		proxy.rotation.set(0, MathUtils.degToRad(current.rotationDeg ?? 0), 0);
		lastScale = current.scale ?? 1;
		proxy.scale.setScalar(lastScale);
	};

	const select = (next: Selection | null) => {
		selection = next;
		shapes.select(next?.type === 'point' ? { id: next.id, index: next.index } : null);
		if (next) {
			syncProxy();
			gizmo.attach(proxy);
			showHandles();
		} else {
			gizmo.detach();
		}
		events.select(info());
	};

	/** Copies the proxy into the layout and moves the selected thing to match. */
	const applyProxy = () => {
		if (!selection) return;
		const at = [round(proxy.position.x), round(proxy.position.z)] as const;
		if (selection.type === 'point') {
			shapes.set(selection.id, selection.index, at[0], at[1]);
			proxy.position.y = shapes.get(selection.id, selection.index)!.y;
			events.change();
			events.select(info());
			return;
		}
		const rotationDeg = round(MathUtils.radToDeg(proxy.rotation.y));
		// Scale stays uniform: take whichever axis the handle moved.
		const s = proxy.scale;
		const moved = [s.x, s.y, s.z].find((v) => Math.abs(v - lastScale) > 1e-4) ?? lastScale;
		lastScale = Math.max(0.05, round(moved));
		proxy.scale.setScalar(lastScale);
		if (selection.type === 'decor') {
			const p = layoutNow().decor[selection.index];
			Object.assign(p, { at, rotationDeg, scale: lastScale });
			if (heightOn) {
				const ground = decorNow().heightAt({ ...p, lift: 0 });
				const lift = ground === null ? 0 : round(proxy.position.y - ground);
				if (Math.abs(lift) < 0.01) delete p.lift;
				else p.lift = lift;
			}
			decorNow().update(selection.index);
			proxy.position.y = decorNow().heightAt(p) ?? proxy.position.y;
		} else {
			const station = propsNow().stationObjects.get(selection.id)!;
			let lift = layoutNow().stations[selection.id]?.lift;
			if (heightOn) {
				const ground = station.position.y - (lift ?? 0);
				lift = round(proxy.position.y - ground);
				if (Math.abs(lift) < 0.01) lift = undefined;
			}
			layoutNow().stations[selection.id] = {
				at,
				rotationDeg,
				...(lift !== undefined && { lift }),
				...(lastScale !== 1 && { scale: lastScale })
			};
			propsNow().placeStation(selection.id);
			proxy.position.y = propsNow().stationObjects.get(selection.id)!.position.y;
		}
		dirty.add(side().id);
		events.change();
		events.select(info());
	};

	gizmo.addEventListener('objectChange', applyProxy);
	gizmo.addEventListener('dragging-changed', (e) => {
		rig.controls.enabled = !e.value;
	});

	const raycaster = new Raycaster();
	const pointer = (e: { clientX: number; clientY: number }) => {
		const rect = canvas.getBoundingClientRect();
		raycaster.setFromCamera(
			new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
			rig.camera
		);
	};

	// Click (not drag) to select; clicking empty ground deselects.
	let down: { x: number; y: number } | null = null;
	const onPointerDown = (e: PointerEvent) => {
		down = gizmo.axis === null ? { x: e.clientX, y: e.clientY } : null;
	};
	const onPointerUp = (e: PointerEvent) => {
		if (!down || gizmo.dragging || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
		pointer(e);
		// In Shapes mode only outline points are picked.
		if (shapes.visible) {
			const point = shapes.pick(raycaster);
			return select(point ? { type: 'point', ...point } : null);
		}
		for (const hit of raycaster.intersectObject(propsNow().group, true)) {
			if (hit.instanceId !== undefined) {
				const index = decorNow().pick(hit.object as InstancedMesh, hit.instanceId);
				if (index !== null) return select({ type: 'decor', index });
			}
			for (let o: Object3D | null = hit.object; o; o = o.parent) {
				if (o.userData.station) return select({ type: 'station', id: o.userData.station });
			}
		}
		select(null);
	};

	/** Adds a decor copy; returns false (and adds nothing) where it can't stand. */
	const addDecor = async (placement: DecorPlacement) => {
		const layout = layoutNow();
		const decor = decorNow();
		layout.decor.push(placement);
		if (decor.heightAt(placement) === null) {
			layout.decor.pop();
			console.warn(`A ${placement.kind} can't stand there (off the island or in the pond).`);
			return false;
		}
		// A kind this side doesn't use yet has to load first.
		if (!(await propsNow().loadKind(placement.kind))) console.warn(`The ${placement.kind} model failed to load.`);
		decor.build(placement.kind);
		select({ type: 'decor', index: layout.decor.length - 1 });
		dirty.add(side().id);
		events.change();
		return true;
	};

	// Drop a decor kind from the panel onto the island.
	const onDragOver = (e: DragEvent) => {
		if (!e.dataTransfer?.types.includes(DRAG_TYPE)) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	};
	const onDrop = (e: DragEvent) => {
		const kind = e.dataTransfer?.getData(DRAG_TYPE);
		if (!kind || !decorNow().kinds.has(kind)) return;
		e.preventDefault();
		pointer(e);
		const hit = raycaster.intersectObject(side().island.group, true)[0];
		if (hit) addDecor({ kind, at: [round(hit.point.x), round(hit.point.z)], rotationDeg: 0, scale: 1 });
	};

	// A flip brings the other side up: drop the selection, which belonged to the old side.
	const offSideChange = world.onSideChange((now) => {
		select(null);
		shapes.setSide(now);
	});
	if (sessionStorage.getItem(SHAPES_KEY) === 'on') shapes.show(true, side());

	const api = {
		/** Puts back the camera view saved before the reload that follows a save. */
		restoreView() {
			const saved = sessionStorage.getItem(CAMERA_KEY);
			if (!saved) return;
			sessionStorage.removeItem(CAMERA_KEY);
			rig.setState(JSON.parse(saved));
		},
		/** Free camera on (editing) or the visitor's limited camera (to preview). */
		setFreeCamera(on: boolean) {
			rig.setFree(on);
		},
		/** Iso is the visitor's default view; the others look at the current target. */
		view(name: View) {
			if (name === 'iso') return rig.reset();
			const offset = rig.camera.position.clone().sub(rig.controls.target);
			const azimuth = Math.atan2(offset.x, offset.z);
			if (name === 'top') rig.viewFrom(0, azimuth);
			else rig.viewFrom(Math.PI / 2, MathUtils.degToRad(name === 'front' ? 45 : 135));
		},
		/** Unlocks height: Move gets an up/down handle. */
		setHeight(on: boolean) {
			heightOn = on;
			if (selection) showHandles();
		},
		setMode(next: Mode) {
			mode = next;
			if (selection) showHandles();
		},
		/** Sets the selection's position, turn or scale from the panel's fields. */
		/** Shapes mode: show tier and pond outlines as draggable points (and pick only those). */
		get shapes() {
			return shapes.visible;
		},
		toggleShapes() {
			const on = !shapes.visible;
			shapes.show(on, side());
			sessionStorage.setItem(SHAPES_KEY, on ? 'on' : 'off');
			select(null);
			return on;
		},
		setValues(values: Partial<Omit<SelectionInfo, 'type' | 'label'>>) {
			if (!selection) return;
			if (values.x !== undefined) proxy.position.x = values.x;
			if (values.z !== undefined) proxy.position.z = values.z;
			if (values.rotationDeg != null) proxy.rotation.y = MathUtils.degToRad(values.rotationDeg);
			if (values.scale != null) {
				lastScale = values.scale;
				proxy.scale.setScalar(values.scale);
			}
			applyProxy();
		},
		duplicate() {
			if (selection?.type === 'point') {
				const index = shapes.insertAfter(selection.id, selection.index);
				select({ type: 'point', id: selection.id, index });
				events.change();
				return;
			}
			if (selection?.type !== 'decor') return;
			const p = layoutNow().decor[selection.index];
			// One unit to the screen-right of the original.
			addDecor({ ...p, at: [round(p.at[0] + 0.9), round(p.at[1] - 0.9)] });
		},
		remove() {
			if (selection?.type === 'point') {
				if (shapes.remove(selection.id, selection.index)) {
					select(null);
					events.change();
				}
				return;
			}
			if (selection?.type !== 'decor') return;
			layoutNow().decor.splice(selection.index, 1);
			decorNow().buildAll(); // indices after it have shifted
			select(null);
			dirty.add(side().id);
			events.change();
		},
		deselect() {
			select(null);
		},
		/**
		 * Writes the layout file of every side edited since the last save (layout.ts, layout-war.ts).
		 * The dev server then reloads the scene; the side that was up and the camera view are kept.
		 */
		async save() {
			sessionStorage.setItem(CAMERA_KEY, JSON.stringify(rig.getState()));
			sessionStorage.setItem(SIDE_KEY, side().id);
			// Outlines first: they change the terrain the layouts stand on.
			await shapes.save();
			for (const id of dirty.size ? dirty : [side().id]) {
				const layout = world.sides().find((h) => h.id === id)?.layout;
				if (!layout) continue;
				const res = await fetch('/__dev/layout', { method: 'POST', body: JSON.stringify({ side: id, layout }) });
				if (!res.ok) {
					sessionStorage.removeItem(CAMERA_KEY);
					sessionStorage.removeItem(SIDE_KEY);
					throw new Error(await res.text());
				}
			}
			dirty.clear();
		},
		dispose() {
			canvas.removeEventListener('pointerdown', onPointerDown);
			canvas.removeEventListener('pointerup', onPointerUp);
			canvas.removeEventListener('dragover', onDragOver);
			canvas.removeEventListener('drop', onDrop);
			gizmo.detach();
			gizmo.dispose();
			scene.remove(helper, proxy);
			offSideChange();
			shapes.dispose();
			rig.controls.enabled = true;
			rig.setFree(false);
		}
	};

	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointerup', onPointerUp);
	canvas.addEventListener('dragover', onDragOver);
	canvas.addEventListener('drop', onDrop);
	return api;
}
