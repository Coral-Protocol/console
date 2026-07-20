import { PersistedState } from 'runed';
import {
	filesMeta,
	deleteFileDataDelta,
	deleteFileData, // <-- assumed to exist alongside deleteFileDataDelta; adjust name if different
	hasFileDataDelta,
	hasFileData,
	updateFileMeta,
	type FileMeta
} from '$lib/fileStorage.svelte.js';
import { activeFile } from '$lib/activeFile.svelte';

export const workbenchTabView = new PersistedState<string>('workbench:tabView', 'Diagram', {
	storage: 'session'
});
export const workbenchTabSide = new PersistedState<string>('workbench:tabSide', 'Agents', {
	storage: 'session'
});

export type Tab = { id: string };

export function uniqueName(base: string, existingNames: string[]): string {
	if (!existingNames.includes(base)) return base;

	const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pattern = new RegExp(`^${escaped} (\\d+)$`);

	let max = 1;
	for (const name of existingNames) {
		const match = name.match(pattern);
		if (match) {
			max = Math.max(max, parseInt(match[1] ?? '0', 10));
		}
	}

	return `${base} ${max + 1}`;
}

class FileTabs {
	tabs = new PersistedState<Tab[]>('workbench:tabs', []);
	activeTab = new PersistedState<string>('workbench:activeTab', '');

	dialogOpen = $state(false);
	dialogMode = $state<'unsaved' | 'delete'>('unsaved');

	tabToClose = $state<string | null>(null);
	fileToDelete = $state<string | null>(null);

	tabToCloseName = $derived(
		this.tabToClose ? (filesMeta.current[this.tabToClose]?.name ?? '') : ''
	);

	fileToDeleteName = $derived(
		this.fileToDelete ? (filesMeta.current[this.fileToDelete]?.name ?? '') : ''
	);

	dialogFileId = $derived(this.dialogMode === 'unsaved' ? this.tabToClose : this.fileToDelete);
	dialogFileName = $derived(
		this.dialogMode === 'unsaved' ? this.tabToCloseName : this.fileToDeleteName
	);

	recentFiles = $derived(
		Object.entries(filesMeta.current)
			.map(([id, file]) => ({ ...file, id }))
			.sort((a, b) => b.created - a.created)
	);

	syncActiveFile() {
		const tabId = this.activeTab.current;
		if (!tabId) {
			activeFile.close();
			return;
		}
		activeFile.open(tabId);
	}

	async newTab() {
		try {
			const fileId = crypto.randomUUID();

			const fileName = uniqueName(
				'Untitled',
				Object.values(filesMeta.current).map((f) => f.name)
			);

			filesMeta.current = {
				...filesMeta.current,
				[fileId]: {
					name: fileName,
					created: Date.now()
				}
			};

			this.tabs.current.push({ id: fileId });
			this.activeTab.current = fileId;
			return fileId;
		} catch (error) {
			console.error(error);
		}
	}

	async closeFile(id: string, force = false) {
		try {
			const [hasDelta, hasData] = await Promise.all([hasFileDataDelta(id), hasFileData(id)]);

			if (hasDelta && !force) {
				this.tabToClose = id;
				this.dialogMode = 'unsaved';
				this.dialogOpen = true;
				return;
			}

			if (!hasData) {
				const { [id]: _, ...rest } = filesMeta.current;
				filesMeta.current = rest;
			}
			await deleteFileDataDelta(id);

			this.dialogOpen = false;
			this.removeTab(id);
		} catch (error) {
			console.error(error);
		}
	}

	requestDeleteFile(id: string) {
		this.fileToDelete = id;
		this.dialogMode = 'delete';
		this.dialogOpen = true;
	}

	async deleteFile(id: string | null) {
		if (!id) return;
		try {
			await Promise.all([deleteFileData(id), deleteFileDataDelta(id)]);

			const { [id]: _, ...rest } = filesMeta.current;
			filesMeta.current = rest;

			if (this.tabs.current.some((tab) => tab.id === id)) {
				this.removeTab(id);
			}

			this.fileToDelete = null;
			this.dialogOpen = false;
		} catch (error) {
			console.error(error);
		}
	}

	removeTab(id: string) {
		const index = this.tabs.current.findIndex((tab) => tab.id === id);
		if (index < 0) return;

		const wasActive = this.activeTab.current === id;

		const remainingTabs = this.tabs.current.filter((tab) => tab.id !== id);
		this.tabs.current = remainingTabs;

		if (wasActive) {
			this.activeTab.current =
				remainingTabs[Math.max(0, index - 1)]?.id ?? remainingTabs[0]?.id ?? '';
		}

		this.tabToClose = null;
		this.dialogOpen = false;
	}

	openFile(id: string) {
		const alreadyOpen = this.tabs.current.some((tab) => tab.id === id);
		if (!alreadyOpen) {
			this.tabs.current.push({ id });
		}
		this.activeTab.current = id;
	}

	closeAllSaved() {
		for (const tab of this.tabs.current.filter((t) => !filesMeta.current[t.id]?.edited)) {
			this.closeFile(tab.id);
		}
		if (!this.tabs.current.find((t) => t.id === this.activeTab.current)) {
			this.activeTab.current = '';
		}
	}
}

export const fileTabs = new FileTabs();
