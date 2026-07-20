import {
	loadFileData,
	defaultFileData,
	type FileData,
	type Agent,
	type Group,
	type FileMeta,
	saveFileDataDelta,
	getFileMeta,
	setFileMeta,
	updateFileDataFromDelta,
	loadFileDataDelta,
	type Annotation,
	type SessionSettings,
	updateFileMeta,
	defaultFileMeta,
	type Tool
} from '$lib/fileStorage.svelte';
import { debugMode } from './debugMode.svelte';

function log(...args: unknown[]) {
	if (debugMode.current) console.log('%c[activeFile]', 'color:#c084fc', ...args);
}

function logGroup<T>(label: string, fn: () => T): T {
	if (!debugMode.current) return fn();

	console.groupCollapsed(`%c[activeFile] ${label}`, 'color:#c084fc;font-weight:600');
	const result = fn();

	if (result instanceof Promise) {
		return result.finally(() => console.groupEnd()) as T;
	}

	console.groupEnd();
	return result;
}

class ActiveFileStore {
	current = $state<FileData | null>(null);
	meta = $state<FileMeta | null>(null);
	#id = $state<string | null>(null);

	async open(id: string) {
		await logGroup(`open("${id}")`, async () => {
			this.#id = id;
			const rawData = await loadFileData(id);
			const rawDelta = await loadFileDataDelta(id);
			const meta = getFileMeta(id);
			this.meta = meta;

			if (this.#id !== id) {
				log('id changed during open, aborting stale load', { requested: id, current: this.#id });
				return;
			}

			try {
				const data = JSON.parse(rawData);
				const delta = rawDelta ? JSON.parse(rawDelta) : null;
				this.current = delta ? { ...data, ...delta } : data;
				log('loaded', delta ? '(with pending delta applied)' : '(no delta)');
			} catch (err) {
				log('failed to parse file data, falling back to default', err);
				this.current = defaultFileData(id);
			}
		});
	}

	close() {
		logGroup(`close("${this.#id}")`, () => {
			this.#id = null;
			this.current = null;
			this.meta = null;
		});
	}

	async save() {
		await logGroup(`save("${this.#id}")`, async () => {
			if (!this.#id) {
				log('no active file, aborting');
				return;
			}
			await updateFileDataFromDelta(this.#id);
			this.meta = getFileMeta(this.#id);
		});
	}

	#commit(next: FileData) {
		logGroup(`commit("${next.id}")`, () => {
			this.current = next;
			saveFileDataDelta(next.id, JSON.stringify(next, null, 4));
			this.meta = {
				...(this.meta ?? getFileMeta(next.id) ?? defaultFileMeta()),
				edited: Date.now()
			};
		});
	}

	addAgent(agent: Omit<Agent, 'clientId'>) {
		if (!this.current) return;
		const newAgent: Agent = { ...agent, clientId: crypto.randomUUID() };
		log('addAgent', $state.snapshot(newAgent));
		this.#commit({ ...this.current, agents: [...this.current.agents, newAgent] });
	}

	removeAgent(clientId: string) {
		if (!this.current) return;
		log('removeAgent', clientId);
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
		log('updateAgent', clientId, $state.snapshot(patch));
		this.#commit({
			...this.current,
			agents: this.current.agents.map((a) =>
				a.clientId === clientId
					? {
							...a,
							...patch,
							nodeData: patch.nodeData ? { ...a.nodeData, ...patch.nodeData } : a.nodeData
						}
					: a
			)
		});
	}

	updateMeta(patch: Partial<Omit<FileMeta, 'created'>>) {
		if (!this.#id) return;
		log('updateMeta', $state.snapshot(patch));
		this.meta = updateFileMeta(this.#id, patch);
	}

	addGroup(group: Omit<Group, 'clientId'>) {
		if (!this.current) return;
		const newGroup: Group = { ...group, clientId: crypto.randomUUID() };
		log('addGroup', $state.snapshot(newGroup));
		this.#commit({ ...this.current, groups: [...this.current.groups, newGroup] });
	}

	updateGroup(clientId: string, patch: Partial<Omit<Group, 'clientId'>>) {
		if (!this.current) return;
		log('updateGroup', clientId, $state.snapshot(patch));
		this.#commit({
			...this.current,
			groups: this.current.groups.map((g) => (g.clientId === clientId ? { ...g, ...patch } : g))
		});
	}

	removeGroup(clientId: string) {
		if (!this.current) return;
		log('removeGroup', clientId);
		this.#commit({
			...this.current,
			groups: this.current.groups.filter((g) => g.clientId !== clientId)
		});
	}

	addTool(tool: Omit<Tool, 'clientId'>) {
		if (!this.current) return;
		const newTool: Tool = { ...tool, clientId: crypto.randomUUID() };
		log('addTool', $state.snapshot(newTool));
		this.#commit({ ...this.current, tools: [...this.current.tools, newTool] });
		return newTool.clientId;
	}

	updateTool(clientId: string, patch: Partial<Omit<Tool, 'clientId'>>) {
		if (!this.current) return;
		log('updateTool', clientId, $state.snapshot(patch));
		this.#commit({
			...this.current,
			tools: this.current.tools.map((t) => (t.clientId === clientId ? { ...t, ...patch } : t))
		});
	}

	removeTool(clientId: string) {
		if (!this.current) return;
		log('removeTool', clientId);
		this.#commit({
			...this.current,
			tools: this.current.tools.filter((t) => t.clientId !== clientId)
		});
	}

	updateAnnotations(patch: Record<string, string>) {
		if (!this.current) return;
		log('updateAnnotations', $state.snapshot(patch));
		this.#commit({
			...this.current,
			annotations: { ...this.current.annotations, ...patch }
		});
	}

	updateBudgetSettings(patch: Partial<FileData['budgetSettings']>) {
		if (!this.current) return;
		log('updateBudgetSettings', $state.snapshot(patch));
		this.#commit({
			...this.current,
			budgetSettings: {
				...this.current.budgetSettings,
				...patch
			} as FileData['budgetSettings']
		});
	}

	updateNamespaceSettings(patch: Partial<FileData['namespaceProvider']>) {
		if (!this.current) return;
		log('updateNamespaceSettings', $state.snapshot(patch));
		this.#commit({
			...this.current,
			namespaceProvider: {
				...this.current.namespaceProvider,
				...patch
			} as FileData['namespaceProvider']
		});
	}

	updateExecutionSettings(patch: Partial<FileData['execution']>) {
		if (!this.current) return;
		log('updateExecutionSettings', $state.snapshot(patch));
		this.#commit({
			...this.current,
			execution: { ...this.current.execution, ...patch } as FileData['execution']
		});
	}

	replace(next: FileData) {
		log('replace', next.id);
		this.#commit(next);
	}
}

export const activeFile = new ActiveFileStore();
