// fileStorage.ts
import { get, set, del } from 'idb-keyval';
import { PersistedState } from 'runed';
import type { SessionCreatorContext } from './sessionCreatorContext';

export type FileMeta = {
	name: string;
	description: string;
	id: string;
	created: EpochTimeStamp;
};

export const filesMeta = new PersistedState<FileMeta[]>('filesMeta', [
	{
		name: 'Untitled',
		description: '',
		id: crypto.randomUUID(),
		created: Date.now()
	}
]);

type AgentGraphRequest = SessionCreatorContext['payload']['agentGraphRequest'];
type ServerAgent = AgentGraphRequest['agents'][number];

export type Agent = ServerAgent & { clientId: string; nodeData?: Record<string, any> };

export type Group = {
	clientId: string;
	name: string;
	agentClientIds: string[];
};

export type SessionSettings = {
	customTools: AgentGraphRequest['customTools'];
	namespaceProvider: SessionCreatorContext['payload']['namespaceProvider'];
	execution: SessionCreatorContext['payload']['execution'];
	budgetSettings: SessionCreatorContext['payload']['budgetSettings'];
	annotations: SessionCreatorContext['payload']['annotations'];
};

export type FileData = {
	id: string;
	agents: Agent[];
	groups: Group[];
	sessionSettings: SessionSettings;
};

function createDebouncedStore(prefix: string) {
	const cache = new Map<string, string>();
	const pending = new Map<string, ReturnType<typeof setTimeout>>();

	function key(id: string) {
		return `${prefix}:${id}`;
	}

	async function load(id: string, fallback: () => string): Promise<string> {
		if (cache.has(id)) return cache.get(id)!;
		const data = (await get(key(id))) ?? fallback();
		cache.set(id, data);
		return data;
	}

	function save(id: string, data: string, debounceMs = 300) {
		cache.set(id, data);
		const existing = pending.get(id);
		if (existing) clearTimeout(existing);

		const flush = async () => {
			pending.delete(id);
			try {
				await set(key(id), data);
			} catch (err) {
				console.error(`Failed to persist ${key(id)}`, err);
			}
		};

		pending.set(id, setTimeout(flush, debounceMs));
	}

	function flush(id: string) {
		const timer = pending.get(id);
		if (!timer) return;
		clearTimeout(timer);
		pending.delete(id);
		const data = cache.get(id);
		if (data !== undefined) void set(key(id), data);
	}

	function flushAll() {
		for (const id of [...pending.keys()]) flush(id);
	}

	async function remove(id: string) {
		cache.delete(id);
		const timer = pending.get(id);
		if (timer) {
			clearTimeout(timer);
			pending.delete(id);
		}
		await del(key(id));
	}

	return { load, save, flush, flushAll, remove };
}

const fileDataStore = createDebouncedStore('file-data');
const codeDraftStore = createDebouncedStore('file-code-draft');

export function loadFileData(id: string): Promise<string> {
	return fileDataStore.load(id, () => JSON.stringify(defaultFileData(id), null, 4));
}

export function saveFileData(id: string, data: string, debounceMs = 300) {
	fileDataStore.save(id, data, debounceMs);
}

export async function deleteFileData(id: string) {
	await fileDataStore.remove(id);
	await codeDraftStore.remove(id);
}

export function loadCodeDraft(id: string, fallback: () => string): Promise<string> {
	return codeDraftStore.load(id, fallback);
}

export function saveCodeDraft(id: string, data: string, debounceMs = 300) {
	codeDraftStore.save(id, data, debounceMs);
}

if (typeof window !== 'undefined') {
	window.addEventListener('pagehide', () => {
		fileDataStore.flushAll();
		codeDraftStore.flushAll();
	});
	window.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			fileDataStore.flushAll();
			codeDraftStore.flushAll();
		}
	});
}

export function defaultFileData(id: string = crypto.randomUUID()): FileData {
	return {
		id,
		agents: [],
		groups: [],
		sessionSettings: {
			customTools: {},
			namespaceProvider: {
				type: 'create_if_not_exists',
				namespaceRequest: {
					name: 'default',
					annotations: {},
					deleteOnLastSessionExit: false
				}
			},
			execution: {
				mode: 'immediate',
				runtimeSettings: {
					extendedEndReport: true,
					persistenceMode: { mode: 'hold_after_exit', duration: 1800000 },
					ttl: 50000
				}
			},
			budgetSettings: {
				budget: 100000000,
				exhaustionBehavior: { type: 'kill_session', minimum: 1000000 }
			},
			annotations: {}
		}
	};
}
