import { loadShared } from '#lib/server/content.ts';
import type { LayoutServerLoad } from './$types';

// Runs at build time only (the site is prerendered): every page gets the site, the interests, a
// summary of each station and the secret notes.
export const load: LayoutServerLoad = () => loadShared();
