import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// `fallback` lets adapter-static emit an SPA shell for routes that
		// can't be prerendered (e.g. /memories/[id], whose ids are local
		// IndexedDB keys generated on the fly).
		adapter: adapter({ fallback: 'index.html' }),
		paths: {
			relative: false,
			base: process.argv.includes('dev') ? '' : process.env.BASE_PATH
		},
		alias: {
			$generated: 'src/generated'
		}
	}
};

export default config;
