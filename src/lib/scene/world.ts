import {
	Box3,
	Color,
	DirectionalLight,
	Group,
	HemisphereLight,
	MathUtils,
	Mesh,
	Quaternion,
	Scene,
	Sphere,
	Vector3,
	type Object3D
} from 'three';
import { createCameraRig, type CameraRig, type Fit } from './camera';
import { createDaylight } from './daylight';
import { SEED, lighting, palette, type Layout, type StationId } from './config';
import { createMaterials, type Materials } from './materials';
import { loadProps, type Props } from './props';
import { createRenderer, startLoop } from './renderer';
import { createRng } from './rng';
import { createMirror, type Mirror } from './mirror';
import { createSky } from './sky';
import { sides, type SideConfig, type SideId } from './sides';
import { buildIsland, type Island } from './terrain';

const FLIP_SECONDS = 1.8;
/** How far the view eases out mid-flip, so the turning island stays in frame. */
const FLIP_ZOOM_DIP = 0.25;

/** One side of the island, built and placed. */
export interface SideHandles {
	id: SideId;
	config: SideConfig;
	/** Holds the side's terrain and props; the flip turns this. */
	root: Group;
	island: Island;
	props: Props;
	/** Working copy of the side's layout file; the placement tool edits it in place. */
	layout: Layout;
	fit: Fit;
	/** Radius of the sphere the sun's shadows must cover. */
	shadowRadius: number;
}

/** Everything the dev placement tool needs to work on a running scene. */
export interface WorldHandles {
	canvas: HTMLCanvasElement;
	scene: Scene;
	rig: CameraRig;
	/** The side that's up. */
	side(): SideHandles;
	/** Every side built so far. */
	sides(): SideHandles[];
	onSideChange(listener: (side: SideHandles) => void): () => void;
}

export interface World {
	/** Resolves once the forge is in and rendering has started (undefined if disposed first). */
	ready: Promise<WorldHandles | undefined>;
	/** Resolves true once the other side has loaded in the background and the island can flip. */
	flipReady: Promise<boolean>;
	/** Turns the island over. `instant` skips the animation (dev reloads); `seconds` sets its pace. */
	flip(options?: { instant?: boolean; seconds?: number }): Promise<void>;
	/** The side that's up. */
	current(): SideId;
	onSideChange(listener: (side: SideId) => void): () => void;
	dispose(): void;
}

/**
 * Builds the scene on `canvas`. The forge side builds and loads first; rendering starts once its
 * models are in, so the camera fit includes them. The war side then loads in the background, hidden,
 * and flip() turns the island over to show it. Call dispose() to tear everything down.
 */
export function createWorld(canvas: HTMLCanvasElement): World {
	const materials = createMaterials();
	const scene = new Scene();
	scene.background = new Color(sides.forge.colors.background);

	let disposed = false;
	let stage: Stage | undefined;
	const built: Partial<Record<SideId, SideHandles>> = {};
	let up: SideId = 'forge';
	let flipping: Promise<void> | undefined;
	const listeners = new Set<(side: SideId) => void>();

	const ready = buildSide('forge', materials, createRng(SEED))
		.then((forge): WorldHandles | undefined => {
			if (disposed || !forge) {
				forge?.props.dispose();
				return undefined;
			}
			built.forge = forge;
			scene.add(forge.root);
			stage = start(canvas, scene, forge, materials);
			stage.addTicker((time, night) => forge.root.visible && forge.props.tick(time, night));
			const rig = stage.rig;
			forge.fit = rig.fit;
			return {
				canvas,
				scene,
				rig,
				side: () => built[up]!,
				sides: () => Object.values(built),
				onSideChange(listener) {
					const wrapped = () => listener(built[up]!);
					listeners.add(wrapped);
					return () => listeners.delete(wrapped);
				}
			};
		})
		.catch((err) => {
			console.error('The forge could not be built.', err);
			return undefined;
		});

	// The war side loads only after the forge is showing, so it never slows the first view.
	const flipReady = ready.then(async (handles) => {
		if (!handles || disposed) return false;
		await new Promise((r) => setTimeout(r, 300));
		const war = await buildSide('war', materials, createRng(SEED + 1)).catch((err) => {
			console.error('The war side could not be built.', err);
			return undefined;
		});
		if (!war || disposed || !stage) {
			war?.props.dispose();
			return false;
		}
		scene.add(war.root);
		war.root.updateMatrixWorld(true);
		war.fit = stage.rig.measure(war.root);
		war.root.visible = false;
		built.war = war;
		stage.addTicker((time, night) => war.root.visible && war.props.tick(time, night));
		watchMirror(war);
		return true;
	});

	/**
	 * The Seventh Floor's mirror: captured with only its side showing (and no sky), and again
	 * whenever the light has changed since. Never mid-flip, while the sides are turned.
	 */
	let mirror: Mirror | undefined;
	const watchMirror = (side: SideHandles) => {
		const glass = side.props.stationObjects.get('seventhFloor');
		mirror = glass && createMirror(glass, side.props.stationObjects.get('hero'));
		if (!mirror || !stage) return;
		const { renderer, rig } = stage;
		stage.addTicker((time, night) => {
			if (!mirror) return;
			if (!flipping && Math.abs(night - mirror.capturedAt()) > 0.2) {
				const shown = Object.values(built).map((s) => [s, s.root.visible] as const);
				for (const [s] of shown) s.root.visible = s === side;
				rig.camera.visible = false;
				mirror.capture(renderer, scene, night);
				rig.camera.visible = true;
				for (const [s, visible] of shown) s.root.visible = visible;
			}
			if (side.root.visible) mirror.tick(time, rig.camera);
		});
	};

	const flip = async ({ instant = false, seconds = FLIP_SECONDS } = {}) => {
		if (flipping) return flipping;
		const from = built[up];
		const to = built[up === 'forge' ? 'war' : 'forge'];
		if (!from || !to || !stage) return;
		flipping = stage.turn(from, to, instant ? 0 : seconds).then(() => {
			up = to.id;
			flipping = undefined;
			for (const listener of listeners) listener(up);
		});
		return flipping;
	};

	return {
		ready,
		flipReady,
		flip,
		current: () => up,
		onSideChange(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose() {
			disposed = true;
			mirror?.dispose();
			stage?.stop();
			for (const side of Object.values(built)) {
				side.props.dispose();
				side.island.group.traverse((o) => {
					if (o instanceof Mesh) o.geometry.dispose();
				});
			}
			materials.dispose();
		}
	};
}

/** Builds a side's terrain and loads its props; the result is upright at the origin. */
async function buildSide(
	id: SideId,
	materials: Materials,
	rng: ReturnType<typeof createRng>
): Promise<SideHandles | undefined> {
	const layout = structuredClone(sides[id].layout);
	const config: SideConfig = { ...sides[id], layout };
	const island = buildIsland(config, rng, materials);
	const props = await loadProps(config, materials, rng, island).catch((err) => {
		console.error(`Models for the ${id} side could not be placed; showing slot discs instead.`, err);
		return undefined;
	});
	if (!props) return undefined;
	removeDiscs(island.group, props.stations);
	const root = new Group();
	root.name = `side-${id}`;
	root.add(island.group, props.group);
	root.updateMatrixWorld(true);
	const shadowRadius = new Box3().setFromObject(root).getBoundingSphere(new Sphere()).radius;
	// The fit is measured once the camera exists (see createWorld).
	const fit: Fit = { target: new Vector3(), halfWidth: 0, halfHeight: 0 };
	return { id, config, root, island, props, layout, fit, shadowRadius };
}

function removeDiscs(island: Object3D, stations: StationId[]) {
	for (const id of stations) {
		const disc = island.getObjectByName(`slot-${id}`);
		if (disc instanceof Mesh) {
			disc.removeFromParent();
			disc.geometry.dispose();
		}
	}
}

type Stage = ReturnType<typeof start>;

/** Adds the camera and lights around the first side, starts rendering, and runs flips. */
function start(canvas: HTMLCanvasElement, scene: Scene, first: SideHandles, materials: Materials) {
	// Measure before lights go in: the fit and the shadow box cover meshes only.
	const rig = createCameraRig(canvas, first.root);

	const sun = new DirectionalLight(palette.sun, lighting.sunIntensity);
	sun.position.copy(rig.target).add(new Vector3(...lighting.sunPosition));
	sun.target.position.copy(rig.target);
	sun.castShadow = true;
	sun.shadow.mapSize.setScalar(lighting.shadowMapSize);
	sun.shadow.radius = lighting.shadowRadius;
	sun.shadow.intensity = lighting.shadowIntensity;
	sun.shadow.bias = -0.0005;
	sun.shadow.normalBias = 0.03;
	const sunDistance = sun.position.distanceTo(rig.target);
	const coverShadows = (radius: number) => {
		const cam = sun.shadow.camera;
		cam.left = cam.bottom = -radius;
		cam.right = cam.top = radius;
		cam.near = Math.max(0.1, sunDistance - radius);
		cam.far = sunDistance + radius;
		cam.updateProjectionMatrix();
	};
	coverShadows(first.shadowRadius);
	const hemi = new HemisphereLight(palette.hemiSky, palette.hemiGround, lighting.hemiIntensity);
	scene.add(sun, sun.target, hemi);

	// Time of day: light, sky and night glows follow the visitor's clock. The page background is the
	// side's daytime colour (`base`, blended while flipping) seen at the current light.
	const daylight = createDaylight(sun, hemi, rig.target);
	const base = new Color(first.config.colors.background);
	const baseNight = new Color(first.config.colors.backgroundNight);
	const tickers: ((time: number, night: number) => void)[] = [];

	// Clouds, stars and the moon ride on the camera, so it joins the scene.
	scene.add(rig.camera);
	const sky = createSky(rig.camera, materials, createRng(SEED + 7));

	let animate: ((now: number) => void) | undefined;
	const renderer = createRenderer(canvas);
	const stopLoop = startLoop(renderer, scene, rig.camera, {
		onResize: rig.resize,
		onFrame: () => {
			const now = performance.now();
			animate?.(now);
			const { night } = daylight.update(now);
			daylight.sky(base, baseNight, scene.background as Color);
			for (const tick of tickers) tick(now, night);
			sky.tick(now, night);
			rig.update();
		}
	});

	/**
	 * Turns `from` over (about a horizontal axis across the screen, through the view centre) while
	 * `to` comes up from underneath. Only one side is ever visible: they swap halfway through. The framing, background and shadows blend from one side to the other.
	 */
	const turn = (from: SideHandles, to: SideHandles, seconds: number) =>
		new Promise<void>((resolve) => {
			const camera = rig.camera;
			const controls = rig.controls;
			// Screen-left, so a positive turn tips the top away from the viewer.
			const axis = new Vector3(-1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
			const pivot = from.fit.target.clone();
			const offset = camera.position.clone().sub(controls.target);
			const startTarget = controls.target.clone();
			const startZoom = camera.zoom;
			const background = base;
			const fromColor = new Color(from.config.colors.background);
			const toColor = new Color(to.config.colors.background);
			const fromNight = new Color(from.config.colors.backgroundNight);
			const toNight = new Color(to.config.colors.backgroundNight);
			const wasEnabled = controls.enabled;
			controls.enabled = false;

			const q = new Quaternion();
			const place = (root: Group, angle: number) => {
				q.setFromAxisAngle(axis, angle);
				root.quaternion.copy(q);
				// Turn about the pivot rather than the origin.
				root.position.copy(pivot).sub(pivot.clone().applyQuaternion(q));
			};
			let swapped = false;
			const swap = () => {
				swapped = true;
				from.root.visible = false;
				to.root.visible = true;
				coverShadows(to.shadowRadius);
			};

			const finish = () => {
				animate = undefined;
				from.root.quaternion.identity();
				from.root.position.set(0, 0, 0);
				to.root.quaternion.identity();
				to.root.position.set(0, 0, 0);
				if (!swapped) swap();
				background.copy(toColor);
				baseNight.copy(toNight);
				rig.blendFit(from.fit, to.fit, 1);
				controls.target.copy(to.fit.target);
				camera.position.copy(to.fit.target).add(offset);
				camera.zoom = MathUtils.clamp(startZoom, controls.minZoom, controls.maxZoom);
				camera.updateProjectionMatrix();
				controls.enabled = wasEnabled;
				controls.update();
				resolve();
			};
			if (seconds <= 0) return finish();

			const t0 = performance.now();
			animate = (now) => {
				const t = Math.min(1, (now - t0) / (seconds * 1000));
				const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
				const angle = Math.PI * e;
				// Swap halfway, when the island stands on edge: by then the outgoing side shows its rocky
				// belly, and the incoming side appears face-on and upright, so neither is seen inverted.
				if (!swapped && angle >= Math.PI / 2) swap();
				place(from.root, angle);
				place(to.root, angle - Math.PI);

				rig.blendFit(from.fit, to.fit, e);
				controls.target.copy(startTarget).lerp(to.fit.target, e);
				camera.position.copy(controls.target).add(offset);
				camera.zoom = startZoom * (1 - FLIP_ZOOM_DIP * Math.sin(Math.PI * t));
				camera.updateProjectionMatrix();
				background.copy(fromColor).lerp(toColor, e);
				baseNight.copy(fromNight).lerp(toNight, e);
				if (t >= 1) finish();
			};
		});

	return {
		rig,
		renderer,
		turn,
		/** Runs every frame with the time and how dark it is (0 day, 1 night). */
		addTicker(tick: (time: number, night: number) => void) {
			tickers.push(tick);
		},
		stop() {
			animate = undefined;
			stopLoop();
			rig.dispose();
			scene.remove(sun, sun.target, hemi, rig.camera);
			sky.dispose();
			sun.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
		}
	};
}
