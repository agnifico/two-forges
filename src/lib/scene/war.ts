// The war side ("Isengard"): the raw, gritty side, ready to go to war on the world's problems.
// A dusty valley, larger than the forge, ringed by rock ridges. The castle climbs the back half in
// three square walled levels (the beliefs I defend), set square to the island like the land
// itself, with room between levels for greenery and a moat on the outer level. A road climbs the
// middle to the tower at its heart. The arena, open on its road side, sits on sand to the left;
// the graveyard (memory and remembrance) lies on the valley floor to the right.
//
// Same axes as the forge (see config.ts): the default camera looks from the +x/+z corner, so the
// back corner (screen top) is -x -z, the front (screen bottom) +x +z, left -x +z, right +x -z.
// The road runs along x = z, which is the screen's vertical centre line.

import type { Point } from './config';
import type { SideConfig } from './sides';

const rough = { amplitude: 0.5, wavelength: 3.4, chipAmplitude: 0.16 };
const ragged = { amplitude: 0.6, wavelength: 2.6, chipAmplitude: 0.22 };
/** Barely roughened, so the walls on top run straight. */
const square = { amplitude: 0.12, wavelength: 4, chipAmplitude: 0.05 };

const rock = '#968a7d';
/** The ridges behind the castle: forested mountain rather than bare rock. */
const forest = '#6f8a4e';

/** The castle's levels are squares around one centre: the tower. */
const CASTLE: Point = [-11, -11];
const KEEP_TOP = 7.2;
/** Height of the castle walls (castle-kit wall at 0.45). The ridges stay below the keep's walls. */
const WALL_HEIGHT = 3.2;
const RIDGE_TOP = KEEP_TOP + WALL_HEIGHT / 2;

/**
 * A square of the given half-size around `centre`, with chamfered corners. Extra points along each
 * side keep the smoothed outline straight.
 */
function squareAround([cx, cz]: Point, half: number, chamfer = 1.2): Point[] {
	const a = half - chamfer;
	const corners: Point[] = [
		[-half, -a],
		[-a, -half],
		[a, -half],
		[half, -a],
		[half, a],
		[a, half],
		[-a, half],
		[-half, a]
	];
	const points: Point[] = [];
	corners.forEach((p, i) => {
		const q = corners[(i + 1) % corners.length];
		points.push(p);
		// Each odd step is a long side: add points along it.
		if (i % 2 === 1) {
			for (const t of [0.25, 0.5, 0.75]) points.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
		}
	});
	return points.map(([x, z]) => [cx + x, cz + z] as Point);
}

const OUTER = 16.5;
const INNER = 9.5;
const KEEP = 4.5;

/** A moat arm: a strip running along one front face of the inner level, on the outer level. */
const moatArm = (id: string, points: Point[]) => ({
	id,
	tier: 'outer-terrace',
	points,
	roughness: { amplitude: 0.15, wavelength: 3, chipAmplitude: 0.06 },
	waterDrop: 0.5,
	depth: 1.2,
	lilyPads: 0
});
// The inner level's front faces are at x = -1.5 and z = -1.5; the arms stop short of the road
// (which climbs the corner between them) so the stairs stay dry.
const FACE = CASTLE[0] + INNER;

export const warSide: Omit<SideConfig, 'layout'> = {
	id: 'war',
	colors: {
		background: '#e2d5c4',
		backgroundNight: '#2f2440',
		rock: '#8c7c6c',
		rockUnderside: '#6c5e52',
		// Light stone: the road and its stairs read as one decorated way up.
		stairs: '#e3dccf',
		path: '#ece5d8',
		pathEdge: '#c9bda8',
		// Close to the valley grass for the light patches, darker for the deep ones.
		patches: ['#b1ad6e', '#76854a', '#c8b27c', '#9a8a63']
	},
	tiers: [
		{
			// Valley floor: dry grass.
			id: 'floor',
			top: 0,
			surface: '#a8a466',
			patches: 12,
			roughness: rough,
			points: [
				[-24, -26],
				[-8, -26.7],
				[10.7, -26],
				[24.7, -22.7],
				[26, -8],
				[26, 10.7],
				[22.7, 24],
				[8, 26],
				[-10.7, 26.4],
				[-24.7, 23.3],
				[-26.4, 8],
				[-26, -10.7]
			]
		},
		{
			// Sand for the arena and the forecourt in front of its open side.
			id: 'arena-sand',
			top: 0.35,
			surface: '#dcc28c',
			roughness: rough,
			points: [
				[-23.5, 7],
				[-14, 5.2],
				[-4, 6],
				[-1.5, 13],
				[-4, 20.5],
				[-13, 22.5],
				[-22.5, 21],
				[-24.5, 14]
			]
		},
		{
			// Castle: three square levels, each with room inside its wall.
			id: 'outer-terrace',
			top: 2.4,
			surface: '#b3a17c',
			// Green patches, so the ground behind the walls reads as the forest's edge.
			patches: 8,
			roughness: square,
			points: squareAround(CASTLE, OUTER, 1.6)
		},
		{
			id: 'inner-terrace',
			top: 4.8,
			surface: '#aea08a',
			patches: 2,
			roughness: square,
			points: squareAround(CASTLE, INNER)
		},
		{
			// The keep: the top level, with the tower at its heart.
			id: 'keep',
			top: KEEP_TOP,
			surface: '#a39d93',
			roughness: square,
			points: squareAround(CASTLE, KEEP, 0.8)
		},
		{
			// Rock ridges behind the castle, along the two back edges, lower than the keep's walls.
			id: 'ridge-left',
			top: RIDGE_TOP,
			surface: forest,
			patches: 3,
			roughness: ragged,
			points: [
				[-26.3, -2],
				[-26.3, -16],
				[-24.5, -24.5],
				[-21.5, -23],
				[-22.2, -14],
				[-22.5, -3.5]
			]
		},
		{
			id: 'ridge-right',
			top: RIDGE_TOP - 0.6,
			surface: forest,
			patches: 3,
			roughness: ragged,
			points: [
				[-16, -26.3],
				[-2, -26],
				[2.5, -24.8],
				[1.5, -22],
				[-6, -21.8],
				[-17, -22.3]
			]
		},
		{
			// Crags only along the sides: two up the top-left edge towards the castle, one at the
			// right corner, and one on the front-right edge carrying the trebuchet.
			id: 'crag-left-near',
			top: 3.4,
			surface: rock,
			roughness: ragged,
			points: [
				[-26.6, 4.5],
				[-23.5, 4],
				[-22.8, 7.5],
				[-23.8, 10.5],
				[-26.6, 10.5]
			]
		},
		{
			id: 'crag-left-far',
			top: 2.6,
			surface: rock,
			roughness: ragged,
			points: [
				[-26.4, 15],
				[-24.2, 14.5],
				[-23.6, 17.5],
				[-24.4, 20.5],
				[-26, 20.5]
			]
		},
		{
			id: 'crag-right',
			top: 3.8,
			surface: rock,
			roughness: ragged,
			points: [
				[14, -26],
				[21, -24],
				[25.2, -19],
				[24, -16],
				[20, -18.5],
				[15, -22.5]
			]
		},
		{
			id: 'crag-front-right',
			top: 1.6,
			surface: rock,
			roughness: ragged,
			points: [
				[26.2, -3],
				[22, -2.5],
				[20.6, 2.5],
				[21.5, 8],
				[26.2, 8.5]
			]
		}
	],
	ponds: [
		moatArm('moat-right', [
			[FACE + 0.9, -3.8],
			[FACE + 2.9, -3.8],
			[FACE + 2.9, -18.5],
			[FACE + 0.9, -18.5]
		]),
		moatArm('moat-left', [
			[-3.8, FACE + 0.9],
			[-3.8, FACE + 2.9],
			[-18.5, FACE + 2.9],
			[-18.5, FACE + 0.9]
		])
	],
	// The road climbs the middle (along x = z) through a gate in each level.
	stairs: [
		{ from: 'floor', to: 'outer-terrace', at: [8.5, 8.5], climb: [-1, -1], width: 2.4 },
		{ from: 'outer-terrace', to: 'inner-terrace', at: [1.8, 1.8], climb: [-1, -1], width: 2.4 },
		{ from: 'inner-terrace', to: 'keep', at: [-3.6, -3.6], climb: [-1, -1], width: 2.4 }
	],
	caveMouths: [],
	// The road: from the valley's front corner up through each gate to the tower. A paved square for
	// the market in front of the graveyard, with a lane to it from the road.
	paths: [
		{ points: [[23, 23], [-8.6, -8.6]], width: 2.4 },
		{ points: [[11.4, 1.6], [17.6, 1.6]], width: 6.2 },
		{ points: [[10.6, 10.6], [13.6, 4.4]], width: 2 }
	],
	stations: ['keep', 'arena', 'graveyard', 'seventhFloor', 'hero', 'market', 'arenaTree'],
	wallRuns: (['outer-terrace', 'inner-terrace', 'keep'] as const).map((tier) => ({
		tier,
		inset: tier === 'keep' ? 1.1 : 1.4,
		wall: 'castle-wall',
		tower: 'castle-tower',
		blockLength: 2.45,
		towerScale: 1.25,
		towerLength: 3.7,
		midTowerFrom: 6,
		gapWidth: 3.4
	})),
	layoutFile: 'src/lib/scene/layout-war.ts',
	layoutExport: 'warLayout'
};
