// The sky around the island, shared by both sides: clouds drifting slowly across behind it, and
// stars and a moon at night. It rides on the camera at the back of the view, sized to the view, so
// it keeps its look on any screen and at any zoom; the island hides whatever passes behind it.
// Tuned in `sky` (config.ts).

import {
	CanvasTexture,
	CircleGeometry,
	Color,
	Group,
	IcosahedronGeometry,
	Mesh,
	MeshBasicMaterial,
	type MeshToonMaterial,
	type OrthographicCamera
} from 'three';
import { sky } from './config';
import { createGlowPoints } from './glow-points';
import type { Materials } from './materials';
import type { Rng } from './rng';

/** How far behind the camera the sky sits (the camera's far plane is at twice its distance). */
const DEPTH = 140;
/** How far past the view's sides a cloud goes before it comes back round. */
const MARGIN = 0.45;

export interface Sky {
	tick(time: number, night: number): void;
	dispose(): void;
}

export function createSky(camera: OrthographicCamera, materials: Materials, rng: Rng): Sky {
	const owned: { dispose(): void }[] = [];
	const own = <T extends { dispose(): void }>(thing: T) => (owned.push(thing), thing);

	const layer = new Group();
	layer.name = 'sky';
	camera.add(layer);

	// Clouds: a few faceted puffs each, flat underneath, spread down the view so they never stack.
	const puff = own(new IcosahedronGeometry(1, 1));
	const cloudMaterial = own((materials.solid(sky.cloudDay) as MeshToonMaterial).clone());
	const cloudDay = new Color(sky.cloudDay);
	const cloudNight = new Color(sky.cloudNight);
	const shadeDay = new Color(sky.cloudDayShade);
	const shadeNight = new Color(sky.cloudNightShade);
	// Each cloud gets its own band of the view, in shuffled order.
	const order = Array.from({ length: sky.clouds }, (_, i) => i);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(rng.next() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	const clouds = order.map((band, i) => {
		const cloud = new Group();
		const width = rng.range(...sky.cloudWidth);
		const count = 3 + Math.floor(rng.range(0, 3));
		for (let k = 0; k < count; k++) {
			const t = (k / (count - 1)) * 2 - 1;
			const r = width * (0.27 - 0.1 * Math.abs(t)) * rng.range(0.85, 1.15);
			const mesh = new Mesh(puff, cloudMaterial);
			mesh.scale.set(r, r * 0.72, r);
			mesh.position.set(t * width * 0.36, r * 0.4, 0);
			mesh.rotation.set(rng.range(0, 6), rng.range(0, 6), rng.range(0, 6));
			cloud.add(mesh);
		}
		// A crown on top, off-centre.
		const top = new Mesh(puff, cloudMaterial);
		const r = width * 0.2;
		top.scale.set(r, r * 0.8, r);
		top.position.set(rng.range(-0.15, 0.15) * width, width * 0.17, -0.01);
		cloud.add(top);
		cloud.position.z = -i * 0.03;
		layer.add(cloud);
		return {
			cloud,
			// Bands from the bottom of the view to near the top.
			y: -0.95 + ((band + rng.range(0.15, 0.85)) / sky.clouds) * 1.85,
			start: rng.next(),
			seconds: rng.range(...sky.cloudCrossSeconds),
			bob: rng.range(0, Math.PI * 2)
		};
	});
	for (const c of clouds) c.cloud.traverse((o) => (o.raycast = () => {}));

	// Stars: denser towards the top, behind the clouds.
	const stars = createGlowPoints(
		Array.from({ length: sky.stars }, () => ({
			at: [rng.range(-2.6, 2.6), 1.05 - Math.pow(rng.next(), 1.4) * 2.1, -0.2] as const,
			size: rng.range(...sky.starSize),
			phase: rng.next()
		})),
		{ color: sky.star }
	);
	owned.push(stars);
	layer.add(stars.points);

	// The moon: a pale disc in a soft halo, upper right, where the moonlight comes from.
	const moon = new Group();
	const moonMaterial = own(new MeshBasicMaterial({ color: sky.moon, transparent: true }));
	const disc = new Mesh(own(new CircleGeometry(sky.moonRadius, 40)), moonMaterial);
	const haloMaterial = own(
		new MeshBasicMaterial({ map: own(haloTexture(sky.moon)), transparent: true, depthWrite: false })
	);
	const halo = new Mesh(own(new CircleGeometry(sky.moonRadius * 5, 40)), haloMaterial);
	halo.position.z = -0.01;
	moon.add(halo, disc);
	moon.position.z = -0.15;
	layer.add(moon);

	return {
		tick(time, night) {
			// Fit the layer to the view: units of its half-height, centred on it.
			const halfHeight = (camera.top - camera.bottom) / 2 / camera.zoom;
			const aspect = (camera.right - camera.left) / (camera.top - camera.bottom);
			// A view offset (the rig's lift and inset) moves what's on screen off the frustum's middle.
			const view = camera.view?.enabled ? camera.view : null;
			const offsetX = view ? ((view.offsetX + view.width / 2) / view.fullWidth - 0.5) * 2 * halfHeight * aspect : 0;
			const offsetY = view ? -((view.offsetY + view.height / 2) / view.fullHeight - 0.5) * 2 * halfHeight : 0;
			layer.position.set((camera.left + camera.right) / 2 + offsetX, (camera.top + camera.bottom) / 2 + offsetY, -DEPTH);
			layer.scale.setScalar(halfHeight);

			const span = aspect + MARGIN;
			for (const c of clouds) {
				const u = (c.start + time / 1000 / c.seconds) % 1;
				c.cloud.position.x = -span + u * span * 2;
				c.cloud.position.y = c.y + 0.008 * Math.sin(time * 0.0004 + c.bob);
			}
			cloudMaterial.color.copy(cloudDay).lerp(cloudNight, night);
			cloudMaterial.emissive.copy(shadeDay).lerp(shadeNight, night);

			stars.tick(time, night);
			moon.position.x = sky.moonAt[0] * aspect;
			moon.position.y = sky.moonAt[1];
			moonMaterial.opacity = night;
			haloMaterial.opacity = night * 0.3;
			moon.visible = night > 0.01;

		},
		dispose() {
			layer.removeFromParent();
			for (const thing of owned) thing.dispose();
		}
	};
}

/** A soft round glow, bright in the middle and fading to nothing at the edge. */
function haloTexture(color: string): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 64;
	const g = canvas.getContext('2d')!;
	const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
	const c = new Color(color);
	const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
	gradient.addColorStop(0, `rgba(${rgb}, 0.9)`);
	gradient.addColorStop(0.3, `rgba(${rgb}, 0.35)`);
	gradient.addColorStop(1, `rgba(${rgb}, 0)`);
	g.fillStyle = gradient;
	g.fillRect(0, 0, 64, 64);
	return new CanvasTexture(canvas);
}
