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

const contentCache = new Map<string, string>();

function dataKey(id: string) {
	return `file-data:${id}`;
}

export async function loadFileData(id: string): Promise<string> {
	if (contentCache.has(id)) return contentCache.get(id)!;
	const data = (await get(dataKey(id))) ?? JSON.stringify(defaultPayload(), null, 4);
	contentCache.set(id, data);
	return data;
}

const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

export function saveFileData(id: string, data: string, debounceMs = 300) {
	contentCache.set(id, data);

	const existing = pendingWrites.get(id);
	if (existing) clearTimeout(existing);

	pendingWrites.set(
		id,
		setTimeout(async () => {
			pendingWrites.delete(id);
			try {
				await set(dataKey(id), data);
			} catch (err) {
				console.error(`Failed to persist file ${id}`, err);
			}
		}, debounceMs)
	);
}

export async function deleteFileData(id: string) {
	contentCache.delete(id);
	const pending = pendingWrites.get(id);
	if (pending) {
		clearTimeout(pending);
		pendingWrites.delete(id);
	}
	await del(dataKey(id));
}

export function defaultPayload(): SessionCreatorContext['payload'] {
	return {
		agentGraphRequest: {
			agents: [],
			groups: [],
			customTools: {}
		},
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
				persistenceMode: {
					mode: 'hold_after_exit',
					duration: 1800000
				},
				ttl: 50000
			}
		},
		budgetSettings: {
			budget: 100000000,
			exhaustionBehavior: {
				type: 'kill_session',
				minimum: 1000000
			}
		},
		annotations: {}
	};
}
