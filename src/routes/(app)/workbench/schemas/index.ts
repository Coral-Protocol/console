import type { components } from '$generated/api';
import type { CoralServer } from '$lib/CoralServer.svelte';

import { z } from 'zod/v4';
import type { CreateSessionRequest, CustomTool, FormSchema, Provider, ProviderType } from './types';

export type { FormSchema } from './types';

export const toPayload = async (server: CoralServer, data: z.output<FormSchema>) => {
	const detailed = await Promise.all(data.agents.map((a) => server.lookupAgent(a.id)));
	const agents = data.agents.map((agent, idx) => {
		const reg = detailed[idx];
		if (!reg) throw new Error('something bad happened');

		return {
			id: agent.id,
			name: agent.name,
			description: agent.description,
			provider: {
				type: agent.providerType as ProviderType,
				runtime: agent.provider.runtime,
				...(agent.providerType == 'remote_request' ? agent.provider.remote_request : {})
			} as any,

			blocking: agent.blocking,
			systemPrompt: agent.systemPrompt,
			customToolAccess: Array.from(agent.customToolAccess)
				.map((id) => data.tools[id]?.name)
				.filter(Boolean) as string[], // safe assertion because .filter(Boolean) removes null/undefined
			plugins: agent.plugins ?? [],
			x402Budgets: [],
			options: Object.fromEntries(
				Object.entries(agent.options ?? {})
					.filter(([name]) => name in reg.registryAgent.options)
					.filter(([name, opt]: [string, any]) => {
						const schemaOpt = reg.registryAgent.options[name];
						if (!schemaOpt) return false;

						const defaultVal = schemaOpt.default;
						if (!opt || opt.value === undefined) return false;

						try {
							return JSON.stringify(opt.value) !== JSON.stringify(defaultVal);
						} catch {
							return true;
						}
					})
					.map(([name, opt]) => [name, { type: opt.type, value: opt.value }])
			) as any
		} satisfies components['schemas']['GraphAgentRequest'];
	});

	const customTools = Object.fromEntries(
		Object.values(data.tools).map((tool) => {
			const value = {
				transport: structuredClone(tool.transport),
				schema: structuredClone(tool.schema) as any // Safety: JSON schema needs more fields according to openapi but coral server doesn't actually need them
			} satisfies NonNullable<CreateSessionRequest['agentGraphRequest']['customTools']>[string];
			return [tool.name, value];
		})
	);

	return {
		agentGraphRequest: {
			agents,
			groups: data.groups,
			customTools
		},
		namespaceProvider: {
			type: 'create_if_not_exists',
			namespaceRequest: {
				name: server.namespace,
				annotations: {},
				deleteOnLastSessionExit: false
			}
		},
		execution: {
			mode: 'immediate',
			runtimeSettings: {
				extendedEndReport: false,
				ttl: data.sessionRuntimeSettings.ttl
			}
		}
	} satisfies CreateSessionRequest;
};

// export const defaultPayload = {
// 	groups: [],
// 	tools: {},
// 	sessionRuntimeSettings: {
// 		ttl: 50000
// 	},
// 	agents: []
// } satisfies CreateSessionRequest;

export const defaultProvider = {
	runtime: 'executable',
	remote_request: {
		maxCost: { amount: 10, type: 'coral' },
		serverSource: {
			type: 'servers',
			servers: []
		}
	}
} satisfies Provider;
export const importFromPayload = (json: string): z.output<FormSchema> => {
	const data: CreateSessionRequest = JSON.parse(json);
	const toolMap = Object.fromEntries(
		Object.keys(data.agentGraphRequest.customTools ?? {}).map((k) => [
			k,
			crypto.randomUUID() as string
		])
	);
	const tools = Object.fromEntries(
		Object.entries(data.agentGraphRequest.customTools ?? {}).map(([k, v]) => {
			const id = toolMap[k]!; // Safety: toolMap is built from custom tool keys
			return [
				id,
				{
					id,
					name: k,
					schema: v.schema,
					transport: v.transport
				} satisfies CustomTool
			];
		})
	);
	const defaultRuntimeSettings = {
		ttl: 50000
	};
	return {
		tools,
		groups: data.agentGraphRequest.groups ?? [],
		sessionRuntimeSettings: {
			...defaultRuntimeSettings,
			...(data.execution && data.execution.mode === 'immediate'
				? data.execution.runtimeSettings
				: {})
		},
		agents: data.agentGraphRequest.agents.map((agent) => ({
			id: agent.id,
			name: agent.name,
			description: agent.description ?? '',
			provider: {
				runtime: agent.provider.runtime,
				remote_request:
					agent.provider.type === 'remote_request'
						? {
								maxCost: agent.provider.maxCost,
								// ensure serverSource is the "servers" variant expected by the form model
								serverSource:
									agent.provider.serverSource &&
									typeof (agent.provider.serverSource as any).type === 'string' &&
									(agent.provider.serverSource as any).type === 'servers'
										? (agent.provider.serverSource as any)
										: { type: 'servers', servers: [] },
								serverScoring: agent.provider.serverScoring
							}
						: defaultProvider.remote_request
			},
			providerType: agent.provider.type,
			blocking: agent.blocking ?? true,
			systemPrompt: agent.systemPrompt,
			plugins: agent.plugins ?? [],
			options: agent.options as any,
			customToolAccess: new Set(
				(agent.customToolAccess ?? []).map((t) => toolMap[t]).filter(Boolean) as string[] // typescript is stupid this is safe because .filter(Boolean)
			)
		}))
	};
	// selectedAgent = $formData.agents.length > 0 ? 0 : null;
	// toast.success('Session JSON updated successfully');
	// jsonDirty = false;
	// toast.error('Failed to update session from JSON: ' + error);
	// console.error(error);
};
