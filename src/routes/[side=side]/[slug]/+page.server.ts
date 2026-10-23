import { error } from '@sveltejs/kit';
import { loadStation, stationEntries } from '#lib/server/content.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

/** One prerendered page per station file. */
export const entries: EntryGenerator = () => stationEntries();

export const load: PageServerLoad = ({ params }) => {
	const station = loadStation(params.side, params.slug);
	if (!station) error(404, 'There is no such station.');
	return { station };
};
