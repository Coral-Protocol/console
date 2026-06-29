// fileStore.svelte.ts
import {
	loadFileData,
	saveFileData,
	defaultFileData,
	type FileData,
	type Agent,
	type Group
} from '$lib/fileStorage';

// Reactive state for the currently-open file. Anything that reads
// `activeFile.current` reactively updates when it changes - no prop
// drilling or bind: needed.
class ActiveFileStore {
	current = $state<FileData | null>(null);
	#id = $state<string | null>(null);

	async open(id: string) {
		this.#id = id;
		const raw = await loadFileData(id);
		if (this.#id !== id) return; // a newer open() call superseded this one
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

	// Every mutator funnels through here: apply the change, persist it.
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

	removeGroup(clientId: string) {
		if (!this.current) return;
		this.#commit({
			...this.current,
			groups: this.current.groups.filter((g) => g.clientId !== clientId)
		});
	}

	// For the Code pane: replace the whole FileData wholesale (e.g. after a
	// successful fromSessionRequest conversion).
	replace(next: FileData) {
		this.#commit(next);
	}
}

export const activeFile = new ActiveFileStore();
