/**
 * Reactive store for "saved memories" backed by IndexedDB.
 *
 * Why IndexedDB and not localStorage?
 *  - Saved memories can hold long conversations + large tool schemas. The
 *    practical ~5 MB per-origin localStorage budget would be exhausted by a
 *    handful of heavy memories.
 *  - IDB is async but trivially streamed into reactive Svelte 5 `$state`,
 *    and survives across tabs/reloads without serialization tricks.
 *
 * The store keeps an in-memory `$state` cache of all memories (the volume
 * is bounded by the user's manual save action — there is no automatic
 * capture). Mutations are written through to IDB; reads from IDB happen
 * once at startup. The shape is small enough that loading everything up
 * front is fine.
 */
import { browser } from '$app/environment';
import type { SavedMemory, SavedMemorySummary } from './types';

const DB_NAME = 'coral-studio';
const DB_VERSION = 1;
const STORE_NAME = 'savedMemories';

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (!browser) {
		return Promise.reject(new Error('IndexedDB not available outside the browser'));
	}
	if (_dbPromise) return _dbPromise;
	_dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
	});
	return _dbPromise;
}

async function tx<T>(
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const t = db.transaction(STORE_NAME, mode);
		const store = t.objectStore(STORE_NAME);
		let result: T | undefined;
		const out = fn(store);
		if (out instanceof Promise) {
			out.then((v) => (result = v)).catch(reject);
		} else {
			out.onsuccess = () => {
				result = out.result;
			};
			out.onerror = () => reject(out.error);
		}
		t.oncomplete = () => resolve(result as T);
		t.onerror = () => reject(t.error);
		t.onabort = () => reject(t.error ?? new Error('IndexedDB tx aborted'));
	});
}

/**
 * Singleton reactive store. Importing this module triggers a one-time IDB
 * hydration; consumers read `memories` directly and call `save`/`remove`
 * to mutate.
 */
class SavedMemoryStore {
	memories = $state<Record<string, SavedMemory>>({});
	loaded = $state(false);
	error = $state<string | null>(null);

	constructor() {
		if (browser) {
			void this.hydrate();
		}
	}

	private async hydrate() {
		try {
			const all = await tx<SavedMemory[]>('readonly', (store) => {
				return store.getAll() as IDBRequest<SavedMemory[]>;
			});
			const map: Record<string, SavedMemory> = {};
			for (const m of all) map[m.id] = m;
			this.memories = map;
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
		} finally {
			this.loaded = true;
		}
	}

	list(): SavedMemorySummary[] {
		return Object.values(this.memories)
			.map(
				(m): SavedMemorySummary => ({
					id: m.id,
					name: m.name,
					createdAt: m.createdAt,
					updatedAt: m.updatedAt,
					format: m.format,
					messageCount: m.messages.length,
					model: m.hyperparameters.model,
					originAgent: m.origin?.agentName,
					originSession: m.origin?.sessionId
				})
			)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	get(id: string): SavedMemory | undefined {
		return this.memories[id];
	}

	async save(mem: SavedMemory): Promise<void> {
		mem.updatedAt = Date.now();
		this.memories = { ...this.memories, [mem.id]: mem };
		await tx<IDBValidKey>('readwrite', (store) =>
			store.put($state.snapshot(mem) as SavedMemory)
		);
	}

	async remove(id: string): Promise<void> {
		const next = { ...this.memories };
		delete next[id];
		this.memories = next;
		await tx<undefined>('readwrite', (store) => store.delete(id));
	}

	async duplicate(id: string): Promise<SavedMemory | null> {
		const src = this.memories[id];
		if (!src) return null;
		// Deep clone via JSON to detach from reactivity & nested references.
		const clone: SavedMemory = JSON.parse(JSON.stringify($state.snapshot(src)));
		clone.id = `${src.id}_copy_${Date.now().toString(36)}`;
		clone.name = `${src.name} (copy)`;
		clone.createdAt = Date.now();
		clone.updatedAt = clone.createdAt;
		await this.save(clone);
		return clone;
	}
}

export const savedMemories = new SavedMemoryStore();
