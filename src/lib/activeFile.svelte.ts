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
	defaultFileMeta
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

	addGroup(group: Omit<Group, 'clientId'>) {
		if (!this.current) return;
		const newGroup: Group = { ...group, clientId: crypto.randomUUID() };
		log('addGroup', $state.snapshot(newGroup));
		this.#commit({ ...this.current, groups: [...this.current.groups, newGroup] });
	}

	updateMeta(patch: Partial<Omit<FileMeta, 'created'>>) {
		if (!this.#id) return;
		log('updateMeta', $state.snapshot(patch));
		this.meta = updateFileMeta(this.#id, patch);
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

	updateSessionSettings(patch: Partial<SessionSettings>) {
		if (!this.current) return;
		log('updateSessionSettings', $state.snapshot(patch));
		this.#commit({
			...this.current,
			sessionSettings: { ...this.current.sessionSettings, ...patch }
		});
	}

	// updateNamespaceProvider(patch: Partial<SessionSettings['namespaceProvider']>) {
	// 	if (!this.current) return;
	// 	log('updateNamespaceProvider', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			namespaceProvider: {
	// 				...this.current.sessionSettings.namespaceProvider,
	// 				...patch
	// 			} as SessionSettings['namespaceProvider']
	// 		}
	// 	});
	// }

	// updateNamespaceRequestAnnotations(patch: Record<string, string>) {
	// 	if (!this.current) return;
	// 	const provider = this.current.sessionSettings.namespaceProvider;
	// 	if (!('namespaceRequest' in provider) || !provider.namespaceRequest) return;
	// 	log('updateNamespaceRequestAnnotations', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			namespaceProvider: {
	// 				...provider,
	// 				namespaceRequest: {
	// 					...provider.namespaceRequest,
	// 					annotations: { ...provider.namespaceRequest.annotations, ...patch }
	// 				}
	// 			} as SessionSettings['namespaceProvider']
	// 		}
	// 	});
	// }

	// updateExecution(patch: Partial<SessionSettings['execution']>) {
	// 	if (!this.current) return;
	// 	log('updateExecution', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			execution: { ...this.current.sessionSettings.execution, ...patch } as SessionSettings['execution']
	// 		}
	// 	});
	// }

	// updateRuntimeSettings(
	// 	patch: Partial<Extract<SessionSettings['execution'], { runtimeSettings: any }>['runtimeSettings']>
	// ) {
	// 	if (!this.current) return;
	// 	const execution = this.current.sessionSettings.execution as any;
	// 	if (!execution?.runtimeSettings) return;
	// 	log('updateRuntimeSettings', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			execution: {
	// 				...execution,
	// 				runtimeSettings: { ...execution.runtimeSettings, ...patch }
	// 			}
	// 		}
	// 	});
	// }

	// updatePersistenceMode(patch: Partial<{ mode: string; duration: number }>) {
	// 	if (!this.current) return;
	// 	const execution = this.current.sessionSettings.execution as any;
	// 	if (!execution?.runtimeSettings?.persistenceMode) return;
	// 	log('updatePersistenceMode', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			execution: {
	// 				...execution,
	// 				runtimeSettings: {
	// 					...execution.runtimeSettings,
	// 					persistenceMode: { ...execution.runtimeSettings.persistenceMode, ...patch }
	// 				}
	// 			}
	// 		}
	// 	});
	// }

	// updateBudgetSettings(patch: Partial<SessionSettings['budgetSettings']>) {
	// 	if (!this.current) return;
	// 	log('updateBudgetSettings', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			budgetSettings: { ...this.current.sessionSettings.budgetSettings, ...patch }
	// 		}
	// 	});
	// }

	// updateExhaustionBehavior(patch: Partial<SessionSettings['budgetSettings']['exhaustionBehavior']>) {
	// 	if (!this.current) return;
	// 	log('updateExhaustionBehavior', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			budgetSettings: {
	// 				...this.current.sessionSettings.budgetSettings,
	// 				exhaustionBehavior: {
	// 					...this.current.sessionSettings.budgetSettings.exhaustionBehavior,
	// 					...patch
	// 				} as SessionSettings['budgetSettings']['exhaustionBehavior']
	// 			}
	// 		}
	// 	});
	// }

	// updateCustomTools(patch: Partial<SessionSettings['customTools']>) {
	// 	if (!this.current) return;
	// 	log('updateCustomTools', $state.snapshot(patch));
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			customTools: { ...this.current.sessionSettings.customTools, ...patch }
	// 		}
	// 	});
	// }

	// removeCustomTool(key: string) {
	// 	if (!this.current) return;
	// 	log('removeCustomTool', key);
	// 	const customTools = { ...this.current.sessionSettings.customTools } as Record<string, unknown>;
	// 	delete customTools[key];
	// 	this.#commit({
	// 		...this.current,
	// 		sessionSettings: {
	// 			...this.current.sessionSettings,
	// 			customTools: customTools as SessionSettings['customTools']
	// 		}
	// 	});
	// }

	updateAnnotations(patch: Record<string, string>) {
		if (!this.current) return;
		log('updateAnnotations', $state.snapshot(patch));
		this.#commit({
			...this.current,
			sessionSettings: {
				...this.current.sessionSettings,
				annotations: { ...this.current.sessionSettings.annotations, ...patch }
			}
		});
	}

	replace(next: FileData) {
		log('replace', next.id);
		this.#commit(next);
	}
}

export const activeFile = new ActiveFileStore();
