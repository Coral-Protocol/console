import type { FileData, Agent, Group } from './fileStorage.svelte';
import type { components } from '$generated/api.ts'; // adjust path

type AgentGraphRequest = components['schemas']['AgentGraphRequest'];
type SessionRequest = components['schemas']['SessionRequest'];

export function toSessionRequest(file: FileData): SessionRequest {
	const sessionRequest = $state.snapshot(file);
	const clientIdToName = new Map(
		sessionRequest.agents.map((agent) => [agent.clientId, agent.name])
	);

	const agents: AgentGraphRequest['agents'] = sessionRequest.agents.map(
		({ clientId, nodeData, ...rest }) => rest
	);

	const groups: AgentGraphRequest['groups'] = sessionRequest.groups.map((group) =>
		group.agentClientIds.map((clientId) => {
			const name = clientIdToName.get(clientId);
			if (!name) {
				throw new Error(
					`Group "${group.name}" (${group.clientId}) references unknown agent clientId "${clientId}"`
				);
			}
			return name;
		})
	);

	return {
		agentGraphRequest: {
			agents,
			groups,
			customTools: sessionRequest.sessionSettings.customTools
		},
		namespaceProvider: sessionRequest.sessionSettings.namespaceProvider,
		execution: sessionRequest.sessionSettings.execution,
		budgetSettings: sessionRequest.sessionSettings.budgetSettings,
		annotations: sessionRequest.sessionSettings.annotations
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
		sessionSettings: {
			customTools: request.agentGraphRequest?.customTools ?? {},
			namespaceProvider: request.namespaceProvider,
			execution: request.execution,
			budgetSettings: request.budgetSettings,
			annotations: request.annotations ?? {}
		}
	};
}
