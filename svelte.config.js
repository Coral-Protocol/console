import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import {mdsvex} from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],

	kit: {
		adapter: adapter(),
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
