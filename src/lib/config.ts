import * as rawEnv from '$env/static/public';
import { z } from 'zod';

const envSchema = z.object({
	PUBLIC_LOGIN_BEHAVIOUR: z.union([z.literal('token'), z.literal('reload')]).default('token'),
	PUBLIC_API_PATH: z.string().default('/'),
	PUBLIC_DEPLOYMENT: z.union([z.literal('cloud'), z.literal('local')]).default('local')
});

export type Config = z.output<typeof envSchema>;
export type LoginBehaviour = Config['PUBLIC_LOGIN_BEHAVIOUR'];
export type ServerType = Config['PUBLIC_DEPLOYMENT'];

export const config = envSchema.parse(rawEnv);
console.log('Using config:\n', config);
export default config;
