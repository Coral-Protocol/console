import { defineConfig } from 'orval';

export default defineConfig({
	api: {
		input: {
			target: './api_v1.json'
		},
		output: {
			client: 'zod',
			mode: 'single',
			target: './src/generated/api.zod.ts',
			override: {
				zod: {
					generateReusableSchemas: true
				}
			}
		}
	}
});
