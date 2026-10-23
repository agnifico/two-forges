import { resolve } from '$app/paths';
import type { StationId } from '../scene/config';
import type { SideId } from '../scene/sides';

/** `draftingDesk` → `drafting-desk`. */
export const stationSlug = (id: StationId) => id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `drafting-desk` → `draftingDesk` (unchecked). */
export const slugStation = (slug: string) => slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

export const stationHref = (side: SideId, id: StationId) =>
	resolve('/[side=side]/[slug]', { side, slug: stationSlug(id) });

export const homeHref = () => resolve('/');

/** Off-site links open in a new tab. */
export const isExternal = (url: string) => /^[a-z]+:/i.test(url) && !url.startsWith('mailto:');
