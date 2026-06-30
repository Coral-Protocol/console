import {
	loadFileData,
	saveFileData,
	defaultFileData,
	type FileData,
	type Agent,
	type Group
} from '$lib/fileStorage';

class ActiveFileStore {
	current = $state<FileData | null>(null);
	#id = $state<string | null>(null);

	async open(id: string) {
		this.#id = id;
		const raw = await loadFileData(id);
		if (this.#id !== id) return;
		try {
			this.current = JSON.parse(raw);
		} catch {
			this.current = defaultFileData(id);
		}
	}

	close() {
		this.#id = null;
		this.current = null;
	}

	#commit(next: FileData) {
		this.current = next;
		saveFileData(next.id, JSON.stringify(next, null, 4));
	}

	addAgent(agent: Omit<Agent, 'clientId'>) {
		if (!this.current) return;
		const newAgent: Agent = { ...agent, clientId: crypto.randomUUID() };
		this.#commit({ ...this.current, agents: [...this.current.agents, newAgent] });
	}

	removeAgent(clientId: string) {
		if (!this.current) return;
		this.#commit({
			...this.current,
			agents: this.current.agents.filter((a) => a.clientId !== clientId),
			groups: this.current.groups.map((g) => ({
				...g,
				agentClientIds: g.agentClientIds.filter((id) => id !== clientId)
			}))
		});
	}

	updateAgent(clientId: string, patch: Partial<Omit<Agent, 'clientId'>>) {
		if (!this.current) return;
		this.#commit({
			...this.current,
			agents: this.current.agents.map((a) => (a.clientId === clientId ? { ...a, ...patch } : a))
		});
	}

	addGroup(group: Omit<Group, 'clientId'>) {
		if (!this.current) return;
		const newGroup: Group = { ...group, clientId: crypto.randomUUID() };
		this.#commit({ ...this.current, groups: [...this.current.groups, newGroup] });
	}

	updateGroup(clientId: string, patch: Partial<Omit<Group, 'clientId'>>) {
		if (!this.current) return;
		this.#commit({
			...this.current,
			groups: this.current.groups.map((g) => (g.clientId === clientId ? { ...g, ...patch } : g))
		});
	}

	removeGroup(clientId: string) {
		if (!this.current) return;
		this.#commit({
			...this.current,
			groups: this.current.groups.filter((g) => g.clientId !== clientId)
		});
	}

	replace(next: FileData) {
		this.#commit(next);
	}
}

export const activeFile = new ActiveFileStore();
