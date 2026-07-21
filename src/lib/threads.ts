import { Context } from 'runed';
import type { Session } from './session.svelte';
import type { components, operations, paths } from '../generated/api';
import type { Client } from 'openapi-fetch';

export type Message = components['schemas']['SessionThreadMessage']; // FIXME: oub??

export type Thread = components['schemas']['SessionThread']; // FIXME: oub??

export type AgentOption = {
	name: string;
	description?: string;
	value: string | undefined;
} & ({ type: 'string'; default: string | null } | { type: 'number'; default: number | null });

export type Agent = any; //components['schemas']['SessionAgent']; // FIXME: oub??
export type RegistryAgent = components['schemas']['RegistryAgent'];
export type Registry =
	operations['getRegistryAgents']['responses']['200']['content']['application/json'];

export const idAsKey = (id: RegistryAgent['info']['identifier']): string =>
	`${id.name}${id.version}`;

export type GraphAgentRequest = components['schemas']['GraphAgentRequest'];

export type ToolTransport = {
	type: 'http';
	url: string;
};

export type CustomTool = components['schemas']['GraphAgentTool'];
