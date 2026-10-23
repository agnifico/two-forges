import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { placementTool } from './src/lib/dev/vite-plugin';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Root-relative asset URLs: 404.html is served at whatever path was missing, so relative ones
			// would break there. Fine on the site's own domain (see ROADMAP: deep links).
			paths: { relative: false }
		}),
		// Dev-only endpoints for the placement tool (save layout, model thumbnails).
		placementTool()
	]
});
