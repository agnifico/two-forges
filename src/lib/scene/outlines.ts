// Hand-shaped terrain: control points of tier and pond outlines, by side and outline id, replacing
// the defaults in config.ts and war.ts. Written by the dev placement tool (Shapes mode, T), and
// safe to edit by hand. Delete an entry to go back to the default shape.

import type { Point } from './config';

export const outlineEdits: Partial<Record<'forge' | 'war', Record<string, Point[]>>> = {
	forge: {
		'upper-pond': [
			[6.83, 6.77],
			[5.53, 7.93],
			[4.23, 9.09],
			[2.06, 10.96],
			[0.14, 10.51],
			[-0.26, 7.68],
			[1.41, 4.69],
			[2.47, 2.02],
			[4.43, 1.65],
			[7.32, 3.91]
		],
		'pond': [
			[11.6, 8.2],
			[12.2, 11],
			[10.4, 14.6],
			[7.4, 17.2],
			[5.07, 20.44],
			[0.73, 20.68],
			[-1.4, 14.6],
			[0.4, 11.8],
			[4, 9.6],
			[7.6, 7.4]
		],
		'lower': [
			[-7.8, 18.9],
			[-5.2, 13],
			[2.6, 6.5],
			[10.4, 0],
			[15.6, -5.9],
			[18.9, -6.5],
			[18.71, 7.91],
			[17.6, 16.9],
			[7.8, 19.2]
		],
		'upper': [
			[-19.58, 4.96],
			[-18.8, -14.3],
			[-14.9, -18.8],
			[-2.6, -19.2],
			[2.6, -18.2],
			[2, -13.6],
			[-3.9, -9.1],
			[-10.4, -3.2],
			[-14.3, 3.9],
			[-16.18, 6.28]
		]
	},
	war: {
		'crag-front-right': [
			[26.15, -2.84],
			[23.31, -2.34],
			[26.2, 8.5]
		],
		'crag-right': [
			[14.83, -25.27],
			[21, -24],
			[25.2, -19],
			[25.56, -16.32],
			[22.62, -15.72],
			[21.97, -17.54],
			[19.92, -19.1],
			[17.31, -19.23],
			[15, -22.5]
		]
	}
};
