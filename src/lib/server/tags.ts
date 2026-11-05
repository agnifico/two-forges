// Skill tags for the skills panel's tech stack (src/content/skills.yaml): each known name gets its
// brand colour and, where Simple Icons (CC0) has one, its logo. Read at build time only; the page gets
// just the colour and an SVG path.
// Names not listed here still work, as a plain tag in a neutral colour.

import * as icons from 'simple-icons';
import type { Tag } from '../content/types';

type SimpleIcon = { path: string; hex: string };

/**
 * Display name → Simple Icons slug (null: no logo there) and background colour (default: the logo's own).
 * Mid-tone brand colours are lifted to light tints of the same hue, so the dark text they take reads as
 * dark-on-light instead of black on a dark colour.
 */
const known: Record<string, { icon: string | null; color?: string }> = {
	TypeScript: { icon: 'typescript' },
	// Svelte's orange, lightened; SvelteKit a paler shade of it, so the two read apart.
	Svelte: { icon: 'svelte', color: '#FF8164' },
	SvelteKit: { icon: 'svelte', color: '#FEB6A5' },
	HTML: { icon: 'html5', color: '#FEA28A' },
	CSS: { icon: 'css' },
	Affinity: { icon: null, color: '#6DD494' },
	// Figma's own purple (lightened), so the orange stays Illustrator's.
	Figma: { icon: 'figma', color: '#C4A4FF' },
	Illustrator: { icon: null, color: '#FF9A00' },
	Photoshop: { icon: null, color: '#31A8FF' },
	Framer: { icon: 'framer' },
	Canva: { icon: null, color: '#5CD4CE' },
	Vercel: { icon: 'vercel' },
	Git: { icon: 'git', color: '#FF9781' },
	'Node.js': { icon: 'nodedotjs', color: '#8FD27E' },
	// A muted clay, so it doesn't merge with Git's salmon.
	Claude: { icon: 'claude', color: '#E39E87' },
	Gemini: { icon: 'googlegemini', color: '#C9AFF0' },
	'Tensor.Art': { icon: null },
	Tiled: { icon: null, color: '#3A6EA5' }
};

const NEUTRAL = '#55606E';

const iconFor = (slug: string): SimpleIcon | undefined =>
	(icons as unknown as Record<string, SimpleIcon>)[`si${slug[0].toUpperCase()}${slug.slice(1)}`];

/** Near-black for tag text on light colours. Darker than the old #1d1d1f, so mid-tone brands still clear 4.5:1. */
const DARK_TEXT = '#111111';

/** Relative luminance (WCAG), from a #rrggbb colour. */
function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black text, whichever has more contrast on the tag's colour (WCAG AA wants 4.5:1). */
function textOn(hex: string): string {
	const bg = luminance(hex);
	const onWhite = 1.05 / (bg + 0.05);
	const onDark = (bg + 0.05) / (luminance(DARK_TEXT) + 0.05);
	return onDark > onWhite ? DARK_TEXT : '#ffffff';
}

export function tag(label: string): Tag {
	const entry = known[label];
	const icon = entry?.icon ? iconFor(entry.icon) : undefined;
	const color = entry?.color ?? (icon ? `#${icon.hex}` : NEUTRAL);
	return { label, color, text: textOn(color), icon: icon?.path };
}
