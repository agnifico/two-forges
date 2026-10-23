// Skill tags for a station's `stack`: each known name gets its brand colour and, where Simple Icons
// (CC0) has one, its logo. Read at build time only; the page gets just the colour and an SVG path.
// Names not listed here still work, as a plain tag in a neutral colour.

import * as icons from 'simple-icons';
import type { Tag } from '../content/types';

type SimpleIcon = { path: string; hex: string };

/** Display name → Simple Icons slug (null: no logo there) and background colour (default: the logo's own). */
const known: Record<string, { icon: string | null; color?: string }> = {
	TypeScript: { icon: 'typescript' },
	Svelte: { icon: 'svelte' },
	SvelteKit: { icon: 'svelte' },
	HTML: { icon: 'html5' },
	CSS: { icon: 'css' },
	Affinity: { icon: null, color: '#2E9A5E' },
	// Figma's own purple, so the orange stays Illustrator's.
	Figma: { icon: 'figma', color: '#A259FF' },
	Illustrator: { icon: null, color: '#FF9A00' },
	Photoshop: { icon: null, color: '#31A8FF' },
	Framer: { icon: 'framer' },
	Canva: { icon: null, color: '#0E9F9A' },
	Vercel: { icon: 'vercel' },
	Git: { icon: 'git', color: '#F05032' },
	'Node.js': { icon: 'nodedotjs' },
	Claude: { icon: 'claude' },
	Gemini: { icon: 'googlegemini' },
	'Tensor.Art': { icon: null },
	Tiled: { icon: null, color: '#3A6EA5' }
};

const NEUTRAL = '#55606E';

const iconFor = (slug: string): SimpleIcon | undefined =>
	(icons as unknown as Record<string, SimpleIcon>)[`si${slug[0].toUpperCase()}${slug.slice(1)}`];

/** White text on dark colours, near-black on light ones. */
function textOn(hex: string): string {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#1d1d1f' : '#ffffff';
}

export function tag(label: string): Tag {
	const entry = known[label];
	const icon = entry?.icon ? iconFor(entry.icon) : undefined;
	const color = entry?.color ?? (icon ? `#${icon.hex}` : NEUTRAL);
	return { label, color, text: textOn(color), icon: icon?.path };
}
