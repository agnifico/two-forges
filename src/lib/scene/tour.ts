// Camera tours: the camera flying on its own. Two of them:
// - the sweep after flipping to the war side: one fast lap round the island, dipping low towards
//   the horizon on the way and rising back to the visitor's view;
// - the idle flight: after a while with no input, the camera drifts round the island like a bird,
//   closer in, rising and dipping, wandering over different parts of it, until the visitor moves.
// Every tour ends where it began. Nothing flies under prefers-reduced-motion. Tuned in `tours` (config.ts).

import { MathUtils, Vector3 } from 'three';
import type { CameraRig } from './camera';
import { cameraConfig, tours } from './config';
import { prefersReducedMotion } from './focus';

interface View {
	target: Vector3;
	polar: number;
	azimuth: number;
	zoom: number;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const TAU = Math.PI * 2;

export type Tour = ReturnType<typeof createTour>;

/** `canIdle` says whether the idle flight may start now (nothing open, not flipping, and so on). */
export function createTour(rig: CameraRig, canIdle: () => boolean) {
	const { camera, controls } = rig;
	const offset = new Vector3();

	const read = (): View => {
		offset.subVectors(camera.position, controls.target);
		const r = offset.length() || 1;
		return {
			target: controls.target.clone(),
			polar: Math.acos(MathUtils.clamp(offset.y / r, -1, 1)),
			azimuth: Math.atan2(offset.x, offset.z),
			zoom: camera.zoom
		};
	};
	const write = (v: View) => {
		controls.target.copy(v.target);
		camera.position.setFromSphericalCoords(cameraConfig.distance, v.polar, v.azimuth).add(v.target);
		camera.lookAt(v.target);
		camera.zoom = v.zoom;
		camera.updateProjectionMatrix();
	};

	/** The flight under way: what kind, the view it set out from, and how to bring it home. */
	let flight: { kind: 'sweep' | 'idle'; land: () => Promise<void>; done: Promise<void> } | null = null;
	let lastInput = performance.now();

	/** Flies `path` (the view at `ms` into the flight, given where it started) until `ms` reaches `length`, or for ever. */
	const fly = (kind: 'sweep' | 'idle', path: (ms: number, from: View) => View, length = Infinity) => {
		const from = read();
		const wasEnabled = controls.enabled;
		controls.enabled = false;
		rig.setTouring(true);
		let frame = 0;
		let now = from;
		let resolve!: () => void;
		const done = new Promise<void>((r) => (resolve = r));
		const finish = () => {
			cancelAnimationFrame(frame);
			write(from);
			rig.setTouring(false);
			controls.enabled = wasEnabled;
			controls.update();
			if (flight === current) flight = null;
			resolve();
		};
		let landing = false;
		/** Eases from wherever it is back to where it started (the nearest way round). */
		const land = () => {
			if (landing) return done;
			landing = true;
			cancelAnimationFrame(frame);
			const back = { ...from, azimuth: now.azimuth + MathUtils.euclideanModulo(from.azimuth - now.azimuth + Math.PI, TAU) - Math.PI };
			const start = now;
			const t0 = performance.now();
			const step = (t: number) => {
				const e = easeInOut(Math.min(1, (t - t0) / tours.landMs));
				write({
					target: start.target.clone().lerp(back.target, e),
					polar: MathUtils.lerp(start.polar, back.polar, e),
					azimuth: MathUtils.lerp(start.azimuth, back.azimuth, e),
					zoom: MathUtils.lerp(start.zoom, back.zoom, e)
				});
				if (e < 1) frame = requestAnimationFrame(step);
				else finish();
			};
			frame = requestAnimationFrame(step);
			return done;
		};
		const current = { kind, land, done };
		flight = current;
		const t0 = performance.now();
		const step = (t: number) => {
			const ms = t - t0;
			if (ms >= length) return finish();
			now = path(ms, from);
			write(now);
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return current;
	};

	/** One lap round the island, low over it in the middle. */
	const sweepPath = (ms: number, from: View): View => {
		const u = ms / tours.sweepMs;
		const dip = Math.pow(Math.sin(Math.PI * u), 1.3);
		return {
			target: from.target,
			polar: MathUtils.lerp(from.polar, tours.sweepPolar, dip),
			azimuth: from.azimuth + TAU * easeInOut(u),
			zoom: from.zoom * (1 + tours.sweepZoom * dip)
		};
	};

	/** Round and round, closer in, rising and dipping, the view wandering over the island. */
	const idlePath = (ms: number, from: View): View => {
		const blend = MathUtils.smootherstep(ms, 0, tours.idleEaseMs);
		const t = ms / 1000;
		const reach = rig.fit.halfWidth * tours.idleWander;
		const wander = new Vector3(Math.cos((TAU * t) / 41), 0, Math.sin((TAU * t * 1.3) / 41)).multiplyScalar(reach * blend);
		return {
			target: from.target.clone().add(wander),
			polar: MathUtils.lerp(from.polar, tours.idlePolar + tours.idlePolarSwing * Math.sin((TAU * t) / 23), blend),
			azimuth: from.azimuth + (TAU * t * blend) / tours.idleLapSeconds,
			zoom: MathUtils.lerp(from.zoom, tours.idleZoom + 0.25 * Math.sin((TAU * t) / 31), blend)
		};
	};

	// Any input brings an idle flight home; only a deliberate one (click, scroll, key) cuts a sweep short.
	const onMove = () => {
		lastInput = performance.now();
		if (flight?.kind === 'idle') flight.land();
	};
	const onAct = () => {
		lastInput = performance.now();
		flight?.land();
	};
	const options = { passive: true, capture: true };
	window.addEventListener('pointermove', onMove, options);
	for (const type of ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const) window.addEventListener(type, onAct, options);
	const watch = setInterval(() => {
		if (flight || document.visibilityState !== 'visible' || prefersReducedMotion() || rig.free) return;
		if (performance.now() - lastInput > tours.idleAfterMs && canIdle()) fly('idle', idlePath);
	}, 500);

	return {
		/** The sweep after a flip to the war side. Resolves when the camera is home. */
		sweep() {
			if (prefersReducedMotion() || rig.free) return Promise.resolve();
			flight?.land();
			return fly('sweep', sweepPath, tours.sweepMs).done;
		},
		/** Brings any flight home (for other camera moves); resolves when it has landed. */
		settle(): Promise<void> {
			lastInput = performance.now();
			return flight ? flight.land() : Promise.resolve();
		},
		get flying() {
			return flight !== null;
		},
		dispose() {
			clearInterval(watch);
			window.removeEventListener('pointermove', onMove, options);
			for (const type of ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const) window.removeEventListener(type, onAct, options);
			if (flight) flight.land();
		}
	};
}
