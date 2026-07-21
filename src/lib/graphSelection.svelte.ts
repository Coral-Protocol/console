import { debugMode } from './debugMode.svelte';

function log(...args: unknown[]) {
	if (debugMode.current) console.log('%c[graphSelection]', 'color:#38bdf8', ...args);
}

type ClipboardAgentSnapshot = Record<string, unknown>;

type GraphApi = {
	selectAll: () => void;
	deselectAll: () => void;
	invertSelection: () => void;
	deleteSelected: () => void;
	duplicateSelected: () => void;
	copySelected: () => void;
	pasteClipboard: () => void;
};

class GraphSelectionStore {
	selectedIds = $state<string[]>([]);
	clipboard = $state<ClipboardAgentSnapshot[]>([]);
	#api: GraphApi | null = null;

	register(api: GraphApi) {
		this.#api = api;
		log('registered');
	}

	unregister() {
		this.#api = null;
		this.selectedIds = [];
		log('unregistered');
	}

	get hasSelection() {
		return this.selectedIds.length > 0;
	}

	get hasClipboard() {
		return this.clipboard.length > 0;
	}

	selectAll() {
		this.#api?.selectAll();
	}
	deselectAll() {
		this.#api?.deselectAll();
	}
	invertSelection() {
		this.#api?.invertSelection();
	}
	deleteSelected() {
		this.#api?.deleteSelected();
	}
	duplicateSelected() {
		this.#api?.duplicateSelected();
	}
	copySelected() {
		this.#api?.copySelected();
	}
	pasteClipboard() {
		this.#api?.pasteClipboard();
	}
}

export const graphSelection = new GraphSelectionStore();
