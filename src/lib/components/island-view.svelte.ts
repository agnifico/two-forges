// The island as the page sees it: loading progress, which side is up, day or night, what's lit and
// framed. Wraps the world (scene), the pointing layer and the camera moves behind a few reactive
// fields and calls that the layout drives from the URL.

import { Color, DefaultLoadingManager } from 'three';
import { tours, type StationId } from '../scene/config';
import { chooseTime, isNight } from '../scene/daylight';
import { createFocus, prefersReducedMotion, type Focus } from '../scene/focus';
import { createInteraction, type Interaction, type Pick, type SecretTarget } from '../scene/interaction';
import { sides, type SideId } from '../scene/sides';
import { createTour, type Tour } from '../scene/tour';
import { music } from './music.svelte';
import { createWorld, type World, type WorldHandles } from '../scene/world';

/** Below this relative luminance (mid grey is about 0.2) the page's text turns light. */
const DARK_SKY = 0.18;

export class IslandView {
	world = $state.raw<World>();
	handles = $state.raw<WorldHandles>();
	interaction = $state.raw<Interaction>();
	/** The first side is in and the canvas has faded up. */
	shown = $state(false);
	/** Held still behind the home page's front door (no idle flight) until the visitor enters. */
	held = $state(false);
	/** The island couldn't be built (no WebGL, or a load failed): the page offers /simplified instead. */
	failed = $state(false);
	/** Model loading, 0 to 1. */
	progress = $state(0);
	side = $state<SideId>('forge');
	/** The side that's up, or the one a flip under way is turning to. */
	heading = $state<SideId>('forge');
	canFlip = $state(false);
	flipping = $state(false);
	night = $state(false);
	/** Night (or day) was the visitor's own pick, not the clock's or the war side's. */
	nightChosen = $state(false);
	/** The scene's background colour, for the page around the canvas. */
	sky = $state(sides.forge.colors.background);
	dark = $state(false);

	#focus: Focus | undefined;
	#tour: Tour | undefined;
	/** The forge's day or night from before a flip to the war side (which turns to night), to go back to. */
	#forgeTime: { night: boolean; chosen: boolean } | null = null;
	#want: { side: SideId; stations: StationId[] } | null = null;
	#flip: Promise<void> | null = null;
	#lift = 0;
	#inset = 0;
	#frames = new Set<() => void>();
	#skyColor = new Color();

	/** Builds the world on `canvas`, starting on `start` (a deep link to the war side flips first). */
	mount(
		canvas: HTMLCanvasElement,
		{ start, secrets, onPick }: { start: SideId; secrets: SecretTarget[]; onPick: (pick: Pick | null) => void }
	) {
		let disposed = false;
		this.night = isNight();
		this.#setSky(new Color(sides.forge.colors[this.night ? 'backgroundNight' : 'background']));

		// GLTFLoader reports to the default manager when it's given none (props.ts gives none).
		const previousProgress = DefaultLoadingManager.onProgress;
		DefaultLoadingManager.onProgress = (_url, loaded, total) => {
			this.progress = total ? loaded / total : 0;
		};

		let world: World;
		try {
			world = createWorld(canvas);
		} catch (err) {
			console.error('The island could not be built.', err);
			this.failed = true;
			DefaultLoadingManager.onProgress = previousProgress;
			return () => {};
		}
		this.world = world;
		world.onSideChange((side) => (this.side = this.heading = side));
		world.flipReady.then((ready) => (this.canFlip = ready));
		world.ready.then(async (handles) => {
			if (disposed) return;
			if (!handles) {
				this.failed = true;
				return;
			}
			if (start !== world.current() && (await world.flipReady) && !disposed && start !== world.current()) {
				await world.flip({ instant: true });
			}
			if (disposed) return;
			this.handles = handles;
			handles.rig.setLift(this.#lift, true);
			handles.rig.setInset(this.#inset, true);
			this.interaction = createInteraction(handles, secrets, onPick);
			this.#focus = createFocus(handles.rig);
			this.#tour = createTour(handles.rig, () => this.shown && !this.held && !this.#want && !this.#flip);
			this.shown = true;
			if (this.#want) this.#apply(true);
			else this.#focus.intro();
		});

		let raf = 0;
		const tick = () => {
			raf = requestAnimationFrame(tick);
			const background = this.handles?.scene.background;
			if (background instanceof Color && !background.equals(this.#skyColor)) this.#setSky(background);
			for (const frame of this.#frames) frame();
		};
		raf = requestAnimationFrame(tick);

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			DefaultLoadingManager.onProgress = previousProgress;
			this.interaction?.dispose();
			this.#tour?.dispose();
			this.#focus?.dispose();
			world.dispose();
			this.world = this.handles = this.interaction = undefined;
		};
	}

	/** Runs `fn` every frame (to place pins and notes over the canvas); returns a stop function. */
	onFrame(fn: () => void) {
		this.#frames.add(fn);
		return () => this.#frames.delete(fn);
	}

	/** Frames stations on `side`, flipping there first if needed. */
	show(side: SideId, stations: StationId[]) {
		this.#want = { side, stations };
		return this.#apply(true);
	}

	/** Camera back to the overview. */
	clear() {
		this.#want = null;
		return this.#apply(false);
	}

	/** Turns the island over (at once under reduced motion). Resolves when it has landed. */
	async flip() {
		const world = this.world;
		if (!world) return;
		if (this.#flip) return this.#flip;
		this.#flip = (async () => {
			if (!(await world.flipReady)) return;
			this.flipping = true;
			const to: SideId = world.current() === 'forge' ? 'war' : 'forge';
			// Ease back out to the overview first, so the turn starts from the whole island.
			await this.#tour?.settle();
			await this.#focus?.release();
			this.heading = to;
			music.play('flip');
			this.#turnTime(to);
			await world.flip({ instant: prefersReducedMotion(), seconds: to === 'war' ? tours.warFlipSeconds : undefined });
			this.flipping = false;
			if (to === 'war') music.play('blade');
			// Landing on the war side with nothing to show: one low lap round it.
			if (to === 'war' && !this.#want) await this.#tour?.sweep();
		})();
		await this.#flip;
		this.#flip = null;
	}

	/** Keeps `pixels` on the canvas's right for content (see the rig's setInset). */
	setInset(pixels: number) {
		this.#inset = pixels;
		this.handles?.rig.setInset(pixels);
	}

	/** Raises the island's centre above the canvas centre (see the rig's setLift); eased once shown. */
	setLift(share: number) {
		this.#lift = share;
		this.handles?.rig.setLift(share);
	}

	toggleNight() {
		music.play('toggle');
		this.night = !this.night;
		this.nightChosen = true;
		// A pick on the war side is kept when going back to the forge.
		this.#forgeTime = null;
		chooseTime(this.night ? 'night' : 'day');
	}

	/** The war side is seen at night; going back, the forge gets its own time again. */
	#turnTime(to: SideId) {
		if (to === 'war') {
			this.#forgeTime = { night: this.night, chosen: this.nightChosen };
			if (!this.night) {
				this.night = true;
				this.nightChosen = false;
				chooseTime('night');
			}
		} else if (this.#forgeTime) {
			const { night, chosen } = this.#forgeTime;
			this.#forgeTime = null;
			if (night !== this.night) chooseTime(night ? 'night' : 'day');
			this.night = night;
			this.nightChosen = chosen;
		}
	}

	async #apply(mayFlip: boolean) {
		const want = this.#want;
		const { world, interaction } = this;
		if (!world || !interaction || !this.#focus) return;
		if (!want) {
			this.#focus.release();
			return;
		}
		await this.#tour?.settle();
		if (this.#want !== want) return;
		while (want.side !== world.current()) {
			if (!mayFlip || !(await world.flipReady)) return;
			await this.flip();
			if (this.#want !== want) return;
		}
		this.#focus.frame(want.stations.flatMap((id) => interaction.stationBox(id) ?? []));
	}

	#setSky(color: Color) {
		this.#skyColor.copy(color);
		this.sky = `#${color.getHexString()}`;
		// Colour components are linear, which is what relative luminance wants.
		const { r, g, b } = color;
		this.dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < DARK_SKY;
	}
}
