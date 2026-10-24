import { loadSkills } from '#lib/server/content.ts';
import type { PageServerLoad } from './$types';

// The skills panel's content, shared with the cottage on the island.
export const load: PageServerLoad = () => ({ skills: loadSkills() });
