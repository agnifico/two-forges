import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	/** A side of the island, as the first segment of a station's URL (`/war/keep`). */
	side: (param) => (param === 'forge' || param === 'war' ? param : undefined)
});
