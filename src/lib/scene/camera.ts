import { Box3, MathUtils, Mesh, OrthographicCamera, Vector3, type Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cameraConfig } from './config';

/** Polar angle (from straight up) of a camera offset that is equal on x, y and z. */
export const ISO_POLAR = Math.acos(1 / Math.sqrt(3));

const UP = new Vector3(0, 1, 0);
const FIT_AZIMUTH_SAMPLES = 72;
/** How far visitors can pan beyond the island, as a share of its on-screen size. */
const PAN_SLACK = 0.35;
/** How quickly the view eases to a new lift, per frame. */
const LIFT_EASE = 0.12;

export type CameraRig = ReturnType<typeof createCameraRig>;

/** How a subject is framed: the orbit target and the largest on-screen half-extents it reaches. */
export interface Fit {
	target: Vector3;
	halfWidth: number;
	halfHeight: number;
}

/**
 * Orthographic isometric camera orbiting `subject`. Zoom 1 frames the subject at its widest
 * allowed angle, so up to zoom 1 it is never cropped while orbiting. Zooming further moves
 * towards the cursor, with the view kept over the subject (see update()).
 */
export function createCameraRig(canvas: HTMLCanvasElement, subject: Object3D) {
	const tilt = MathUtils.degToRad(cameraConfig.tiltRangeDeg);
	const azimuth = MathUtils.degToRad(cameraConfig.azimuthDeg);
	// Zoom 1 is framed for the narrow band; visitors may tilt further (the island may crop a little).
	const measure = (o: Object3D): Fit => measureFit(collectPoints(o), [ISO_POLAR - tilt, ISO_POLAR, ISO_POLAR + tilt]);
	const minPolar = ISO_POLAR - MathUtils.degToRad(cameraConfig.tiltUpDeg);
	const maxPolar = ISO_POLAR + MathUtils.degToRad(cameraConfig.tiltDownDeg);
	let fit = measure(subject);
	let size = { width: 1, height: 1 };
	/**
	 * How far above the canvas centre the orbit target sits, as a share of the half-height (0 =
	 * centred): phones lift the island clear of the hero or the content sheet below it.
	 */
	let lift = 0;
	let liftGoal = 0;
	/**
	 * Pixels on the canvas's right kept for content (desktop: the station card): the island is framed
	 * in the rest, centred there, while the canvas still draws the whole width.
	 */
	let inset = 0;
	let insetGoal = 0;
	/** The view's half-height left clear above and below the target at zoom 1 (less when lifted). */
	const clearHalfHeight = () => camera.top * (1 - lift);
	const applyFrustum = () => {
		const aspect = size.width / size.height;
		const usable = Math.max(0.3, 1 - inset / size.width);
		// Portrait screens frame the island a little closer and let its sides crop.
		const crop = aspect < 1 ? cameraConfig.portraitZoom : 1;
		const halfHeight = (Math.max(fit.halfHeight, fit.halfWidth / (aspect * usable)) * cameraConfig.fitMargin) / crop;
		camera.top = halfHeight;
		camera.bottom = -halfHeight;
		camera.left = -halfHeight * aspect;
		camera.right = halfHeight * aspect;
		// A view offset (not an uneven frustum, which zoom would scale about its middle) keeps the
		// target at the same height on screen at any zoom, and mid-way across the part left of the inset.
		if (lift || inset) camera.setViewOffset(size.width, size.height, inset / 2, (lift * size.height) / 2, size.width, size.height);
		else camera.clearViewOffset();
		camera.updateProjectionMatrix();
	};

	const camera = new OrthographicCamera(-1, 1, 1, -1, 1, cameraConfig.distance * 2);
	camera.position.setFromSphericalCoords(cameraConfig.distance, ISO_POLAR, azimuth).add(fit.target);
	camera.zoom = cameraConfig.defaultZoom;
	camera.lookAt(fit.target);

	const controls = new OrbitControls(camera, canvas);
	controls.target.copy(fit.target);
	controls.enableDamping = true;
	controls.dampingFactor = cameraConfig.dampingFactor;
	controls.rotateSpeed = cameraConfig.rotateSpeed;
	// Right-drag (or two fingers) pans a little; update() keeps the view near the island.
	controls.enablePan = true;
	controls.minPolarAngle = minPolar;
	controls.maxPolarAngle = maxPolar;
	controls.minZoom = cameraConfig.minZoom;
	controls.maxZoom = cameraConfig.maxZoom;
	controls.zoomToCursor = true;
	controls.update();

	const home = fit.target.clone();
	const right = new Vector3();
	const up = new Vector3();
	const shift = new Vector3();
	/** Free camera (dev placement tool): no tilt band, panning allowed, wide zoom, no view clamp. */
	let free = false;
	/** A camera tour (tour.ts) is flying the camera: the visitor's limits are off until it lands. */
	let touring = false;

	return {
		camera,
		controls,
		target: home,
		/**
		 * Steps the controls, then keeps the view centre within the island's on-screen extent:
		 * at zoom <= 1 it is pinned to the island centre, zoomed in it may follow the cursor
		 * until the view edge meets the island edge.
		 */
		update() {
			if (lift !== liftGoal) {
				lift = Math.abs(liftGoal - lift) < 1e-3 ? liftGoal : MathUtils.lerp(lift, liftGoal, LIFT_EASE);
				applyFrustum();
			}
			if (inset !== insetGoal) {
				inset = Math.abs(insetGoal - inset) < 0.5 ? insetGoal : MathUtils.lerp(inset, insetGoal, LIFT_EASE);
				applyFrustum();
			}
			controls.update();
			if (free || touring) return;
			right.set(1, 0, 0).applyQuaternion(camera.quaternion);
			up.set(0, 1, 0).applyQuaternion(camera.quaternion);
			shift.subVectors(controls.target, home);
			// The view may slide a little (PAN_SLACK of the island's size) even when it all fits.
			const slackX = Math.max(fit.halfWidth * PAN_SLACK, fit.halfWidth - camera.right / camera.zoom);
			const slackY = Math.max(fit.halfHeight * PAN_SLACK, fit.halfHeight - clearHalfHeight() / camera.zoom);
			const x = MathUtils.clamp(shift.dot(right), -slackX, slackX);
			const y = MathUtils.clamp(shift.dot(up), -slackY, slackY);
			// Rebuild the target from its on-screen offset alone. Moving camera and target together
			// along the view ray changes nothing in an orthographic view.
			shift.copy(home).addScaledVector(right, x).addScaledVector(up, y).sub(controls.target);
			if (shift.lengthSq() > 1e-10) {
				controls.target.add(shift);
				camera.position.add(shift);
			}
		},
		resize(width: number, height: number) {
			size = { width, height };
			applyFrustum();
		},
		/** Eases the orbit target to `share` of the half-height above the canvas centre (see lift). */
		setLift(share: number, instant = false) {
			liftGoal = share;
			if (instant) {
				lift = share;
				applyFrustum();
			}
		},
		/** Eases to keeping `pixels` on the canvas's right for content; the island is framed left of them. */
		setInset(pixels: number, instant = false) {
			insetGoal = pixels;
			if (instant) {
				inset = pixels;
				applyFrustum();
			}
		},
		get clearHalfHeight() {
			return clearHalfHeight();
		},
		/** Measures how `subject` would be framed (it should be upright and in place). */
		measure,
		get fit(): Fit {
			return fit;
		},
		/** True while the dev placement tool has the free camera on. */
		get free() {
			return free;
		},
		/**
		 * Lets a tour fly the camera anywhere (low over the island, close in), without the tilt band,
		 * zoom range or view clamp. The tour brings the camera back inside them before turning it off.
		 */
		setTouring(on: boolean) {
			if (free) return;
			touring = on;
			controls.minPolarAngle = on ? 0.05 : minPolar;
			controls.maxPolarAngle = on ? 1.45 : maxPolar;
			controls.minZoom = on ? 0.25 : cameraConfig.minZoom;
			controls.maxZoom = on ? 10 : cameraConfig.maxZoom;
		},
		/** Frames a blend of two fits (0 = a, 1 = b); used while the island flips between sides. */
		blendFit(a: Fit, b: Fit, t: number) {
			fit = {
				target: a.target.clone().lerp(b.target, t),
				halfWidth: MathUtils.lerp(a.halfWidth, b.halfWidth, t),
				halfHeight: MathUtils.lerp(a.halfHeight, b.halfHeight, t)
			};
			home.copy(fit.target);
			applyFrustum();
		},
		/** Camera position, orbit target and zoom, to restore the view (e.g. after a dev reload). */
		getState() {
			return {
				position: camera.position.toArray(),
				target: controls.target.toArray(),
				zoom: camera.zoom
			};
		},
		setState(state: { position: number[]; target: number[]; zoom: number }) {
			camera.position.fromArray(state.position);
			controls.target.fromArray(state.target);
			camera.zoom = MathUtils.clamp(state.zoom, controls.minZoom, controls.maxZoom);
			camera.updateProjectionMatrix();
			controls.update();
		},
		/**
		 * Free camera for editing: any tilt (down to below the horizon), panning (right-drag or
		 * Shift-drag) and a wide zoom range. Turning it off restores the visitor's limits at once.
		 */
		setFree(on: boolean) {
			free = on;
			controls.minPolarAngle = on ? 0 : minPolar;
			controls.maxPolarAngle = on ? Math.PI * 0.95 : maxPolar;
			controls.minZoom = on ? 0.25 : cameraConfig.minZoom;
			controls.maxZoom = on ? 10 : cameraConfig.maxZoom;
			// Arrow keys pan too, for trackpads without an easy right-drag.
			if (on) controls.listenToKeyEvents(window);
			else controls.stopListenToKeyEvents();
			if (!on) {
				camera.zoom = MathUtils.clamp(camera.zoom, controls.minZoom, controls.maxZoom);
				camera.updateProjectionMatrix();
			}
		},
		/** Looks at the current target from the given angles (radians); see setFromSphericalCoords. */
		viewFrom(polar: number, azimuthAngle: number) {
			camera.position
				.setFromSphericalCoords(cameraConfig.distance, Math.max(polar, 1e-4), azimuthAngle)
				.add(controls.target);
			camera.lookAt(controls.target);
			controls.update();
		},
		/** Back to the visitor's default view: isometric, centred, default zoom. */
		reset() {
			controls.target.copy(home);
			camera.zoom = cameraConfig.defaultZoom;
			camera.updateProjectionMatrix();
			this.viewFrom(ISO_POLAR, azimuth);
		},
		dispose() {
			controls.dispose();
		}
	};
}

/** World-space vertices of every mesh under `root`, thinned to a 0.2-unit grid. */
function collectPoints(root: Object3D): Vector3[] {
	root.updateMatrixWorld(true);
	const seen = new Set<string>();
	const points: Vector3[] = [];
	const p = new Vector3();
	root.traverse((o) => {
		if (!(o instanceof Mesh)) return;
		const pos = o.geometry.getAttribute('position');
		for (let i = 0; i < pos.count; i++) {
			p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
			const key = `${Math.round(p.x * 5)},${Math.round(p.y * 5)},${Math.round(p.z * 5)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			points.push(p.clone());
		}
	});
	return points;
}

/**
 * Picks an orbit target on the subject's vertical axis that centres it vertically in the default
 * view, then finds the largest half-extents it reaches on screen across all allowed angles.
 */
function measureFit(points: Vector3[], polars: number[]) {
	const target = new Box3().setFromPoints(points).getCenter(new Vector3());
	target.y = 0;

	let centreOffset = 0;
	for (let i = 0; i < FIT_AZIMUTH_SAMPLES; i++) {
		const e = viewExtents(points, target, ISO_POLAR, (i / FIT_AZIMUTH_SAMPLES) * Math.PI * 2);
		centreOffset += (e.minY + e.maxY) / 2 / FIT_AZIMUTH_SAMPLES;
	}
	// Raising the target by d moves everything down the screen by d * sin(polar).
	target.y = centreOffset / Math.sin(ISO_POLAR);

	let halfWidth = 0;
	let halfHeight = 0;
	for (const polar of polars) {
		for (let i = 0; i < FIT_AZIMUTH_SAMPLES; i++) {
			const e = viewExtents(points, target, polar, (i / FIT_AZIMUTH_SAMPLES) * Math.PI * 2);
			halfWidth = Math.max(halfWidth, -e.minX, e.maxX);
			halfHeight = Math.max(halfHeight, -e.minY, e.maxY);
		}
	}
	return { target, halfWidth, halfHeight };
}

/** Screen-space bounds of `points` for a camera orbiting `target` at the given angles. */
function viewExtents(points: Vector3[], target: Vector3, polar: number, azimuth: number) {
	const forward = new Vector3().setFromSphericalCoords(1, polar, azimuth).negate();
	const right = new Vector3().crossVectors(forward, UP).normalize();
	const up = new Vector3().crossVectors(right, forward);
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	const d = new Vector3();
	for (const p of points) {
		d.subVectors(p, target);
		const x = d.dot(right);
		const y = d.dot(up);
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
	return { minX, maxX, minY, maxY };
}
