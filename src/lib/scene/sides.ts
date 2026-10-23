// The island's two sides. Each is a complete floating island; only one is shown at a time, and
// flipping turns the island over to swap them. The forge is the maker; the war side is the raw,
// fighting side (see docs/world-plan.md).

import {
	caveMouths,
	groundPatches,
	palette,
	pond,
	stairs,
	upperPond,
	waterfalls,
	tiers,
	type CaveMouthConfig,
	type Layout,
	type Point,
	type Roughness,
	type StairConfig,
	type StationId,
	type WaterfallConfig
} from './config';
import { layout as forgeLayout } from './layout';
import { outlineEdits } from './outlines';
import { warLayout } from './layout-war';
import { warSide } from './war';

export type SideId = 'forge' | 'war';

export interface SideTier {
	id: string;
	/** Height of the top surface. */
	top: number;
	/** Control polygon; smoothed into a rounded outline, then roughened. */
	points: Point[];
	roughness: Roughness;
	/** Colour of the top surface (grass, sand, earth, rock). */
	surface: string;
	/** Colour of the lip's sides; defaults to a darker surface colour. */
	edge?: string;
	/** Irregular colour patches scattered on this tier (seeded). */
	patches?: number;
}

export interface SidePond {
	id: string;
	tier: string;
	points: Point[];
	roughness: Roughness;
	/** How far the water surface sits below the surrounding ground. */
	waterDrop: number;
	/** Depth of the pond floor below the ground. */
	depth: number;
	lilyPads: number;
}

/**
 * A castle wall that follows a tier's edge (see walls.ts). It is generated only while the side's
 * layout has no pieces of its wall or tower kind; once saved into the layout, they are ordinary
 * decor, editable one by one.
 */
export interface WallRun {
	tier: string;
	inset: number;
	/** DecorKind ids. */
	wall: string;
	tower: string;
	/** Length of one wall block along the run, in world units. */
	blockLength: number;
	/** Size of the generated towers (on top of the tower kind's own scale). */
	towerScale: number;
	/** A tower's length along the wall at that size, in world units. */
	towerLength: number;
	/** Sides at least this many blocks long get a tower in the middle too. */
	midTowerFrom: number;
	/** Width of the opening where stairs land. */
	gapWidth: number;
}

export interface SideConfig {
	id: SideId;
	colors: {
		background: string;
		/** Page background at night. */
		backgroundNight: string;
		rock: string;
		rockUnderside: string;
		stairs: string;
		/** Ground patches: [dry grass, deep grass, sand, earth]. */
		patches: [string, string, string, string];
		/** Paved paths: surface and border. */
		path?: string;
		pathEdge?: string;
	};
	/** Later tiers win where tiers overlap at the same spot (the higher top always wins). */
	tiers: SideTier[];
	/** Water set into tiers: the forge's pond, the war side's moat. */
	ponds: SidePond[];
	stairs: StairConfig[];
	caveMouths: CaveMouthConfig[];
	/** The stations on this side; their placements are in `layout`. */
	stations: StationId[];
	layout: Layout;
	wallRuns: WallRun[];
	/** Water spilling over a tier's edge (animated). */
	waterfalls?: WaterfallConfig[];
	/** Paved paths laid on the ground, as polylines; where they cross a step, the stairs carry on. */
	paths?: { points: Point[]; width: number }[];
	/** Where the dev placement tool saves this side's layout, and the name it exports. */
	layoutFile: string;
	layoutExport: string;
}

export const forgeSide: SideConfig = {
	id: 'forge',
	colors: {
		background: palette.background,
		backgroundNight: '#2b2850',
		rock: palette.rock,
		rockUnderside: palette.rockUnderside,
		stairs: palette.stairs,
		patches: palette.groundPatches
	},
	tiers: (['lower', 'middle', 'upper'] as const).map((id) => ({
		id,
		...tiers[id],
		surface: palette.grass[id],
		edge: palette.grassEdge,
		patches: groundPatches.perTier[id]
	})),
	ponds: [pond, upperPond],
	waterfalls,
	stairs,
	caveMouths,
	stations: [
		'cottage',
		'furnace',
		'draftingDesk',
		'mapTable',
		'arcade',
		'easels',
		'paintVats',
		'waterwheel',
		'readingCorner'
	],
	layout: forgeLayout,
	wallRuns: [],
	layoutFile: 'src/lib/scene/layout.ts',
	layoutExport: 'layout'
};

/** Replaces tier and pond outlines with any hand-shaped ones from outlines.ts. */
function withEdits(side: SideConfig): SideConfig {
	const edits = outlineEdits[side.id] ?? {};
	return {
		...side,
		tiers: side.tiers.map((t) => (edits[t.id] ? { ...t, points: edits[t.id] } : t)),
		ponds: side.ponds.map((p) => (edits[p.id] ? { ...p, points: edits[p.id] } : p))
	};
}

export const sides: Record<SideId, SideConfig> = {
	forge: withEdits(forgeSide),
	war: withEdits({ ...warSide, layout: warLayout })
};
