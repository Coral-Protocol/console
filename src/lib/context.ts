import type { paths } from '$generated/api';
import type { Client } from 'openapi-fetch';
import { Context } from 'runed';
import type { Session } from './session.svelte';
import type { CoralServer } from './CoralServer.svelte';
import type { Logs } from './logs.svelte';

export type CoralClient = Client<paths, `${string}/${string}`>;

export type AppContext = {
	server: CoralServer;
	session: Session | null;
	logs: Logs | null;
};

export const appContext = new Context<AppContext>('app');
