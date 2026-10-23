// The Seventh Floor's mirror. What it reflects is captured once (and again when day turns to night)
// from the glass itself, looking out past the hero towards the gate, then shown flipped on the glass
// and slid a little as the view turns, so it reads as depth. The hero is left out of the capture:
// where his reflection would be, there is only a warm glow.

import {
	AdditiveBlending,
	Box3,
	CanvasTexture,
	ClampToEdgeWrapping,
	Group,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PlaneGeometry,
	Vector3,
	WebGLRenderTarget,
	type Camera,
	type Object3D,
	type Scene,
	type WebGLRenderer
} from 'three';
import { mirror as config } from './config';

export interface Mirror {
	/** Renders the reflection; everything else in the scene must already be as it should appear. */
	capture(renderer: WebGLRenderer, scene: Scene, night: number): void;
	/** Night level of the last capture (recapture when it drifts). */
	capturedAt(): number;
	/** Slides the reflection with the view. */
	tick(time: number, view: Camera): void;
	dispose(): void;
}

/** `station` holds the mirror model (see `mirror.surface` for its pane); `hide` is left out of the reflection. */
export function createMirror(station: Object3D, hide: Object3D | undefined): Mirror | undefined {
	station.updateMatrixWorld(true);
	const glass = findSurface(station, config.surface);
	if (!glass) return undefined;

	// The glass's extent in the station's frame, from its own triangles only.
	const toStation = new Matrix4().copy(station.matrixWorld).invert().multiply(glass.matrixWorld);
	const box = new Box3();
	const position = glass.geometry.getAttribute('position');
	const index = glass.geometry.getIndex();
	const v = new Vector3();
	const count = index ? index.count : position.count;
	for (let i = 0; i < count; i++) box.expandByPoint(v.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(toStation));
	const size = box.getSize(new Vector3());
	const centre = box.getCenter(new Vector3());

	const target = new WebGLRenderTarget(config.resolution[0], config.resolution[1]);
	const texture = target.texture;
	texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
	// Zoomed in a little, so it can slide; flipped left to right, as a mirror is.
	const zoom = config.zoom;
	texture.repeat.set(-zoom, zoom);
	texture.offset.set(0.5 + zoom / 2, (1 - zoom) / 2);

	const group = new Group();
	group.name = 'mirror-reflection';
	const surface = new Mesh(
		new PlaneGeometry(size.x * 0.96, size.y * 0.96),
		new MeshBasicMaterial({ map: texture, color: config.tint })
	);
	// Just proud of the frame, which stands a little in front of the pane.
	group.position.set(centre.x, centre.y, box.max.z + config.inset);
	group.add(surface);

	const sun = new Mesh(
		new PlaneGeometry(config.sunSize, config.sunSize),
		new MeshBasicMaterial({ map: sunTexture(config.sun), transparent: true, depthWrite: false, blending: AdditiveBlending })
	);
	const sunY = config.sunHeight - centre.y;
	sun.position.set(0, sunY, 0.01);
	group.add(sun);
	station.add(group);
	for (const o of [surface, sun]) o.raycast = () => {};

	const eye = new PerspectiveCamera(config.fov, size.x / size.y, 0.3, 120);
	let captured = -1;
	const out = new Vector3();
	const right = new Vector3();

	return {
		capture(renderer, scene, night) {
			// From the middle of the glass, looking out of it (the station's +z).
			station.updateMatrixWorld(true);
			eye.position.copy(group.position).applyMatrix4(station.matrixWorld);
			out.set(0, 0, 1).transformDirection(station.matrixWorld);
			eye.lookAt(eye.position.clone().add(out));
			eye.updateMatrixWorld();
			const was = { group: group.visible, hide: hide?.visible };
			group.visible = false;
			if (hide) hide.visible = false;
			const before = renderer.getRenderTarget();
			renderer.setRenderTarget(target);
			renderer.render(scene, eye);
			renderer.setRenderTarget(before);
			group.visible = was.group;
			if (hide) hide.visible = was.hide!;
			captured = night;
		},
		capturedAt: () => captured,
		tick(time, view) {
			// How far the view has turned across the glass: the reflection slides the other way, the
			// sun (nearer, in the reflection) a little further.
			view.getWorldDirection(out);
			right.set(1, 0, 0).transformDirection(station.matrixWorld);
			const turn = Math.max(-1, Math.min(1, out.dot(right)));
			texture.offset.x = 0.5 + zoom / 2 + turn * config.parallax;
			sun.position.x = -turn * config.parallax * size.x * 1.6;
			const pulse = 1 + 0.06 * Math.sin(time * 0.0015);
			sun.scale.set(pulse, pulse, 1);
		},
		dispose() {
			group.removeFromParent();
			target.dispose();
			surface.geometry.dispose();
			(surface.material as MeshBasicMaterial).dispose();
			sun.geometry.dispose();
			const sunMaterial = sun.material as MeshBasicMaterial;
			sunMaterial.map?.dispose();
			sunMaterial.dispose();
		}
	};
}

function findSurface(root: Object3D, material: string): Mesh | undefined {
	let found: Mesh | undefined;
	root.traverse((o) => {
		if (found || !(o instanceof Mesh)) return;
		const materials = [o.material].flat() as { name: string }[];
		if (materials.some((m) => m.name === material)) found = o;
	});
	return found;
}

/** A soft round glow: bright at the heart, fading to nothing. */
function sunTexture(color: string): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 128;
	const g = canvas.getContext('2d')!;
	const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	glow.addColorStop(0, `${color}ff`);
	glow.addColorStop(0.18, `${color}e6`);
	glow.addColorStop(0.5, `${color}55`);
	glow.addColorStop(1, `${color}00`);
	g.fillStyle = glow;
	g.fillRect(0, 0, 128, 128);
	return new CanvasTexture(canvas);
}
