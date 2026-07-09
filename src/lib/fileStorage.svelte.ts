import { get, set, del } from 'idb-keyval';
import { PersistedState } from 'runed';
import type { SessionCreatorContext } from './sessionCreatorContext';
import { debugMode } from './debugMode.svelte';
import type { Viewport } from '@xyflow/svelte';
import type { z, ZodError } from 'zod';
import { activeFile } from './activeFile.svelte';
import { toSessionRequest } from './payloadConstructor.svelte';
import { SessionRequest } from '../generated/api.zod';
import { json } from '@sveltejs/kit';

function log(...args: unknown[]) {
	if (debugMode.current) console.log('%c[fileStorage]', 'color:#888', ...args);
}

function logGroup<T>(label: string, fn: () => T): T {
	if (!debugMode.current) return fn();

	console.groupCollapsed(`%c[fileStorage] ${label}`, 'color:#7dd3fc;font-weight:600');
	const result = fn();

	if (result instanceof Promise) {
		return result.finally(() => console.groupEnd()) as T;
	}

	console.groupEnd();
	return result;
}

export type FileMeta = {
	name: string;
	description?: string;
	created: EpochTimeStamp;
	saved?: EpochTimeStamp;
	edited?: EpochTimeStamp;
	viewport?: Viewport;
};

export const filesMeta = new PersistedState<Record<string, FileMeta>>('workbench:fileMetadata', {});

type AgentGraphRequest = SessionCreatorContext['payload']['agentGraphRequest'];
type ServerAgent = AgentGraphRequest['agents'][number];

export type Agent = ServerAgent & { clientId: string; nodeData?: Record<string, any> };

export type ValidationError = Omit<z.core.$ZodIssue, 'path'>;

export type FileValidationErrors = {
	agent: Record<string, Record<string, ValidationError>>;
	group: Record<string, Record<string, ValidationError>>;
	session: Record<string, ValidationError>;
};

export type Group = {
	clientId: string;
	name: string;
	agentClientIds: string[];
};

export type Annotation = {
	key: string;
	value: string;
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
	errors?: FileValidationErrors;
};

function describeValue(input: unknown): string {
	if (input === undefined) return 'undefined';
	if (input === null) return 'null';
	if (Array.isArray(input)) return 'an array';
	return typeof input;
}

export async function validateRequest(): Promise<{ errors: FileValidationErrors } | void> {
	if (activeFile.current) {
		const convertedRequest = toSessionRequest(activeFile.current as FileData);
		const result = SessionRequest.safeParse(convertedRequest);

		if (!result.success) {
			const errors = zodErrorsToFileErrors(result.error, activeFile.current);

			return { errors };
		}

		activeFile.current.errors = undefined;
	}
}

export function zodErrorsToFileErrors(error: ZodError, fileData: FileData): FileValidationErrors {
	const errors: FileValidationErrors = {
		agent: {},
		group: {},
		session: {}
	};

	for (const issue of error.issues) {
		const path = issue.path as (string | number)[];

		const agentsIndex = path.findIndex((part) => part === 'agents');

		if (agentsIndex !== -1 && typeof path[agentsIndex + 1] === 'number') {
			const agentIndex = path[agentsIndex + 1] as number;
			const agent = fileData.agents[agentIndex];

			if (agent) {
				const fieldPath = path
					.slice(agentsIndex + 2)
					.map(String)
					.join('.');

				const agentErrors = errors.agent[agent.clientId] ?? (errors.agent[agent.clientId] = {});
				agentErrors[fieldPath] = issue;

				continue;
			}
		}

		const fieldPath = path.map(String).join('.');

		errors.session[fieldPath] = issue;
	}
	if (activeFile.current) {
		activeFile.current.errors = errors;
	}
	return errors;
}

function createDebouncedStore(prefix: string, color: string) {
	const cache = new Map<string, string>();
	const pending = new Map<string, ReturnType<typeof setTimeout>>();

	const tag = `%c[${prefix}]`;
	const style = `color:${color}`;

	function slog(...args: unknown[]) {
		if (debugMode.current) console.log(tag, style, ...args);
	}

	function key(id: string) {
		return `${prefix}:${id}`;
	}

	async function load(id: string, fallback: () => string): Promise<string> {
		if (cache.has(id)) {
			slog(`load("${id}") -> cache hit`);
			return cache.get(id)!;
		}
		const stored = await get(key(id));
		if (stored !== undefined) {
			slog(`load("${id}") -> idb hit`);
			cache.set(id, stored);
			return stored;
		}
		slog(`load("${id}") -> fallback`);
		return fallback();
	}

	async function has(id: string): Promise<boolean> {
		if (cache.has(id)) {
			const result = cache.get(id) !== '';
			slog(`has("${id}") -> ${result} (from cache)`);
			return result;
		}
		const data = await get(key(id));
		const result = data !== undefined && data !== '';
		slog(`has("${id}") -> ${result} (from idb)`);
		return result;
	}

	function save(id: string, data: string, debounceMs = 300, onFlush?: (data: string) => void) {
		slog(`save("${id}") queued, debounce ${debounceMs}ms`);
		cache.set(id, data);
		const existing = pending.get(id);
		if (existing) clearTimeout(existing);

		const flush = async () => {
			pending.delete(id);
			try {
				await set(key(id), data);
				slog(`flush("${id}") -> persisted`);
				onFlush?.(data);
			} catch (err) {
				console.error(`Failed to persist ${key(id)}`, err);
			}
		};

		pending.set(id, setTimeout(flush, debounceMs));
		// validateRequest();
	}

	async function flush(id: string) {
		const timer = pending.get(id);
		if (timer) {
			clearTimeout(timer);
			pending.delete(id);
		}

		const data = cache.get(id);
		if (data !== undefined) {
			await set(key(id), data);
			slog(`flush("${id}") -> persisted (manual)`);
		}
	}

	function flushAll() {
		slog(`flushAll (${pending.size} pending)`);
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
		slog(`remove("${id}")`);
	}

	return { load, save, flush, has, flushAll, remove };
}

const savedFileStore = createDebouncedStore('saved-file-data', '#4ade80');
const unsavedFileStore = createDebouncedStore('unsaved-file-data', '#facc15');

export function loadFileData(id: string): Promise<string> {
	return logGroup(`loadFileData("${id}")`, () => {
		return savedFileStore.load(id, () => JSON.stringify(defaultFileData(id), null, 4));
	});
}

export async function loadFileDataField<T = any>(
	id: string,
	field: string,
	clientID?: string
): Promise<T | null> {
	return logGroup(
		`loadFileDataField("${id}", "${field}"${clientID ? `, "${clientID}"` : ''})`,
		async () => {
			try {
				log(
					'loadFileDataField: searching for field',
					field,
					'in file',
					id,
					clientID ? `from agent ${clientID}` : ''
				);
				const raw = await savedFileStore.load(id, () => {
					return '{}';
				});
				log('loadFileDataField: raw data for id', id, raw);
				const obj = JSON.parse(raw ?? '{}');

				let source: any = obj;
				if (clientID) {
					const agent = Array.isArray(obj?.agents)
						? obj.agents.find((a: any) => a?.clientId === clientID)
						: undefined;
					log('loadFileDataField: matched agent', agent ? $state.snapshot(agent) : null);
					source = agent ?? null;
				}

				log('loadFileDataField: available fields', Object.keys(source ?? {}));

				if (source && field in source) {
					return source[field] ?? null;
				}

				if (clientID && source?.options && field in source.options) {
					return source.options[field]?.value ?? null;
				}

				return null;
			} catch (e) {
				log('loadFileDataField error', e);
				return null;
			}
		}
	);
}

export function defaultFileMeta(): FileMeta {
	return {
		name: 'Untitled',
		created: Date.now()
	};
}

export function getFileMeta(id: string): FileMeta | null {
	const meta = filesMeta.current[id] ?? null;
	log('getFileMeta', id, '->', meta ? $state.snapshot(meta) : null);
	return meta;
}

export function setFileMeta(id: string, meta: FileMeta) {
	logGroup(`saveFileMeta("${id}")`, () => {
		filesMeta.current[id] = meta;
		log('saved', $state.snapshot(meta));
	});
}

export function updateFileMeta(id: string, patch: Partial<FileMeta>): FileMeta {
	return logGroup(`updateFileMeta("${id}")`, () => {
		const current = filesMeta.current[id] ?? defaultFileMeta();
		const next: FileMeta = { ...current, ...patch };
		filesMeta.current[id] = next;
		log('updateFileMeta', id, '->', $state.snapshot(next));
		return next;
	});
}

export function deleteFileMeta(id: string) {
	logGroup(`deleteFileMeta("${id}")`, () => {
		delete filesMeta.current[id];
		log('deleted');
	});
}

// the below function is for changes made to the default data that all new files are based off, this is saved in a separate store so that unsaved changes are kept on power loss/etc but not overwriting whatever is actually "saved", tl;dr it works the same way as vscode files :)

// this is done so you can make quick changes to your file, run them, and not ruin your file save, also, it will make saving as a new file make more sense and easier for me

// p.s. its file data delta by fact, but it's called "unsaved" data so that users are less likely to delete it from their local storage

export function saveFileDataDelta(id: string, data: string, debounceMs = 300) {
	return logGroup(`saveFileDataDelta("${id}")`, () => {
		unsavedFileStore.save(id, data, debounceMs, () => {
			updateFileMeta(id, { edited: Date.now() });
			log('edited timestamp updated');
		});
	});
}

export function loadFileDataDelta(id: string): Promise<string> {
	return logGroup(`loadFileDataDelta("${id}")`, () => {
		return unsavedFileStore.load(id, () => {
			return '';
		});
	});
}

export async function hasFileDataDelta(id: string): Promise<boolean> {
	return logGroup(`hasFileDataDelta("${id}")`, async () => {
		const result = await unsavedFileStore.has(id);
		log('->', result);
		return result;
	});
}

export async function hasFileData(id: string): Promise<boolean> {
	return logGroup(`hasFileData("${id}")`, async () => {
		const result = await savedFileStore.has(id);
		log('->', result);
		return result;
	});
}

export async function updateFileDataFromDelta(id: string): Promise<void> {
	return logGroup(`updateFileDataFromDelta("${id}")`, async () => {
		const delta = await unsavedFileStore.load(id, () => '');

		if (!delta) {
			throw new Error('No delta to save');
		}

		savedFileStore.save(id, delta);
		await savedFileStore.flush(id);
		await unsavedFileStore.remove(id);

		updateFileMeta(id, { saved: Date.now(), edited: undefined });
	});
}

export function saveFileDataToNew(id: string, data: string, debounceMs = 300) {
	// todo
}

export async function deleteFileData(id: string) {
	return logGroup(`deleteFileData("${id}")`, () => {
		return savedFileStore.remove(id);
	});
}

export async function deleteFileDataDelta(id: string) {
	return logGroup(`deleteFileDataDelta("${id}")`, () => {
		return unsavedFileStore.remove(id);
	});
}

if (typeof window !== 'undefined') {
	window.addEventListener('pagehide', () => {
		savedFileStore.flushAll();
	});
	window.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			savedFileStore.flushAll();
		}
	});
}

export function defaultFileData(id: string): FileData {
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
			annotations: {
				createdWith: 'coral console',
				sourceFileId: id
			}
		}
	};
}
