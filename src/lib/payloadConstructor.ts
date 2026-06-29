import type { FileData, Agent, Group } from './fileStorage';
import type { components } from '$generated/api.ts'; // adjust path

type AgentGraphRequest = components['schemas']['AgentGraphRequest'];
type SessionRequest = components['schemas']['SessionRequest'];

export function toSessionRequest(file: FileData): SessionRequest {
	const clientIdToName = new Map(file.agents.map((agent) => [agent.clientId, agent.name]));

	const agents: AgentGraphRequest['agents'] = file.agents.map(({ clientId, ...rest }) => rest);

	const groups: AgentGraphRequest['groups'] = file.groups.map((group) =>
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
			customTools: file.sessionSettings.customTools
		},
		namespaceProvider: file.sessionSettings.namespaceProvider,
		execution: file.sessionSettings.execution,
		budgetSettings: file.sessionSettings.budgetSettings,
		annotations: file.sessionSettings.annotations
	};
}

/**
 * Reverse of toSessionRequest. Converts a server-shape SessionRequest back
 * into FileData, reusing clientIds from `previous` wherever an agent/group
 * can be matched (by name), so editing in the Code pane doesn't reshuffle
 * diagram node identity. New entries get fresh clientIds; group names are
 * synthesized since the server doesn't store them.
 */
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

	// Match groups by their resolved member-name set, so reordering members
	// or untouched groups keep their identity across edits.
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
