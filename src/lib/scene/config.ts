/**
 * Hand-tweakable scene config: palette, tier shapes, pond, stairs and station slots.
 *
 * Layout coordinates are world [x, z]. The default isometric camera looks from the +x/+z corner,
 * so the island reads as a diamond:
 *   +x runs towards the bottom-right of the screen, +z towards the bottom-left
 *   front corner (screen bottom) = +x +z, back corner (screen top) = -x -z
 *   left corner = -x +z, right corner = +x -z
 * Heights (y) are world units; the lower tier's grass sits at y = 0.
 */

export type Point = readonly [x: number, z: number];
export type TierId = 'upper' | 'middle' | 'lower';

/** Seed for the single RNG every random choice goes through. Change it for a different island. */
export const SEED = 20261021;

/** Every colour in the scene. */
export const palette = {
	background: '#f4ead7',
	grass: {
		upper: '#a8c96d',
		middle: '#97bd62',
		lower: '#89b25b'
	},
	grassEdge: '#6f9a4c',
	rock: '#a08a72',
	rockUnderside: '#7d6a58',
	/** Multiplied into Kenney's blue-grey rocks (then brightened) to make them a warm grey-brown. */
	rockTint: '#efdcc2',
	/** Noisy ground patches: dry grass, deep grass, sandy earth. */
	groundPatches: ['#b2c56a', '#86ab52', '#c9b57a', '#b39f72'] as [string, string, string, string],
	/** Cave mouth on the cliff: a lit stone rim around darkening layers. */
	caveRim: '#b09a80',
	caveMouth: ['#3d362f', '#27231e', '#16130f'],
	lilyPad: '#5f9c4a',
	stairs: '#c2a984',
	water: '#5ec4c4',
	pondBed: '#5e7f78',
	slot: '#e0784a',
	/** War side: the empire's red (with white) on banners, flags and roofs. Deep crimson, not scarlet. */
	empireRed: '#9c2b3e',
	/** The three paint vats. */
	paints: ['#d2453b', '#3b63c9', '#e7b53a'],
	/** Effects: fire, smoke, window and lamp glow. */
	fire: ['#ffd25a', '#ff8a2a', '#e8481e'],
	smoke: '#d9d4cc',
	foam: '#f4fbfb',
	glow: '#ffcf7a',
	/** Simple-shape props (easels, drawing board, globe, map). */
	shapes: {
		wood: '#9a6a43',
		canvas: '#f4efe4',
		paper: '#eadfc4',
		globe: '#4f9fc0',
		brass: '#c9a24a'
	},
	sun: '#ffe1b3',
	hemiSky: '#fff3dc',
	hemiGround: '#8c7460'
} as const;

/** Toon shading: brightness steps (0-255) of the gradient ramp, darkest first. */
export const toonSteps = [105, 170, 255];

export const lighting = {
	sunIntensity: 2.6,
	/** Sun position relative to the island centre (from the back-left, so left-facing walls are lit). */
	sunPosition: [-8, 26, 14] as const,
	shadowMapSize: 2048,
	/** Blur radius of the PCF shadow filter, in shadow-map texels. */
	shadowRadius: 4,
	/** 0 = no shadow, 1 = fully dark. */
	shadowIntensity: 0.55,
	hemiIntensity: 1.3,
	/** Night, from `nightFrom` to `nightUntil` (visitor's local hours): moonlight in purple-blue. */
	nightFrom: 19,
	nightUntil: 6,
	night: {
		moon: '#a99cff',
		moonIntensity: 1.1,
		/** The moon comes from the other side of the sky to the sun. */
		moonPosition: [14, 24, -8] as const,
		hemiSky: '#6d5fb8',
		hemiGround: '#2c2340',
		hemiIntensity: 1.05,
		shadowIntensity: 0.4
	}
};

/**
 * The sky behind the island (sky.ts): clouds drifting across, and stars and a moon at night. Sizes and positions are in the view's half-height (1 = from the centre to the top
 * edge), so the sky keeps its look on any screen.
 */
export const sky = {
	clouds: 9,
	/** Width range of a cloud. */
	cloudWidth: [0.22, 0.42] as const,
	/** Seconds for a cloud to cross the view (each drifts at its own pace within this range). */
	cloudCrossSeconds: [260, 420] as const,
	/** Clouds are lit like the island; `shade` lifts their undersides (cool by day, muted by night). */
	cloudDay: '#ffffff',
	cloudDayShade: '#7d8499',
	cloudNight: '#5f5d80',
	cloudNightShade: '#272542',
	stars: 150,
	/** Star size range in CSS pixels. */
	starSize: [1.6, 3.2] as const,
	star: '#fff6dc',
	moon: '#f6f0dc',
	/** Where the moon sits: x as a share of the half-width, y of the half-height (upper right, where the moonlight comes from). */
	moonAt: [0.72, 0.72] as const,
	moonRadius: 0.032
};

/** The Seventh Floor's mirror (mirror.ts): its captured reflection and the sun in it. */
export const mirror = {
	/** The kit mirror's pane is its material named 'metal' ('glass' is the little shelf below it). */
	surface: 'metal',
	/** How far in front of the pane the reflection sits, clear of the frame (world units). */
	inset: 0.13,
	/** Capture size in pixels (width, height). */
	resolution: [256, 512] as const,
	fov: 55,
	/** Share of the capture shown at once; the rest is room to slide. */
	zoom: 0.8,
	/** How far the reflection slides as the view turns. */
	parallax: 0.12,
	/** Silvering: multiplied into the reflection. */
	tint: '#dfe7ef',
	/** A soft glow where the hero's reflection would be. */
	sun: '#ffd27a',
	/** World units: the glow's size, and its height above the station's ground (the hero's chest). */
	sunSize: 1.6,
	sunHeight: 1.3
};

/** Fireflies at night (life.ts), per side, gathered around plants. */
export const fireflies = {
	count: 40,
	color: '#e4ff7a',
	/** Decor kinds they gather around: trees, bushes, flowers. */
	near: ['pine', 'round-tree', 'autumn-pine', 'cypress', 'leaf-clump', 'leafy-spread', 'hedge', 'flowers-red', 'flowers-blue', 'reeds', 'mushrooms']
};

/** Camera tours (tour.ts): the sweep after flipping to the war side, and the idle flight. */
export const tours = {
	/** The sweep: one lap in this long, dipping to this polar angle (radians from straight up; the visitor's view is about 0.96) and this much closer. */
	sweepMs: 6500,
	sweepPolar: 1.28,
	sweepZoom: 0.3,
	/** Flips to the war side turn this fast (seconds), leaving the drama to the sweep. */
	warFlipSeconds: 1,
	/** The idle flight starts after this long without input. */
	idleAfterMs: 10_000,
	/** Easing into it, and the seconds per lap once it's going. */
	idleEaseMs: 3500,
	idleLapSeconds: 55,
	/** Its height (polar angle, swinging this much either way), zoom, and how far the view wanders (share of the island's half-width). */
	idlePolar: 1.02,
	idlePolarSwing: 0.14,
	idleZoom: 1.75,
	idleWander: 0.3,
	/** Easing home when the visitor moves. */
	landMs: 1100
};

export const cameraConfig = {
	/** Isometric yaw: 45 puts the camera on the +x/+z diagonal. */
	azimuthDeg: 45,
	/** The tilt band (either side of isometric) that zoom 1 is framed to fit. */
	tiltRangeDeg: 6,
	/**
	 * How far visitors may tilt from the isometric angle: up towards top-down, down towards the horizon.
	 * Wider than `tiltRangeDeg`, which is only what zoom 1 is framed for, so the island stays large.
	 */
	tiltUpDeg: 16,
	tiltDownDeg: 20,
	/**
	 * Zoom 1 = the whole island fits the view at its worst-case allowed angle (plus margin).
	 * Above 1 the view zooms towards the cursor for detail, but never drifts off the island.
	 */
	defaultZoom: 0.95,
	minZoom: 0.7,
	maxZoom: 3,
	fitMargin: 1.05,
	/** Portrait screens (phones) frame the island this much closer; its sides may crop. */
	portraitZoom: 1.3,
	distance: 80,
	dampingFactor: 0.08,
	rotateSpeed: 0.6
};

export interface Roughness {
	/** Large-scale wobble of the edge, in world units. */
	amplitude: number;
	/** Average distance between wobble bumps along the edge. */
	wavelength: number;
	/** Small chips layered on top of the wobble. */
	chipAmplitude: number;
}

export interface TierConfig {
	/** Height of the grass surface. */
	top: number;
	/**
	 * Control polygon; it is smoothed into a rounded outline, then roughened. Tiers may overlap:
	 * each one is a solid block down to the island base, and the higher one wins.
	 */
	points: Point[];
	roughness: Roughness;
}

export const tiers: Record<TierId, TierConfig> = {
	// Living area: back corner, leaning towards the left edge.
	upper: {
		top: 6,
		points: [
			[-18.8, 5.2],
			[-18.8, -14.3],
			[-14.9, -18.8],
			[-2.6, -19.2],
			[2.6, -18.2],
			[2, -13.6],
			[-3.9, -9.1],
			[-10.4, -3.2],
			[-14.3, 3.9]
		],
		roughness: { amplitude: 0.45, wavelength: 3.2, chipAmplitude: 0.16 }
	},
	// Forge: the wide band from the left corner to the right corner. Its back edge tucks under the upper tier.
	middle: {
		top: 3,
		points: [
			[-18.8, 16.9],
			[-18.8, -2.6],
			[-14.3, -10.4],
			[-5.2, -16.9],
			[2.6, -18.8],
			[16.3, -19.2],
			[19.2, -16.2],
			[19.2, -5.2],
			[14.3, 0],
			[7.8, 5.9],
			[1.3, 11.7],
			[-3.9, 16.9],
			[-5.9, 19.2],
			[-16.9, 19.2]
		],
		roughness: { amplitude: 0.5, wavelength: 3.4, chipAmplitude: 0.16 }
	},
	// Pond: the front corner. Its back edge tucks under the middle tier.
	lower: {
		top: 0,
		points: [
			[-7.8, 18.9],
			[-5.2, 13],
			[2.6, 6.5],
			[10.4, 0],
			[15.6, -5.9],
			[18.9, -6.5],
			[19.2, 7.8],
			[17.6, 16.9],
			[7.8, 19.2]
		],
		roughness: { amplitude: 0.5, wavelength: 3.2, chipAmplitude: 0.18 }
	}
};

/** Shared shape settings for the island body. */
export const island = {
	/** Bottom of the lower tier's block; each higher tier's block stops a little above it. */
	baseY: -4.2,
	/** How far each tier's grass lip overhangs the rock below it. 0 = flush. */
	grassOverhang: 0,
	grassThickness: 0.35,
	/** Bumpiness of the rock walls. */
	wallAmplitude: 0.28,
	wallFrequency: 0.55,
	/** Spacing of edge vertices; smaller = smoother, heavier outlines. */
	edgeSegmentLength: 0.4,
	underside: {
		/** How far the rocky underside hangs below baseY. */
		depth: 10,
		rings: 7,
		segments: 56,
		/** Higher = stays wide longer before tapering to the tip. */
		taper: 1.3,
		/** Lumpiness of the underside, growing towards the tip. */
		jaggedness: 0.22,
		/** Max sideways drift of the tip, so it is not perfectly centred. */
		drift: 2
	}
};

/** Recessed pond on the lower tier. */
export const pond = {
	id: 'pond',
	tier: 'lower' as string,
	points: [
		[11.6, 8.2],
		[12.2, 11],
		[10.4, 14.6],
		[7.4, 17.2],
		// These two reach the island's front edge: the water spills off there.
		[3.6, 19.1],
		[0.6, 19],
		[-1.4, 14.6],
		// The back runs under the middle tier, so the water meets its cliff with no strip of ground between.
		[-0.22, 11.11],
		[2.85, 8.31],
		[5.94, 5.54]
	] as Point[],
	roughness: { amplitude: 0.3, wavelength: 2.4, chipAmplitude: 0.1 } as Roughness,
	/** How far the water surface sits below the surrounding grass: less than the grass band, so the
	 * banks show one green edge, not grass over rock. */
	waterDrop: 0.2,
	/** Depth of the pond floor below the grass. */
	depth: 1.1,
	/** Lily pads scattered on the water (seeded). */
	lilyPads: 7
};

/** Irregular patches of colour on the grass (seeded), for ground variation. */
export const groundPatches = {
	perTier: { upper: 4, middle: 7, lower: 3 } as Record<TierId, number>,
	radius: [1.2, 2.6] as const
};

/** A second, smaller pond on the middle tier, above the lower one; it spills down the cliff into it. */
export const upperPond = {
	id: 'upper-pond',
	tier: 'middle' as string,
	// The front four points sit on the tier's edge, so the water spills along that whole stretch.
	points: [
		[6.83, 6.77],
		[5.53, 7.93],
		[4.23, 9.09],
		[2.93, 10.25],
		[1.48, 9.93],
		[1.33, 8.46],
		[2.63, 7.3],
		[3.93, 6.14],
		[5.23, 4.98],
		[6.68, 5.29]
	] as Point[],
	roughness: { amplitude: 0.2, wavelength: 2.4, chipAmplitude: 0.08 } as Roughness,
	waterDrop: 0.15,
	depth: 0.8,
	lilyPads: 0
};

/**
 * Water falling from a pond wherever its outline reaches its tier's edge (within about a unit):
 * those points are cut onto the edge and the falling sheet spans exactly that stretch. Shape the
 * pond (Shapes mode in the placement tool) and the waterfall follows.
 */
export interface WaterfallConfig {
	/** The pond's id. */
	pond: string;
	/** How far below the tier's top the water falls; it fades out over the last part if `fade`. */
	drop: number;
	fade?: boolean;
}

/** Water spilling from the upper pond into the lower one, and from the lower pond off the island. */
export const waterfalls: WaterfallConfig[] = [
	{ pond: 'upper-pond', drop: 3.2 },
	{ pond: 'pond', drop: 13, fade: true }
];

export type EffectKind = 'fire' | 'smoke' | 'light' | 'glow';

export interface EffectConfig {
	kind: EffectKind;
	/** Position in the station's own frame (world units): +z is its front. */
	offset: Vec3;
	color?: string;
	/** Light strength, or the size of fire, smoke and glow panels. */
	size?: number;
	/** For glow panels: which way the panel faces, as a turn in degrees (0 = +z). */
	turnDeg?: number;
	/** 'night': only after dark (lamps, windows); default always (fire, smoke). */
	when?: 'night' | 'always';
}

/** Fire, smoke and lights, attached to stations so they move with them. */
export const stationEffects: Partial<Record<StationId, EffectConfig[]>> = {
	furnace: [
		{ kind: 'fire', offset: [0, 0.35, 2.75], size: 1 },
		{ kind: 'light', offset: [0, 1.2, 3.6], color: '#ff9a3c', size: 2.2 },
		{ kind: 'smoke', offset: [0, 3.3, 0], size: 0.9 }
	],
	cottage: [
		{ kind: 'smoke', offset: [-3.69, 9.9, 0], size: 1 },
		// Lamp inside, at the top far end on the right as you face the front, so it slants out of the windows.
		{ kind: 'light', offset: [-3, 3.6, -1.4], color: '#ffc46b', size: 1.6, when: 'night' },
		{ kind: 'glow', offset: [-2.2, 2.3, 2.3], size: 1.5, when: 'night' },
		{ kind: 'glow', offset: [-2.2, 2.3, -2.3], size: 1.4, turnDeg: 180, when: 'night' },
		{ kind: 'glow', offset: [2.2, 2.3, -2.3], size: 1.4, turnDeg: 180, when: 'night' }
	],
	mapTable: [{ kind: 'light', offset: [2, 2.3, -0.3], color: '#ffc46b', size: 0.8, when: 'night' }],
	draftingDesk: [{ kind: 'light', offset: [-1.2, 2.2, -0.4], color: '#ffc46b', size: 0.6, when: 'night' }],
	arcade: [
		{ kind: 'light', offset: [0, 1.9, 1.4], color: '#6fe3ff', size: 1, when: 'night' },
		{ kind: 'glow', offset: [0, 1.85, 0.75], size: 0.75, color: '#8ff0ff', when: 'night' }
	]
};

export interface StairConfig {
	from: string;
	to: string;
	/** A point on the `from` tier, in front of the stairs. */
	at: Point;
	/** Direction the stairs climb, e.g. [0, -1.3] climbs towards -z (up-right on screen). */
	climb: Point;
	width: number;
}

/** Blocky placeholder stairs. They run from `at` along `climb` until they meet the `to` tier's edge. */
export const stairs: StairConfig[] = [
	{ from: 'lower', to: 'middle', at: [15.5, 4.5], climb: [-1, -1], width: 2.6 },
	{ from: 'middle', to: 'upper', at: [-2.5, -2.5], climb: [-1, -1], width: 2.4 }
];

export const stairStep = { rise: 0.5, run: 0.7 };

export type StationId =
	| 'furnace'
	| 'paintVats'
	| 'easels'
	| 'draftingDesk'
	| 'mapTable'
	| 'arcade'
	| 'cottage'
	| 'waterwheel'
	| 'readingCorner'
	// War side
	| 'keep'
	| 'arena'
	| 'graveyard'
	| 'seventhFloor'
	| 'hero'
	| 'market'
	| 'arenaTree';

export interface SlotConfig {
	id: StationId;
	/** The tier the station belongs to (used when its spot has no ground, and for its disc). */
	tier: string;
	/** Radius of the placeholder disc shown until a model replaces it. */
	radius: number;
}

/** The stations. Where each stands and faces is in layout.ts. */
export const slots: SlotConfig[] = [
	{ id: 'cottage', tier: 'upper', radius: 2.1 },
	{ id: 'furnace', tier: 'middle', radius: 1.4 },
	{ id: 'draftingDesk', tier: 'middle', radius: 1.2 },
	{ id: 'mapTable', tier: 'middle', radius: 1.3 },
	{ id: 'arcade', tier: 'middle', radius: 1 },
	{ id: 'easels', tier: 'middle', radius: 1.2 },
	{ id: 'paintVats', tier: 'lower', radius: 1.3 },
	{ id: 'waterwheel', tier: 'lower', radius: 1.3 },
	// War side (see war.ts)
	{ id: 'keep', tier: 'keep', radius: 1.8 },
	{ id: 'arena', tier: 'arena-sand', radius: 3 },
	{ id: 'graveyard', tier: 'floor', radius: 1.6 },
	{ id: 'seventhFloor', tier: 'keep', radius: 2 },
	{ id: 'readingCorner', tier: 'middle', radius: 1.6 },
	{ id: 'hero', tier: 'keep', radius: 1 },
	{ id: 'market', tier: 'floor', radius: 1.6 },
	{ id: 'arenaTree', tier: 'arena-sand', radius: 1.2 }
];

export interface StationPlacement {
	at: Point;
	/** 0 = the station's front (+z) faces screen bottom-left; 45 = it faces the viewer. */
	rotationDeg: number;
	/** Raise above the ground by this much (world units). */
	lift?: number;
	/** Size multiplier for the whole station, parts and spacing together. Default 1. */
	scale?: number;
}

export interface DecorPlacement {
	/** A DecorKind id. */
	kind: string;
	at: Point;
	/** Seeded-random when omitted. */
	rotationDeg?: number;
	/** Extra size multiplier for this copy. Default 1. */
	scale?: number;
	/** Raise above the ground by this much (world units). */
	lift?: number;
}

/** Where everything stands; lives in layout.ts, which the dev placement tool rewrites. */
export interface Layout {
	/** Only the stations on this layout's side. */
	stations: Partial<Record<StationId, StationPlacement>>;
	decor: DecorPlacement[];
}

/**
 * World scale for imported models: a person stands this many world units tall. Every model pack
 * is scaled so its own characters (or doors, for packs without characters) match it.
 */
export const personHeight = 2.8;

export type PackId =
	| 'mini-arcade'
	| 'fantasy-town-kit'
	| 'pirate-kit'
	| 'survival-kit'
	| 'graveyard-kit'
	| 'platformer-kit'
	| 'castle-kit'
	| 'mini-arena'
	| 'furniture-kit'
	// Not Kenney (an approved exception, see CREDITS.md): in static/models/other.
	| 'hero';

/**
 * Repaints a block of a Kenney colour map (a grid of swatches; pixels from its top-left) in one
 * colour, keeping each pixel's shade relative to the block's average.
 */
export interface Repaint {
	area: readonly [x: number, y: number, width: number, height: number];
	color: string;
}

export interface PackConfig {
	/** Height of a standing character in the pack's own units. */
	personHeight: number;
	/** Applied to every model from the pack: one block of swatches, or several. */
	repaint?: Repaint | Repaint[];
	/** Folder in the shared Kenney library (dev placement tool thumbnails). None for non-Kenney models. */
	library?: string;
	/** Folder under static/ the models are in. Default 'models/kenney/<pack>'. */
	dir?: string;
	/** Painted textures rather than Kenney colour swatches: sampled smoothly, not crisply. */
	painted?: boolean;
	/**
	 * Models that trade two blocks of colour-map swatches between them (their UVs, not the map, so
	 * other models using either swatch keep their colours). Blocks are the same size, in pixels.
	 */
	swaps?: { files: string[]; areas: [Repaint['area'], Repaint['area']] }[];
	/**
	 * Moves the thin pieces of a swatch block onto another block (same size), in the listed models:
	 * pieces (connected triangles) thinner than `thinnerThan` across, in pack units. Siege engines'
	 * flags share their swatch with the roofs; this gives the flags a colour of their own.
	 */
	recuts?: { files: string[]; from: Repaint['area']; to: Repaint['area']; thinnerThan: number }[];
	/** Where a model's preview image is inside the library folder, `{file}` standing for the model. Default 'Previews/{file}.png'. */
	previews?: string;
}

/**
 * War side recolours. The castle kit's wood is a light orange-tan: a darker brown reads as wood. The
 * small bricks set into the walls go a cool slate, a little dark relief in the warm stone.
 */
const castleWood: Repaint = { area: [288, 384, 32, 128], color: '#7a4f34' };
const castleBricks: Repaint = { area: [384, 448, 32, 32], color: '#a3a7ae' };
/**
 * Siege engines: plain wood and iron, no empire paint and no whitened stone. Roofs and panels in
 * chocolate brown, their studs a shade lighter; the flags (moved onto their own swatch, see `recuts`
 * on the pack) keep the empire's red.
 */
const siegeRoof = '#4f3a2e';
const siegeStuds = '#6b4f3c';
const siegeRepaint: Repaint[] = [
	castleWood,
	{ area: [288, 256, 32, 128], color: siegeRoof },
	{ area: [224, 256, 64, 128], color: siegeStuds },
	{ area: [192, 256, 32, 128], color: palette.empireRed }
];
/** The bundled hay bale's red straps, in brown. */
const hayStraps: Repaint = { area: [160, 384, 32, 128], color: '#7a5636' };

/** Model packs copied into static/models/kenney/<pack>/. */
export const packs: Record<PackId, PackConfig> = {
	'mini-arcade': { personHeight: 0.77, library: 'kenney_mini-arcade' },
	'fantasy-town-kit': { personHeight: 0.638, library: 'kenney_fantasy-town-kit_2.0' },
	'pirate-kit': { personHeight: 1.133, library: 'kenney_pirate-kit' },
	'survival-kit': { personHeight: 0.414, library: 'kenney_survival-kit' },
	'graveyard-kit': { personHeight: 0.803, library: 'kenney_graveyard-kit_5.0' },
	'platformer-kit': { personHeight: 0.907, library: 'kenney_platformer-kit' },
	// The red variation's reds (where the default has blue too): banners, flags, roofs. Siege engines
	// have their own repaint (siegeRepaint), without the empire's paint.
	// The castle's stone whitened (its two sandstone swatch columns), so the empire reads red on white.
	// Hanging banners swap their stripes: red, white, red.
	'castle-kit': {
		personHeight: 0.515,
		library: 'kenney_castle-kit',
		repaint: [
			{ area: [192, 256, 128, 128], color: palette.empireRed },
			{ area: [416, 384, 32, 128], color: '#e9e3d8' },
			{ area: [480, 384, 32, 128], color: '#d8d0c3' },
			castleWood,
			castleBricks
		],
		swaps: [{ files: ['flag-banner-short', 'flag-banner-long'], areas: [[224, 384, 32, 128], [288, 256, 32, 128]] }],
		recuts: [
			{
				files: ['siege-tower', 'siege-tower-demolished', 'siege-ram', 'siege-catapult', 'siege-trebuchet', 'siege-ballista'],
				from: [288, 256, 32, 128],
				to: [192, 256, 32, 128],
				// Flags are 0.08 across, the tower roof's small tiles 0.10.
				thinnerThan: 0.09
			}
		]
	},
	'mini-arena': { personHeight: 0.773, library: 'kenney_mini-arena' },
	'furniture-kit': { personHeight: 0.858, library: 'kenney_furniture-kit', previews: 'Isometric/{file}_SW.png' },
	// The war side's central character. Person height: its full height (it's modelled 431 units tall).
	hero: { personHeight: 431, dir: 'models/other', painted: true }
};

export type Vec3 = readonly [x: number, y: number, z: number];

/** Stand-ins built from simple shapes, for props no Kenney pack has. See shapes.ts. */
export type ShapeId = 'easel' | 'draftingBoard' | 'globe' | 'mapSheet';

interface PropPlacement {
	/** Offset from the slot centre, in world units, in the station's own frame. Default [0, 0, 0]. */
	offset?: Vec3;
	/** Turn around the vertical axis within the station. Default 0. */
	rotationDeg?: number;
	/** Size multiplier: one number, or per axis [x, y, z]. For models it applies on top of the pack's world scale. */
	scale?: number | Vec3;
	/** Keeps turning about one of its own axes (a waterwheel), in turns per minute. */
	spin?: { axis: 'x' | 'y' | 'z'; rpm: number };
	/** Recolours one of the model's materials, by material name (a fountain's 'Water' as paint, say). */
	recolor?: { material: string; color: string };
}

export type PropConfig =
	| (PropPlacement & { pack: PackId; /** File inside static/models/kenney/<pack>/, without .glb. */ file: string })
	| (PropPlacement & { shape: ShapeId })
	/** A decor kind (a composite, say). Scale applies on top of the kind's own. */
	| (PropPlacement & { kind: string });

export interface StationModelConfig {
	station: StationId;
	props: PropConfig[];
}

/** Stations made of single models and shapes. Stations without an entry or building keep their disc. */
export const stationModels: StationModelConfig[] = [
	{
		station: 'arcade',
		props: [{ pack: 'mini-arcade', file: 'arcade-machine' }]
	},
	{
		// Big stone kiln, the island's centrepiece, door to the viewer; anvil to its right.
		station: 'furnace',
		props: [
			{ pack: 'pirate-kit', file: 'tower-base-door', scale: 0.7 },
			{ pack: 'survival-kit', file: 'workbench-anvil', offset: [4.8, 0, 1.6], rotationDeg: -30 }
		]
	},
	{
		// Three round stone basins, squashed into low vats.
		station: 'paintVats',
		props: [
			{
				pack: 'fantasy-town-kit',
				file: 'fountain-round',
				offset: [-1.3, 0, 0],
				scale: [0.25, 0.8, 0.25],
				recolor: { material: 'Water', color: palette.paints[0] }
			},
			{
				pack: 'fantasy-town-kit',
				file: 'fountain-round',
				offset: [1.1, 0, -0.7],
				scale: [0.25, 0.8, 0.25],
				recolor: { material: 'Water', color: palette.paints[1] }
			},
			{
				pack: 'fantasy-town-kit',
				file: 'fountain-round',
				offset: [0.3, 0, 1.5],
				scale: [0.22, 0.7, 0.22],
				recolor: { material: 'Water', color: palette.paints[2] }
			}
		]
	},
	{
		station: 'easels',
		props: [
			{ shape: 'easel', offset: [-0.9, 0, 0], rotationDeg: 15 },
			{ shape: 'easel', offset: [1.1, 0, 0.4], rotationDeg: -20, scale: 0.85 }
		]
	},
	{
		// Market-stall table shortened into a desk, a tilted drawing board on top, a stool in front.
		station: 'draftingDesk',
		props: [
			{ pack: 'fantasy-town-kit', file: 'stall', rotationDeg: 90, scale: [1, 1, 0.7] },
			{ shape: 'draftingBoard', offset: [0, 1.61, 0] },
			{ pack: 'fantasy-town-kit', file: 'stall-stool', offset: [0.6, 0, 1.5] },
			{ pack: 'graveyard-kit', file: 'candle-multiple', offset: [-1.2, 1.61, -0.4], scale: 0.7 }
		]
	},
	{
		station: 'mapTable',
		props: [
			{ pack: 'fantasy-town-kit', file: 'stall', rotationDeg: 90 },
			{ shape: 'globe', offset: [-1.2, 1.61, 0] },
			{ shape: 'mapSheet', offset: [0.7, 1.61, 0] },
			{ pack: 'pirate-kit', file: 'chest', offset: [3.7, 0.16, 0.9], rotationDeg: -30, scale: 0.5 },
			{ pack: 'graveyard-kit', file: 'lantern-candle', offset: [2, 1.61, -0.3], scale: 0.7 }
		]
	},
	{
		// Paddle wheel standing in the pond against the cliff, dipping below the water; posts on the
		// pond floor. The model's origin is its axle.
		station: 'waterwheel',
		props: [
			{ pack: 'fantasy-town-kit', file: 'watermill', offset: [0, 1.4, 0], scale: 0.6, spin: { axis: 'x', rpm: 4 } },
			{ pack: 'fantasy-town-kit', file: 'pillar-wood', offset: [-1.4, -1.1, 0], scale: 0.6 },
			{ pack: 'fantasy-town-kit', file: 'pillar-wood', offset: [1.4, -1.1, 0], scale: 0.6 }
		]
	},
	{
		// The books and trivia corner: the reading nook (armchair, lamp, side table) with a wide and a
		// narrow bookcase beside it, as I placed them.
		station: 'readingCorner',
		props: [
			{ kind: 'reading-nook', rotationDeg: -1.98 },
			{ kind: 'bookcase-wide-full', offset: [-2.99, 0, 1.7], rotationDeg: 81.17 },
			{ kind: 'bookcase-closed-full', offset: [-3.8, 0, 4.14], rotationDeg: 40.21 }
		]
	}
];

/** War side: the tower at the castle's heart, stacked from castle-kit storeys. */
stationModels.push(
	{
		station: 'keep',
		props: [
			{ pack: 'castle-kit', file: 'tower-square-base', scale: 0.55 },
			{ pack: 'castle-kit', file: 'tower-square-mid-windows', offset: [0, 3.03, 0], scale: 0.55 },
			{ pack: 'castle-kit', file: 'tower-square-mid-windows', offset: [0, 6.06, 0], scale: 0.55 },
			{ pack: 'castle-kit', file: 'tower-square-top-roof-high', offset: [0, 9.09, 0], scale: 0.55 }
		]
	},
	{
		// The large crypt (a composite decor kind) with candles by its door, flanked by urns.
		station: 'graveyard',
		props: [
			{ kind: 'crypt' },
			{ pack: 'graveyard-kit', file: 'candle-multiple', offset: [-1.4, 0, 3.9], scale: 0.8 },
			{ pack: 'graveyard-kit', file: 'urn-round', offset: [-3.3, 0, 2.9] },
			{ pack: 'graveyard-kit', file: 'urn-round', offset: [3.3, 0, 2.9] }
		]
	},
	{
		// Azuchi's seventh floor: no image of any living thing, only a mirror. Full length, a little taller
		// than the hero, its glass facing the station's front (towards the gate); the hero (decor) stands
		// in front of it, his back to it. The kit mirror's left edge is its origin: centred.
		station: 'seventhFloor',
		props: [
			{
				pack: 'furniture-kit',
				file: 'bathroomMirror',
				offset: [-1.28, 0, 0],
				scale: 2.6,
				recolor: { material: 'glass', color: '#cdd6df' }
			}
		]
	},
	// The hero before the mirror, facing the gate.
	{ station: 'hero', props: [{ kind: 'hero', scale: 0.53 }] },
	// The market: one stall stands for it (the rest are decor around it).
	{ station: 'market', props: [{ kind: 'market-stall-teal' }] },
	// The tree at the arena's heart, in deep red.
	{ station: 'arenaTree', props: [{ kind: 'ember-tree' }] }
);

/** Which cell edge a kit part faces. Kit walls sit on a cell's +x edge; other edges turn them. */
export type Edge = '+x' | '-x' | '+z' | '-z';

export interface KitPart {
	file: string;
	/** Cell centre [x, z] in kit cells, relative to the building's centre. */
	cell: Point;
	/** Storey, 0 = ground. Each storey is one kit cell tall. */
	level: number;
	/** Turns the part so its +x side faces this way. Default '+x'. Roofs at '+x' ridge along x. */
	edge?: Edge;
	/** Turn in degrees instead of `edge`. */
	turnDeg?: number;
}

export interface BuildingConfig {
	station: StationId;
	pack: PackId;
	scale?: number;
	parts: KitPart[];
}

/** Stations assembled from kit parts. */
export const buildings: BuildingConfig[] = [
	{
		// War side: the arena, stone seating around a sand floor, open on its +x side (towards the road).
		// Floor tiles sit a hair above the ground (level 0.01) so they don't flicker against the sand.
		station: 'arena',
		pack: 'mini-arena',
		scale: 0.6,
		parts: [
			{ file: 'stairs-corner-inner', cell: [-2.5, -2], level: 0, turnDeg: 0 },
			{ file: 'stairs', cell: [-2.5, -1], level: 0, turnDeg: 90 },
			{ file: 'stairs', cell: [-2.5, 0], level: 0, turnDeg: 90 },
			{ file: 'stairs', cell: [-2.5, 1], level: 0, turnDeg: 90 },
			{ file: 'stairs-corner-inner', cell: [-2.5, 2], level: 0, turnDeg: -90 },
			{ file: 'stairs', cell: [-1.5, -2], level: 0, turnDeg: 0 },
			{ file: 'floor', cell: [-1.5, -1], level: 0.01 },
			{ file: 'floor-detail', cell: [-1.5, 0], level: 0.01 },
			{ file: 'floor', cell: [-1.5, 1], level: 0.01 },
			{ file: 'stairs', cell: [-1.5, 2], level: 0, turnDeg: 180 },
			{ file: 'stairs', cell: [-0.5, -2], level: 0, turnDeg: 0 },
			{ file: 'floor-detail', cell: [-0.5, -1], level: 0.01 },
			{ file: 'floor', cell: [-0.5, 0], level: 0.01 },
			{ file: 'floor-detail', cell: [-0.5, 1], level: 0.01 },
			{ file: 'stairs', cell: [-0.5, 2], level: 0, turnDeg: 180 },
			{ file: 'stairs', cell: [0.5, -2], level: 0, turnDeg: 0 },
			{ file: 'floor', cell: [0.5, -1], level: 0.01 },
			{ file: 'floor-detail', cell: [0.5, 0], level: 0.01 },
			{ file: 'floor', cell: [0.5, 1], level: 0.01 },
			{ file: 'stairs', cell: [0.5, 2], level: 0, turnDeg: 180 },
			{ file: 'stairs', cell: [1.5, -2], level: 0, turnDeg: 0 },
			{ file: 'floor-detail', cell: [1.5, -1], level: 0.01 },
			{ file: 'floor', cell: [1.5, 0], level: 0.01 },
			{ file: 'floor-detail', cell: [1.5, 1], level: 0.01 },
			{ file: 'stairs', cell: [1.5, 2], level: 0, turnDeg: 180 },
			{ file: 'stairs-corner-inner', cell: [2.5, -2], level: 0, turnDeg: 90 },
			{ file: 'floor', cell: [2.5, -1], level: 0.01 },
			{ file: 'floor', cell: [2.5, 0], level: 0.01 },
			{ file: 'floor', cell: [2.5, 1], level: 0.01 },
			{ file: 'stairs-corner-inner', cell: [2.5, 2], level: 0, turnDeg: 180 }
		]
	},
	{
		// Single storey, two cells wide along x and one deep, under a hipped teal roof. Turned 45° so it
		// runs along the upper tier's front edge, door facing the viewer and the stairs.
		station: 'cottage',
		pack: 'fantasy-town-kit',
		parts: [
			{ file: 'wall-window-shutters', cell: [-0.5, 0], level: 0, edge: '+z' },
			{ file: 'wall-door', cell: [0.5, 0], level: 0, edge: '+z' },
			{ file: 'wall-window-glass', cell: [-0.5, 0], level: 0, edge: '-z' },
			{ file: 'wall-window-glass', cell: [0.5, 0], level: 0, edge: '-z' },
			{ file: 'wall', cell: [-0.5, 0], level: 0, edge: '-x' },
			{ file: 'wall', cell: [0.5, 0], level: 0, edge: '+x' },
			{ file: 'roof-gable-end', cell: [-0.5, 0], level: 1 },
			{ file: 'roof-gable-end', cell: [0.5, 0], level: 1, edge: '-x' },
			{ file: 'chimney', cell: [-0.5, 0], level: 0.57, edge: '-x' },
			{ file: 'chimney-top', cell: [-0.5, 0], level: 1.57, edge: '-x' }
		]
	}
];

/**
 * One piece of a composite kind: a model file (from the composite's own pack unless `pack` says
 * otherwise), or another decor kind, itself possibly a composite.
 */
export type CompositePart = {
	/** In the composite's pack units (its kit grid), before the kind's scale. Default [0, 0, 0]. */
	offset?: Vec3;
	/** Turn around the vertical axis. Default 0. */
	rotationDeg?: number;
	/**
	 * Size multiplier on top of the part's pack scale: one number, or per axis. Default 1. A nested
	 * kind comes in at kit size; its own `scale` is only for placing it alone.
	 */
	scale?: number | Vec3;
	/** Instead of the composite's repaint, for this part (one from another pack, say). */
	repaint?: Repaint | Repaint[];
	/** Keeps turning about its own axis (windmill sails). Drawn per copy rather than instanced. */
	spin?: { axis: 'x' | 'y' | 'z'; rpm: number };
} & ({ pack?: PackId; file: string } | { kind: string });

/** A decor kind is one model (`file`) or a composite built from several (`parts`). */
export type DecorKind = DecorKindBase & ({ file: string } | { parts: CompositePart[] });

interface DecorKindBase {
	/** Name used by layout.ts and the placement tool. */
	id: string;
	/** The model's pack. For a composite, the pack whose units its part offsets are in. */
	pack: PackId;
	/** Size multiplier on top of the pack's world scale. */
	scale: number;
	/** Colour multiplied into the model's own colours. */
	tint?: string;
	/** Instead of the pack's repaint, for the kind's models from its own pack. */
	repaint?: Repaint | Repaint[];
	/** Brightness multiplier on top of `tint`, which on its own can only darken. */
	brighten?: number;
	/** Lay a ground patch (sand and dry grass) under each copy, so it settles into the grass. */
	patch?: boolean;
	/** Sink into the ground by this much (world units). */
	sink?: number;
	/** Fixed height instead of the ground's, for things on or in the pond. */
	height?: number;
	/** Another kind drawn on top of every copy (a tower's crown), moving with it. `lift` is in world units at copy scale 1. */
	topper?: { kind: string; lift: number };
	/** A light that comes on at night, at this height above each copy (world units at copy scale 1). */
	light?: { height: number; color?: string; intensity?: number; distance?: number };
	/** A flat disc of liquid inside each copy (water in a bucket): its radius and height. */
	fill?: { radius: number; height: number; color: string };
	/** Fire, smoke or light on every copy, turning with it; offsets in world units at copy scale 1. */
	effects?: EffectConfig[];
}

/**
 * What each decor piece is. Where the copies stand is in layout.ts. Each kind is drawn instanced,
 * so repeats are cheap.
 */
export const decorKinds: DecorKind[] = [
	// Trees
	{ id: 'pine', pack: 'fantasy-town-kit', file: 'tree', scale: 0.5 },
	{ id: 'round-tree', pack: 'fantasy-town-kit', file: 'tree-high-round', scale: 0.5 },
	{ id: 'autumn-pine', pack: 'survival-kit', file: 'tree-autumn', scale: 0.55 },
	// The autumn pine with its leaves repainted a deep wine red: the arena's tree.
	{ id: 'ember-tree', pack: 'survival-kit', file: 'tree-autumn', scale: 0.55, repaint: { area: [160, 256, 32, 128], color: '#8a2348' } },

	// Bushes, reeds and grass
	{ id: 'leaf-clump', pack: 'survival-kit', file: 'grass-large', scale: 0.8 },
	{ id: 'leafy-spread', pack: 'pirate-kit', file: 'grass-plant', scale: 0.7 },
	{ id: 'reeds', pack: 'platformer-kit', file: 'grass', scale: 0.8 },

	// Rocks
	{ id: 'rock-large', pack: 'survival-kit', file: 'rock-b', scale: 0.5, tint: palette.rockTint, brighten: 1.55, patch: true },
	{ id: 'rock-tall', pack: 'survival-kit', file: 'rock-c', scale: 0.45, tint: palette.rockTint, brighten: 1.55, patch: true },
	{ id: 'rock-medium', pack: 'survival-kit', file: 'rock-b', scale: 0.3, tint: palette.rockTint, brighten: 1.55, patch: true },
	{ id: 'rock-small', pack: 'survival-kit', file: 'rock-a', scale: 0.3, tint: palette.rockTint, brighten: 1.55, patch: true },
	{ id: 'grass-tuft', pack: 'platformer-kit', file: 'grass', scale: 0.5 },
	{ id: 'stone-shallows', pack: 'survival-kit', file: 'rock-a', scale: 0.25, tint: palette.rockTint, brighten: 1.55, height: -0.4 },

	// Forge corner
	{ id: 'paving', pack: 'fantasy-town-kit', file: 'road', scale: 1 },
	{ id: 'grindstone', pack: 'survival-kit', file: 'workbench-grind', scale: 1 },
	{ id: 'shelter', pack: 'survival-kit', file: 'structure-roof', scale: 1 },
	{ id: 'axe', pack: 'survival-kit', file: 'tool-axe', scale: 1 },
	{ id: 'shovel', pack: 'survival-kit', file: 'tool-shovel', scale: 1 },
	{ id: 'hammer', pack: 'survival-kit', file: 'tool-hammer', scale: 1 },
	{ id: 'planks', pack: 'survival-kit', file: 'resource-planks', scale: 0.8 },
	{ id: 'bucket', pack: 'survival-kit', file: 'bucket', scale: 1, fill: { radius: 0.36, height: 1.05, color: palette.water } },
	{ id: 'palisade', pack: 'survival-kit', file: 'fence-fortified', scale: 0.6 },

	// Atelier
	{ id: 'bench', pack: 'fantasy-town-kit', file: 'stall-bench', scale: 1 },
	{ id: 'chest', pack: 'survival-kit', file: 'chest', scale: 1 },
	{ id: 'crate-bottles', pack: 'pirate-kit', file: 'crate-bottles', scale: 0.6 },
	{ id: 'jug', pack: 'pirate-kit', file: 'bottle-large', scale: 0.5 },

	// Cottage yard
	{ id: 'gate', pack: 'fantasy-town-kit', file: 'fence-gate', scale: 1 },
	{ id: 'fence', pack: 'fantasy-town-kit', file: 'fence', scale: 1 },
	{ id: 'hedge', pack: 'fantasy-town-kit', file: 'hedge', scale: 1 },
	{ id: 'lamp-post', pack: 'fantasy-town-kit', file: 'lantern', scale: 0.6, light: { height: 3.75 } },
	{ id: 'log', pack: 'survival-kit', file: 'tree-log', scale: 0.5 },
	{ id: 'stump', pack: 'survival-kit', file: 'tree-trunk', scale: 0.8 },
	{ id: 'signpost', pack: 'survival-kit', file: 'signpost', scale: 0.8 },
	{ id: 'pumpkin', pack: 'graveyard-kit', file: 'pumpkin', scale: 0.6 },

	// Pond
	{ id: 'jetty', pack: 'pirate-kit', file: 'structure-platform-small', scale: 0.6, height: -1.28 },
	{ id: 'rowing-boat', pack: 'pirate-kit', file: 'boat-row-small', scale: 0.5, height: -0.4 },

	// Paths
	{ id: 'stepping-stones', pack: 'graveyard-kit', file: 'road', scale: 0.7, sink: 0.13 },

	// Scattered
	{ id: 'barrel', pack: 'pirate-kit', file: 'barrel', scale: 0.5 },
	{ id: 'crate', pack: 'pirate-kit', file: 'crate', scale: 0.6 },
	{ id: 'flowers-red', pack: 'platformer-kit', file: 'flowers-tall', scale: 0.6 },
	{ id: 'flowers-blue', pack: 'platformer-kit', file: 'flowers', scale: 0.6 },
	{ id: 'mushrooms', pack: 'platformer-kit', file: 'mushrooms', scale: 0.5 },
	{ id: 'pennant', pack: 'castle-kit', file: 'flag-pennant', scale: 0.8 },

	// War side: castle (walls and towers are laid along the terraces by wallRuns in war.ts)
	{ id: 'castle-wall', pack: 'castle-kit', file: 'wall', scale: 0.45 },
	// Towers: two flat faces as wide as the wall is thick, and taller than it, so walls run into them.
	{
		id: 'castle-tower',
		pack: 'castle-kit',
		file: 'tower-hexagon-base',
		scale: 0.6,
		topper: { kind: 'castle-tower-crown', lift: 4.27 }
	},
	{ id: 'castle-tower-crown', pack: 'castle-kit', file: 'tower-hexagon-top', scale: 0.6 },
	{ id: 'castle-flag', pack: 'castle-kit', file: 'flag-banner-short', scale: 0.5 },
	// Wall pieces as the kit has them. Narrow walls stand on the cell's -x half; the shed or fence on +x.
	{ id: 'castle-doorway', pack: 'castle-kit', file: 'wall-doorway', scale: 0.45 },
	{ id: 'castle-wall-shed', pack: 'castle-kit', file: 'wall-narrow-wood', scale: 0.45 },
	{ id: 'castle-wall-fence', pack: 'castle-kit', file: 'wall-narrow-wood-fence', scale: 0.45 },
	{
		// The doorway (centred) with its portcullis half raised, crowned hex towers with flags either
		// side, and a banner over the arch on both faces. The portcullis is wider and taller than the
		// arch; its edges sit in the stone.
		id: 'castle-gateway',
		pack: 'castle-kit',
		scale: 0.45,
		parts: [
			{ file: 'wall-doorway', offset: [0.25, 0, 0] },
			{ file: 'metal-gate', offset: [0, 0.3, 0] },
			{ file: 'tower-hexagon-base', offset: [0, 0, -0.85] },
			{ file: 'tower-hexagon-base', offset: [0, 0, 0.85] },
			{ file: 'tower-hexagon-top', offset: [0, 1.31, -0.85] },
			{ file: 'tower-hexagon-top', offset: [0, 1.31, 0.85] },
			{ file: 'flag', offset: [0, 1.31, -0.85], rotationDeg: 180 },
			{ file: 'flag', offset: [0, 1.31, 0.85] },
			{ file: 'flag-banner-short', offset: [-0.29, 0.72, 0], scale: 0.7 },
			{ file: 'flag-banner-short', offset: [0.29, 0.72, 0], rotationDeg: 180, scale: 0.7 }
		]
	},
	// Watchtowers: the hex base with the wider mid storey on it (1.31 up), then a roof or spire (1.77 up).
	{
		id: 'watchtower',
		pack: 'castle-kit',
		scale: 0.5,
		parts: [{ file: 'tower-hexagon-base' }, { file: 'tower-hexagon-mid', offset: [0, 1.31, 0] }]
	},
	{
		id: 'watchtower-roof',
		pack: 'castle-kit',
		scale: 0.5,
		parts: [{ kind: 'watchtower' }, { file: 'tower-hexagon-roof', offset: [0, 1.77, 0] }]
	},
	{
		// The cone stretched tall and pointed, Neuschwanstein-style, overhanging the mid storey a little.
		id: 'watchtower-spire',
		pack: 'castle-kit',
		scale: 0.5,
		parts: [{ kind: 'watchtower' }, { kind: 'cone-roof', offset: [0, 1.77, 0], scale: [0.58, 1.5, 0.58] }]
	},
	{
		// Round cone from four fantasy-town round roof corners, each peaking at its inner corner, turned
		// about a shared peak. Two cells across, 1.14 tall.
		id: 'cone-roof',
		pack: 'fantasy-town-kit',
		scale: 1,
		// Its pinkish red swatch column, in the castle's red. Only here: the forge shares the colour map.
		repaint: { area: [32, 384, 32, 128], color: palette.empireRed },
		parts: [
			{ file: 'roof-high-corner-round', offset: [-0.5, 0, 0.5] },
			{ file: 'roof-high-corner-round', offset: [0.5, 0, 0.5], rotationDeg: 90 },
			{ file: 'roof-high-corner-round', offset: [0.5, 0, -0.5], rotationDeg: 180 },
			{ file: 'roof-high-corner-round', offset: [-0.5, 0, -0.5], rotationDeg: 270 }
		]
	},
	// Square towers, one cell across like the wall is thick.
	{
		id: 'square-tower',
		pack: 'castle-kit',
		scale: 0.45,
		parts: [{ file: 'tower-square-base' }, { file: 'tower-square', offset: [0, 1.01, 0] }]
	},
	{
		// Walk-through: arches on the ground, battlements above.
		id: 'square-gatehouse',
		pack: 'castle-kit',
		scale: 0.45,
		parts: [{ file: 'tower-square-arch' }, { file: 'tower-square', offset: [0, 1.01, 0] }]
	},
	{
		// Open arched lookout on a solid storey, with a battlement cap.
		id: 'square-lookout',
		pack: 'castle-kit',
		scale: 0.45,
		parts: [
			{ file: 'tower-square-base' },
			{ file: 'tower-square-arch', offset: [0, 1.01, 0] },
			{ file: 'tower-square-top', offset: [0, 2.02, 0] }
		]
	},
	{ id: 'trebuchet', pack: 'castle-kit', file: 'siege-trebuchet', scale: 0.4, repaint: siegeRepaint },
	{ id: 'ballista', pack: 'castle-kit', file: 'siege-ballista', scale: 0.4, repaint: siegeRepaint },
	{ id: 'catapult', pack: 'castle-kit', file: 'siege-catapult', scale: 0.4, repaint: siegeRepaint },
	{ id: 'siege-tower-wreck', pack: 'castle-kit', file: 'siege-tower-demolished', scale: 0.4, repaint: siegeRepaint },
	{ id: 'ridge-rocks', pack: 'castle-kit', file: 'rocks-large', scale: 0.5, tint: palette.rockTint, brighten: 1.35 },

	// War side: arena
	{ id: 'cypress', pack: 'mini-arena', file: 'tree', scale: 0.75 },
	{ id: 'arena-column', pack: 'mini-arena', file: 'column', scale: 0.6 },
	{ id: 'arena-statue', pack: 'mini-arena', file: 'statue', scale: 0.6 },
	{ id: 'arena-banner', pack: 'mini-arena', file: 'banner', scale: 0.6 },
	{ id: 'weapon-rack', pack: 'mini-arena', file: 'weapon-rack', scale: 0.6 },

	// War side: the central character, a little larger than life.
	{ id: 'hero', pack: 'hero', file: 'hero', scale: 1.25 },

	// War side: graveyard
	{
		// Large crypt: body, roof on top, door ajar in the front (+z) arch. The door swings on its left
		// edge (0.315 left of its origin); the offset keeps that hinge in the doorway at z 1.1.
		id: 'crypt',
		pack: 'graveyard-kit',
		scale: 0.8,
		parts: [
			{ file: 'crypt-large' },
			{ file: 'crypt-large-roof', offset: [0, 1, 0] },
			{ file: 'crypt-large-door', offset: [-0.07, 0, 1.3], rotationDeg: -40 }
		]
	},
	{ id: 'gravestone', pack: 'graveyard-kit', file: 'gravestone-round', scale: 0.8 },
	{ id: 'gravestone-cross', pack: 'graveyard-kit', file: 'gravestone-cross', scale: 0.8 },
	{ id: 'gravestone-carved', pack: 'graveyard-kit', file: 'gravestone-decorative', scale: 0.8 },
	{ id: 'grave-cross', pack: 'graveyard-kit', file: 'cross-wood', scale: 0.8 },
	{ id: 'iron-fence', pack: 'graveyard-kit', file: 'iron-fence-border', scale: 0.8 },
	{ id: 'grave-lamp', pack: 'graveyard-kit', file: 'lightpost-single', scale: 0.8, light: { height: 2.9 } },

	// War side: the market and the common ground in front of the graveyard and the arena. Awnings in
	// the empire's colours: the kit's red stall in crimson, its green one in white.
	{
		id: 'market-stall-red',
		pack: 'fantasy-town-kit',
		scale: 0.75,
		repaint: { area: [32, 384, 32, 128], color: palette.empireRed },
		parts: [
			{ file: 'stall-red' },
			{ pack: 'pirate-kit', file: 'barrel', offset: [0.42, 0, 0.72], scale: 0.4 },
			{ pack: 'survival-kit', file: 'box', offset: [-0.3, 0, 0.7], scale: 0.6, rotationDeg: 12 },
			{ pack: 'survival-kit', file: 'box', offset: [-0.3, 0.23, 0.7], scale: 0.5, rotationDeg: -20 }
		]
	},
	// More awnings, the kit's green one repainted: the market is where the war side's cooler colours live.
	...(
		[
			['market-stall-teal', '#2f8f87'],
			['market-stall-indigo', '#3f4e8f'],
			['market-stall-ochre', '#d39b38']
		] as const
	).map(
		([id, color]): DecorKind => ({
			id,
			pack: 'fantasy-town-kit',
			scale: 0.75,
			repaint: { area: [96, 384, 32, 128], color },
			parts: [
				{ file: 'stall-green' },
				{ pack: 'pirate-kit', file: 'barrel', offset: [-0.42, 0, 0.72], scale: 0.4 },
				{ pack: 'survival-kit', file: 'box', offset: [0.3, 0, 0.7], scale: 0.6, rotationDeg: -14 }
			]
		})
	),
	{
		id: 'market-stall-white',
		pack: 'fantasy-town-kit',
		scale: 0.75,
		repaint: { area: [96, 384, 32, 128], color: '#efe7d8' },
		parts: [
			{ file: 'stall-green' },
			{ pack: 'pirate-kit', file: 'crate', offset: [0.3, 0, 0.75], scale: 0.4, rotationDeg: 8 },
			{ pack: 'graveyard-kit', file: 'hay-bale', offset: [-0.35, 0, 0.75], scale: 0.6, rotationDeg: -6 }
		]
	},
	{
		// Loaded with a hay bale and a box.
		id: 'produce-cart',
		pack: 'fantasy-town-kit',
		scale: 0.75,
		parts: [
			{ file: 'cart' },
			{ pack: 'graveyard-kit', file: 'hay-bale-bundled', offset: [0, 0.3, -0.12], rotationDeg: 90, scale: 0.55, repaint: hayStraps },
			{ pack: 'survival-kit', file: 'box', offset: [0.12, 0.3, 0.38], scale: 0.5, rotationDeg: 20 }
		]
	},
	{
		// Two bales side by side, one bundled bale across the top.
		id: 'hay-stack',
		pack: 'graveyard-kit',
		scale: 0.6,
		repaint: hayStraps,
		parts: [
			{ file: 'hay-bale', offset: [0, 0, -0.21] },
			{ file: 'hay-bale', offset: [0.02, 0, 0.21], rotationDeg: 4 },
			{ file: 'hay-bale-bundled', offset: [0, 0.36, 0], rotationDeg: 84 }
		]
	},
	{ id: 'hay-bale', pack: 'graveyard-kit', file: 'hay-bale', scale: 0.6 },
	{
		id: 'goods-pile',
		pack: 'survival-kit',
		scale: 0.55,
		parts: [
			{ file: 'box-large' },
			{ file: 'box', offset: [0, 0.25, 0.1], rotationDeg: 15 },
			{ file: 'box', offset: [0.3, 0, -0.1], rotationDeg: -10 },
			{ pack: 'pirate-kit', file: 'barrel', offset: [0.05, 0, -0.42], scale: 0.4 }
		]
	},
	{ id: 'fountain', pack: 'fantasy-town-kit', file: 'fountain-round', scale: 0.45 },
	{ id: 'stone-bench', pack: 'graveyard-kit', file: 'bench', scale: 0.8 },
	{ id: 'tent', pack: 'survival-kit', file: 'tent-canvas', scale: 1.3 },
	{
		id: 'campfire',
		pack: 'survival-kit',
		file: 'campfire-pit',
		scale: 1.2,
		effects: [
			{ kind: 'fire', offset: [0, 0.25, 0], size: 0.75 },
			{ kind: 'light', offset: [0, 1.2, 0], color: '#ff9a3c', size: 1.4 },
			{ kind: 'smoke', offset: [0, 1.6, 0], size: 0.55 }
		]
	},
	// Lights for the war side, in pale iron rather than the graveyard kit's green.
	{
		// A small candle lantern for the ground: its light is low, so it reaches the floor around it.
		id: 'lantern',
		pack: 'graveyard-kit',
		file: 'lantern-candle',
		scale: 1,
		repaint: { area: [352, 256, 32, 128], color: '#d8d3c9' },
		light: { height: 0.75, color: '#ffb35c', intensity: 1.5 }
	},
	{
		// An iron fire bowl, for pillar tops, walls and the road: fire without a bonfire's logs.
		id: 'brazier',
		pack: 'graveyard-kit',
		file: 'fire-basket',
		scale: 1,
		repaint: { area: [352, 256, 32, 128], color: '#d8d3c9' },
		effects: [
			{ kind: 'fire', offset: [0, 0.45, 0], size: 0.8 },
			{ kind: 'light', offset: [0, 1.4, 0], color: '#ff9a3c', size: 1.3 }
		]
	},

	// Catalog picks, to try out on the island.
	{ id: 'siege-tower', pack: 'castle-kit', file: 'siege-tower', scale: 0.4, repaint: siegeRepaint },
	{ id: 'siege-ram', pack: 'castle-kit', file: 'siege-ram', scale: 0.4, repaint: siegeRepaint },
	{ id: 'castle-bridge', pack: 'castle-kit', file: 'bridge-straight', scale: 0.45 },
	{ id: 'castle-bridge-pillar', pack: 'castle-kit', file: 'bridge-straight-pillar', scale: 0.45 },
	{ id: 'castle-door', pack: 'castle-kit', file: 'door', scale: 0.45 },
	{ id: 'flag-pole', pack: 'castle-kit', file: 'flag', scale: 0.5 },
	{ id: 'banner-long', pack: 'castle-kit', file: 'flag-banner-long', scale: 0.5 },
	{ id: 'slant-roof-tower', pack: 'castle-kit', file: 'tower-slant-roof', scale: 0.45 },
	{ id: 'cart', pack: 'fantasy-town-kit', file: 'cart', scale: 0.75 },
	{ id: 'crypt-small', pack: 'graveyard-kit', file: 'crypt-small', scale: 0.8 },
	{ id: 'hay-bale-bundled', pack: 'graveyard-kit', file: 'hay-bale-bundled', scale: 0.6, repaint: hayStraps },
	{ id: 'obelisk', pack: 'graveyard-kit', file: 'pillar-obelisk', scale: 0.8 },
	{ id: 'fall-pine', pack: 'graveyard-kit', file: 'pine-fall', scale: 0.8 },
	{ id: 'fall-pine-crooked', pack: 'graveyard-kit', file: 'pine-fall-crooked', scale: 0.8 },
	{ id: 'old-trunk', pack: 'graveyard-kit', file: 'trunk', scale: 0.8 },
	{ id: 'vending-machine', pack: 'mini-arcade', file: 'vending-machine', scale: 1 },
	{ id: 'arena-column-broken', pack: 'mini-arena', file: 'column-damaged', scale: 0.6 },
	{ id: 'spear', pack: 'mini-arena', file: 'weapon-spear', scale: 0.6 },
	// Hangs from its grip (the model's origin), as on a rack: lift it into place.
	{ id: 'sword', pack: 'mini-arena', file: 'weapon-sword', scale: 0.6 },
	// Carriages in the siege engines' dark wood (the pirate kit's orange wood stays on the forge's barrels).
	{ id: 'cannon', pack: 'pirate-kit', file: 'cannon', scale: 0.5, repaint: { area: [352, 384, 32, 128], color: '#6e4630' } },
	{ id: 'cannon-mobile', pack: 'pirate-kit', file: 'cannon-mobile', scale: 0.5, repaint: { area: [352, 384, 32, 128], color: '#6e4630' } },
	// Centred on its middle: raised so it rests on the ground.
	{ id: 'cannonball', pack: 'pirate-kit', file: 'cannon-ball', scale: 0.4, sink: -0.53 },

	{
		// Two storeys, stone under timber, a pointed roof in the empire's red, and sails that turn,
		// over the door on the +x face.
		id: 'windmill',
		pack: 'fantasy-town-kit',
		scale: 0.75,
		repaint: { area: [32, 384, 32, 128], color: palette.empireRed },
		parts: [
			{ file: 'wall-door' },
			{ file: 'wall', rotationDeg: 90 },
			{ file: 'wall', rotationDeg: 180 },
			{ file: 'wall', rotationDeg: -90 },
			{ file: 'wall-wood-window-small', offset: [0, 1, 0] },
			{ file: 'wall-wood', offset: [0, 1, 0], rotationDeg: 90 },
			{ file: 'wall-wood-window-small', offset: [0, 1, 0], rotationDeg: 180 },
			{ file: 'wall-wood', offset: [0, 1, 0], rotationDeg: -90 },
			{ file: 'roof-high-point', offset: [0, 2, 0] },
			{ file: 'windmill', offset: [0.68, 1.62, 0], scale: 0.5, spin: { axis: 'x', rpm: 5 } }
		]
	}
];

/**
 * Furniture kit: the library pieces. Bookcases are centred, front (+z) open; book clusters stand flush
 * with the shelf front (turned 180° for variety), small plants where a shelf has room, more on top.
 */
const books = (x: number, y: number, flip = false): CompositePart =>
	flip
		? { file: 'books', offset: [x + 0.075, y, 0.015], rotationDeg: 180 }
		: { file: 'books', offset: [x - 0.075, y, 0.11] };
const plant = (n: 1 | 2 | 3, x: number, y: number): CompositePart => ({ file: `plantSmall${n}`, offset: [x, y, 0.03] });

decorKinds.push(
	{ id: 'books', pack: 'furniture-kit', file: 'books', scale: 1 },
	{ id: 'potted-plant', pack: 'furniture-kit', file: 'pottedPlant', scale: 1 },
	{ id: 'small-plant-1', pack: 'furniture-kit', file: 'plantSmall1', scale: 1 },
	{ id: 'small-plant-2', pack: 'furniture-kit', file: 'plantSmall2', scale: 1 },
	{ id: 'small-plant-3', pack: 'furniture-kit', file: 'plantSmall3', scale: 1 },
	{ id: 'floor-lamp', pack: 'furniture-kit', file: 'lampRoundFloor', scale: 1, light: { height: 2.6 } },
	{
		// Shelf tops at 0.13, 0.37 and 0.61; the top at 0.85.
		id: 'bookcase-full',
		pack: 'furniture-kit',
		scale: 1,
		parts: [
			{ file: 'bookcaseOpen', offset: [-0.2, 0, 0.125] },
			books(-0.08, 0.13),
			books(0.08, 0.13, true),
			books(-0.08, 0.37, true),
			plant(1, 0.1, 0.37),
			books(-0.08, 0.61),
			books(0.08, 0.61),
			plant(2, 0.1, 0.85)
		]
	},
	{
		// With a back panel, so it reads as solid standing in the open.
		id: 'bookcase-closed-full',
		pack: 'furniture-kit',
		scale: 1,
		parts: [
			{ file: 'bookcaseClosed', offset: [-0.2, 0, 0.125] },
			plant(3, -0.1, 0.13),
			books(0.07, 0.13),
			books(-0.08, 0.37),
			books(0.08, 0.37, true),
			books(0.08, 0.61),
			plant(1, -0.1, 0.85),
			plant(2, 0.1, 0.85)
		]
	},
	{
		// Twice as wide; shelf tops at 0.07, 0.31 and 0.55, the top at 0.79.
		id: 'bookcase-wide-full',
		pack: 'furniture-kit',
		scale: 1,
		parts: [
			{ file: 'bookcaseClosedWide', offset: [-0.4, 0, 0.125] },
			books(-0.27, 0.07),
			books(-0.11, 0.07, true),
			plant(2, 0.1, 0.07),
			books(0.26, 0.07),
			books(-0.27, 0.31, true),
			books(-0.11, 0.31),
			books(0.08, 0.31),
			books(0.24, 0.31, true),
			plant(1, -0.27, 0.55),
			books(-0.08, 0.55),
			books(0.22, 0.55, true),
			plant(3, -0.25, 0.79),
			plant(1, 0.25, 0.79)
		]
	},
	{
		// Low: one shelf of books (top at 0.13) and a row of small plants on top (0.37).
		id: 'bookcase-low',
		pack: 'furniture-kit',
		scale: 1,
		parts: [
			{ file: 'bookcaseOpenLow', offset: [-0.2, 0, 0.125] },
			books(-0.08, 0.13),
			books(0.08, 0.13, true),
			plant(1, -0.12, 0.37),
			plant(2, 0, 0.37),
			plant(3, 0.12, 0.37)
		]
	},
	{
		// Round rug (centred) with an armchair, a floor lamp behind it and a small table of books beside.
		id: 'reading-nook',
		pack: 'furniture-kit',
		scale: 1,
		light: { height: 2.6 },
		parts: [
			{ file: 'rugRound', offset: [-0.46, 0, 0.46] },
			{ file: 'loungeChair', offset: [-0.4, 0.01, 0.0] },
			{ file: 'lampRoundFloor', offset: [-0.45, 0.01, -0.3] },
			{ file: 'sideTable', offset: [0.15, 0.01, -0.12], scale: 0.6 },
			{ file: 'books', offset: [0.2, 0.24, -0.1], scale: 0.8 }
		]
	}
);

export interface LandmarkConfig {
	/** File inside static/models/other/, without .glb. Not from Kenney: see CREDITS.md. */
	file: string;
	at: Point;
	rotationDeg: number;
	/** Largest horizontal size in world units; the model is scaled to fit. */
	width: number;
	/** How far it sinks into the ground, so an uneven base doesn't float. */
	sink: number;
	/** Flat colour, for untextured models. */
	color: string;
}

/** Large one-off pieces from outside the Kenney packs. */
export const landmarks: LandmarkConfig[] = [];

export interface CaveMouthConfig {
	/** The tier whose cliff the cave opens in. */
	wallOf: string;
	/** A point on the ground in front of the cliff. */
	at: Point;
	/** Direction from `at` towards the cliff; the mouth faces the other way. */
	into: Point;
	width: number;
	height: number;
}

/** Cave mouths drawn onto cliff faces: no floor space, just depth from layered dark arches. */
export const caveMouths: CaveMouthConfig[] = [
	{ wallOf: 'middle', at: [-2.2, 17.6], into: [-1, -1], width: 2.6, height: 2.1 }
];
