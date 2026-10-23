// Turns a Layout into the source of src/lib/scene/layout.ts. Used by the dev placement tool's save
// endpoint; one entry per line so the file stays easy to read and edit by hand.

import type { Layout } from '../scene/config';

const ID = /^[a-zA-Z0-9-]+$/;
const num = (n: number) => String(Number(n.toFixed(2)));

/** Throws if `value` isn't a well-formed layout, so a bad save never writes a broken file. */
export function assertLayout(value: unknown): asserts value is Layout {
	const fail = (why: string) => {
		throw new Error(`Invalid layout: ${why}`);
	};
	const isNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
	const isPoint = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every(isNum);
	if (typeof value !== 'object' || value === null) fail('not an object');
	const { stations, decor } = value as Layout;
	if (typeof stations !== 'object' || stations === null) fail('no stations');
	for (const [id, s] of Object.entries(stations)) {
		if (!ID.test(id) || !isPoint(s?.at) || !isNum(s?.rotationDeg)) fail(`bad station ${id}`);
		if (s.lift !== undefined && !isNum(s.lift)) fail(`bad lift on ${id}`);
		if (s.scale !== undefined && !isNum(s.scale)) fail(`bad scale on ${id}`);
	}
	if (!Array.isArray(decor)) fail('no decor list');
	for (const d of decor) {
		if (typeof d?.kind !== 'string' || !ID.test(d.kind) || !isPoint(d.at)) fail('bad decor entry');
		if (d.rotationDeg !== undefined && !isNum(d.rotationDeg)) fail(`bad turn on ${d.kind}`);
		if (d.scale !== undefined && !isNum(d.scale)) fail(`bad scale on ${d.kind}`);
		if (d.lift !== undefined && !isNum(d.lift)) fail(`bad lift on ${d.kind}`);
	}
}

/** `side` picks the header and export name: the forge's layout.ts or the war side's layout-war.ts. */
export function layoutToSource(layout: Layout, side: 'forge' | 'war' = 'forge'): string {
	const stations = Object.entries(layout.stations)
		.flatMap(([id, s]) => (s ? [`\t\t${id}: { at: [${num(s.at[0])}, ${num(s.at[1])}], rotationDeg: ${num(s.rotationDeg)}${s.lift ? `, lift: ${num(s.lift)}` : ''}${s.scale !== undefined && s.scale !== 1 ? `, scale: ${num(s.scale)}` : ''} }`] : []))
		.join(',\n');
	const decor = layout.decor
		.map((d) => {
			const fields = [`kind: '${d.kind}'`, `at: [${num(d.at[0])}, ${num(d.at[1])}]`];
			if (d.rotationDeg !== undefined) fields.push(`rotationDeg: ${num(d.rotationDeg)}`);
			if (d.scale !== undefined && d.scale !== 1) fields.push(`scale: ${num(d.scale)}`);
			if (d.lift) fields.push(`lift: ${num(d.lift)}`);
			return `\t\t{ ${fields.join(', ')} }`;
		})
		.join(',\n');
	const header =
		side === 'forge'
			? `// Where things stand on the island: station positions and turns, and every decor copy.
// Written by the dev placement tool (Save), and safe to edit by hand. What each station or decor
// kind is lives in config.ts. A decor copy without rotationDeg gets a seeded-random turn.`
			: `// Where things stand on the war side: station positions and turns, and every decor copy.
// Written by the dev placement tool (Save), and safe to edit by hand. What each station or decor
// kind is lives in config.ts; the castle walls are laid by wallRuns in war.ts. A decor copy
// without rotationDeg gets a seeded-random turn.`;
	return `${header}

import type { Layout } from './config';

export const ${side === 'forge' ? 'layout' : 'warLayout'}: Layout = {
	stations: {
${stations}
	},
	decor: [
${decor}
	]
};
`;
}

type OutlineEdits = Record<string, Record<string, [number, number][]>>;

/** Throws unless `value` maps sides to outline ids to lists of [x, z] points (three or more). */
export function assertOutlines(value: unknown): asserts value is OutlineEdits {
	const fail = (why: string) => {
		throw new Error(`Invalid outlines: ${why}`);
	};
	if (typeof value !== 'object' || value === null) fail('not an object');
	for (const [side, outlines] of Object.entries(value as object)) {
		if (side !== 'forge' && side !== 'war') fail(`unknown side ${side}`);
		for (const [id, points] of Object.entries(outlines as object)) {
			if (!ID.test(id)) fail(`bad outline id ${id}`);
			const ok =
				Array.isArray(points) &&
				points.length >= 3 &&
				points.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n)));
			if (!ok) fail(`bad points for ${id}`);
		}
	}
}

/** The source of src/lib/scene/outlines.ts. */
export function outlinesToSource(edits: OutlineEdits): string {
	const sides = Object.entries(edits)
		.filter(([, outlines]) => Object.keys(outlines).length)
		.map(([side, outlines]) => {
			const entries = Object.entries(outlines)
				.map(([id, points]) => {
					const list = points.map(([x, z]) => `\t\t\t[${num(x)}, ${num(z)}]`).join(',\n');
					return `\t\t'${id}': [\n${list}\n\t\t]`;
				})
				.join(',\n');
			return `\t${side}: {\n${entries}\n\t}`;
		})
		.join(',\n');
	return `// Hand-shaped terrain: control points of tier and pond outlines, by side and outline id, replacing
// the defaults in config.ts and war.ts. Written by the dev placement tool (Shapes mode, T), and
// safe to edit by hand. Delete an entry to go back to the default shape.

import type { Point } from './config';

export const outlineEdits: Partial<Record<'forge' | 'war', Record<string, Point[]>>> = {${sides ? `\n${sides}\n` : ''}};
`;
}
