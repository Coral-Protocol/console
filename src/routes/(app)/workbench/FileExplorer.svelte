<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { fileTabs } from '$lib/fileTabs.svelte.js';
	import { FileText, Search, Trash2 } from '@lucide/svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let query = $state('');

	let filteredFiles = $derived(
		fileTabs.recentFiles.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
	);

	function openFile(id: string) {
		fileTabs.openFile(id);
		open = false;
	}

	function deleteFile(e: MouseEvent, id: string) {
		e.stopPropagation();
		fileTabs.requestDeleteFile(id);
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="z-50 sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Open File</Dialog.Title>
			<Dialog.Description>Browse and open a saved file.</Dialog.Description>
		</Dialog.Header>

		<div class="relative">
			<Search class="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
			<Input type="string" placeholder="Search files…" class="pl-8" bind:value={query} />
		</div>

		<ol class="flex max-h-80 flex-col gap-1 overflow-y-auto">
			{#each filteredFiles as file (file.id)}
				<li>
					<button
						type="button"
						class="hover:bg-muted group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors"
						class:bg-muted={file.id === fileTabs.activeTab.current}
						onclick={() => openFile(file.id)}
					>
						<FileText class="text-muted-foreground size-4 shrink-0" />
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-sm">{file.name}</span>
							<span class="text-muted-foreground text-xs">
								{file.edited
									? `Edited ${formatDate(file.edited)}`
									: `Created ${formatDate(file.created)}`}
							</span>
						</div>
						{#if file.edited}
							<span
								class="bg-muted-foreground/60 size-1.5 shrink-0 rounded-full"
								title="Unsaved changes"
							></span>
						{/if}
						<Button
							variant="ghost"
							size="icon"
							class="text-muted-foreground hover:text-destructive size-7 shrink-0 opacity-0 group-hover:opacity-100"
							onclick={(e: MouseEvent) => deleteFile(e, file.id)}
						>
							<Trash2 class="size-4" />
						</Button>
					</button>
				</li>
			{:else}
				<li class="text-muted-foreground px-2 py-8 text-center text-sm">
					{query ? `No files match "${query}"` : 'No saved files yet.'}
				</li>
			{/each}
		</ol>
	</Dialog.Content>
</Dialog.Root>
