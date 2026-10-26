// Camera moves for content: ease towards what's open (one station, or an interest's several), ease
// back to the overview when it closes, and a gentle settle when the island first appears. Every move
// keeps the visitor's orbit angle, and happens at once under prefers-reduced-motion.

import { Box3, MathUtils, Vector3 } from 'three';
import type { CameraRig } from './camera';

const EASE_MS = 900;
const INTRO_MS = 1400;
/** How much of the view's half-size the framed things may fill. */
const FILL = 0.4;
/** Zoom range for framing: never wider than the overview, never closer than this. */
const MIN_FOCUS_ZOOM = 1.1;
const MAX_FOCUS_ZOOM = 2.2;
/** The intro starts this much wider than the default view. */
const INTRO_ZOOM = 0.86;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const prefersReducedMotion = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export type Focus = ReturnType<typeof createFocus>;

export function createFocus(rig: CameraRig) {
	const { camera, controls } = rig;
	/** The zoom to go back to; set by the first focus after the overview. */
	let overviewZoom: number | null = null;
	/** The move under way: its frame request, and how to end it. */
	let move: { frame: number; done: Promise<void>; end: () => void } | null = null;

	const stop = () => {
		if (!move) return;
		cancelAnimationFrame(move.frame);
		move.end();
	};

	/** Eases the orbit target and zoom; resolves when the camera lands (or another move replaces it). */
	const moveTo = (target: Vector3, zoom: number, ms = EASE_MS): Promise<void> => {
		stop();
		zoom = MathUtils.clamp(zoom, controls.minZoom, controls.maxZoom);
		const offset = camera.position.clone().sub(controls.target);
		const fromTarget = controls.target.clone();
		const fromZoom = camera.zoom;
		const apply = (e: number) => {
			controls.target.lerpVectors(fromTarget, target, e);
			camera.position.copy(controls.target).add(offset);
			camera.zoom = MathUtils.lerp(fromZoom, zoom, e);
			camera.updateProjectionMatrix();
		};
		if (ms <= 0 || prefersReducedMotion()) {
			apply(1);
			controls.update();
			return Promise.resolve();
		}
		// The visitor's drags would fight the move; they get the camera back when it lands.
		controls.enabled = false;
		let resolve!: () => void;
		const current = {
			frame: 0,
			done: new Promise<void>((r) => (resolve = r)),
			end: () => {
				if (move === current) move = null;
				controls.enabled = true;
				resolve();
			}
		};
		move = current;
		const t0 = performance.now();
		const step = (now: number) => {
			const t = Math.min(1, (now - t0) / ms);
			apply(easeInOut(t));
			if (t < 1) current.frame = requestAnimationFrame(step);
			else current.end();
		};
		current.frame = requestAnimationFrame(step);
		return current.done;
	};

	return {
		/** Frames the given boxes: centred, as close as fits (within the focus zoom range). */
		frame(boxes: Box3[]) {
			if (!boxes.length) return Promise.resolve();
			const box = boxes.reduce((all, b) => all.union(b), new Box3());
			const centre = box.getCenter(new Vector3());
			const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
			const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
			let halfX = 0.5;
			let halfY = 0.5;
			const corner = new Vector3();
			for (let i = 0; i < 8; i++) {
				corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
				corner.sub(centre);
				halfX = Math.max(halfX, Math.abs(corner.dot(right)));
				halfY = Math.max(halfY, Math.abs(corner.dot(up)));
			}
			// The view's half-size at zoom 1, less what's under the hero or the sheet (the rig's lift).
			const zoom = Math.min((FILL * camera.right) / halfX, (FILL * rig.clearHalfHeight) / halfY);
			overviewZoom ??= camera.zoom;
			return moveTo(centre, MathUtils.clamp(zoom, MIN_FOCUS_ZOOM, MAX_FOCUS_ZOOM));
		},
		/**
		 * Back to the overview: centred on the island, at the zoom from before the first focus.
		 * Already there (or on the way), it just waits for the camera to land.
		 */
		release(): Promise<void> {
			if (overviewZoom === null) return move?.done ?? Promise.resolve();
			const zoom = overviewZoom;
			overviewZoom = null;
			return moveTo(rig.target.clone(), zoom);
		},
		/** The island settles in from a little further out. */
		intro() {
			if (prefersReducedMotion()) {
				camera.zoom = rig.homeZoom;
				camera.updateProjectionMatrix();
				return;
			}
			camera.zoom = rig.homeZoom * INTRO_ZOOM;
			camera.updateProjectionMatrix();
			moveTo(controls.target.clone(), rig.homeZoom, INTRO_MS);
		},
		dispose: stop
	};
}
