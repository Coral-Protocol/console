import type { FileData, Agent, Group, Tool } from './fileStorage.svelte';
import type { components } from '$generated/api.ts';
import { getSecretFromId } from './components/dialogs/secretManager.svelte';

type AgentGraphRequest = components['schemas']['AgentGraphRequest'];
type SessionRequest = components['schemas']['SessionRequest'];

export function toSessionRequest(file: FileData, format?: 'submission' | 'check'): SessionRequest {
	const sessionRequest = $state.snapshot(file);
	const clientIdToName = new Map(
		sessionRequest.agents.map((agent) => [agent.clientId, agent.name])
	);
	let agents: AgentGraphRequest['agents'] = sessionRequest.agents.map(
		({ clientId, nodeData, ...rest }) => rest
	);
	const tools: AgentGraphRequest['customTools'] = Object.fromEntries(
		sessionRequest.tools.map(({ clientId, name, ...rest }) => [name, rest])
	);

	if (format !== 'submission') {
		agents = sessionRequest.agents.map(({ clientId, nodeData, ...rest }) => {
			const options = rest.options as Record<string, any> | undefined;
			if (options) {
				Object.entries(options).forEach(([key, val]) => {
					if (val && val.secret === true) {
						const secretObject = getSecretFromId(val.value);
						if (secretObject === undefined) {
							delete options[key];
						}
						delete val.secret;
					}
				});
			}
			return rest;
		});
	} else {
		agents = sessionRequest.agents.map(({ clientId, nodeData, ...rest }) => {
			const options = rest.options as Record<string, any> | undefined;
			if (options) {
				Object.entries(options).forEach(async ([key, val]) => {
					if (val && val.secret === true) {
						const secretObject = getSecretFromId(val.value);
						delete val.secret;
						val.value = secretObject?.secret;
					}
				});
			}
			return rest;
		});
	}

	const groups: AgentGraphRequest['groups'] = sessionRequest.groups
		.map((group) =>
			group.agentClientIds.map((clientId) => {
				const name = clientIdToName.get(clientId);
				if (!name) {
					throw new Error(
						`Group "${group.name}" (${group.clientId}) references unknown agent clientId "${clientId}"`
					);
				}
				return name;
			})
		)
		.filter((groupNames) => groupNames.length > 0);

	return {
		agentGraphRequest: {
			agents,
			groups,
			customTools: tools
		},
		namespaceProvider: sessionRequest.namespaceProvider,
		execution: sessionRequest.execution,
		budgetSettings: sessionRequest.budgetSettings,
		annotations: sessionRequest.annotations
	};
}

export function fromSessionRequest(request: SessionRequest, previous: FileData): FileData {
	const prevAgentByName = new Map(previous.agents.map((a) => [a.name, a]));

	const agents: Agent[] = (request.agentGraphRequest?.agents ?? []).map((serverAgent) => {
		const existing = prevAgentByName.get(serverAgent.name);
		return {
			...serverAgent,
			clientId: existing?.clientId ?? crypto.randomUUID()
		};
	});

	const nameToClientId = new Map(agents.map((a) => [a.name, a.clientId]));

	const prevToolByName = new Map(previous.tools.map((t) => [t.name, t]));

	const tools: Tool[] = Object.entries(request.agentGraphRequest?.customTools ?? {}).map(
		([name, serverTool]) => {
			const existing = prevToolByName.get(name);
			return {
				...serverTool,
				name,
				clientId: existing?.clientId ?? crypto.randomUUID()
			};
		}
	);

	const prevGroupByMemberKey = new Map(
		previous.groups.map((g) => {
			const names = g.agentClientIds
				.map((id) => previous.agents.find((a) => a.clientId === id)?.name)
				.filter((n): n is string => !!n);
			return [names.slice().sort().join('|'), g] as const;
		})
	);

	const groups: Group[] = (request.agentGraphRequest?.groups ?? []).map((memberNames, index) => {
		const key = memberNames.slice().sort().join('|');
		const existing = prevGroupByMemberKey.get(key);

		const agentClientIds = memberNames
			.map((name) => nameToClientId.get(name))
			.filter((id): id is string => !!id);

		return {
			clientId: existing?.clientId ?? crypto.randomUUID(),
			name: existing?.name ?? `Group ${index + 1}`,
			agentClientIds
		};
	});

	return {
		id: previous.id,
		agents,
		groups,
		tools,
		namespaceProvider: request.namespaceProvider,
		execution: request.execution,
		budgetSettings: request.budgetSettings,
		annotations: request.annotations ?? {}
	};
}
