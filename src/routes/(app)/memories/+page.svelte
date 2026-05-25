<script lang="ts">
	/**
	 * Saved Memories — list view.
	 *
	 * Lightweight index of every locally saved request. Sorted by most
	 * recently updated. Provides quick actions: open, duplicate, delete,
	 * and create-from-scratch.
	 */
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { toast } from 'svelte-sonner';

	import PlusIcon from '@lucide/svelte/icons/plus';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import BookmarkIcon from '@lucide/svelte/icons/bookmark';

	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { savedMemories } from '$lib/saved-memories/store.svelte';
	import { emptyMemory } from '$lib/saved-memories/convert';

	let query = $state('');

	let summaries = $derived(savedMemories.list());
	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return summaries;
		return summaries.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				(s.model ?? '').toLowerCase().includes(q) ||
				(s.originAgent ?? '').toLowerCase().includes(q)
		);
	});

	async function createBlank() {
		const mem = emptyMemory('openai');
		await savedMemories.save(mem);
		goto(`${base}/memories/${mem.id}`);
	}

	async function duplicate(id: string) {
		const next = await savedMemories.duplicate(id);
		if (next) toast.success(`Duplicated as "${next.name}"`);
	}

	async function remove(id: string, name: string) {
		if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
		await savedMemories.remove(id);
		toast.success('Deleted');
	}

	function relative(t: number): string {
		const delta = Date.now() - t;
		if (delta < 60_000) return 'just now';
		if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
		if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
		return new Date(t).toLocaleDateString();
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<header class="flex items-center gap-3 border-b px-4 py-3">
		<BookmarkIcon class="size-5 text-violet-500" />
		<h1 class="text-lg font-semibold">Saved Memories</h1>
		<span class="text-muted-foreground text-xs">
			{summaries.length} saved
		</span>
		<div class="ml-auto flex items-center gap-2">
			<div class="relative w-64">
				<SearchIcon
					class="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
				/>
				<Input bind:value={query} placeholder="Search by name, model, agent…" class="h-8 pl-7" />
			</div>
			<Button size="sm" onclick={createBlank}>
				<PlusIcon class="size-4" /> New memory
			</Button>
		</div>
	</header>

	<ScrollArea class="min-h-0 flex-1">
		{#if !savedMemories.loaded}
			<div class="text-muted-foreground p-6 text-sm">Loading…</div>
		{:else if summaries.length === 0}
			<div class="flex flex-col items-center justify-center gap-3 p-12 text-center">
				<BookmarkIcon class="text-muted-foreground size-10" />
				<h2 class="text-base font-medium">No saved memories yet</h2>
				<p class="text-muted-foreground max-w-md text-sm">
					Open any LLM request in the session waterfall and click <span
						class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">Save to memories</span
					>, or start a blank one to iterate on a prompt from scratch.
				</p>
				<Button size="sm" onclick={createBlank}>
					<PlusIcon class="size-4" /> New memory
				</Button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
				{#each filtered as s (s.id)}
					<Card.Root class="hover:border-foreground/30 group transition-colors">
						<a class="block" href="{base}/memories/{s.id}">
							<Card.Header class="pb-2">
								<Card.Title class="flex items-center gap-2 text-sm">
									<MessagesSquare class="size-4 text-violet-500" />
									<span class="truncate">{s.name}</span>
								</Card.Title>
							</Card.Header>
							<Card.Content class="text-muted-foreground flex flex-col gap-1 text-xs">
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="bg-muted rounded px-1.5 py-0.5 font-mono">{s.format}</span>
									{#if s.model}
										<span class="bg-muted rounded px-1.5 py-0.5 font-mono">{s.model}</span>
									{/if}
									<span>· {s.messageCount} msg</span>
								</div>
								{#if s.originAgent}
									<div class="truncate">
										from <span class="font-mono">{s.originAgent}</span>
										{#if s.originSession}· <span class="font-mono">{s.originSession}</span>{/if}
									</div>
								{/if}
								<div>updated {relative(s.updatedAt)}</div>
							</Card.Content>
						</a>
						<Separator />
						<div class="flex justify-end gap-1 p-2">
							<Button
								variant="ghost"
								size="sm"
								class="h-7 px-2 text-xs"
								onclick={() => duplicate(s.id)}
							>
								<CopyIcon class="size-3.5" /> Duplicate
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="text-destructive h-7 px-2 text-xs"
								onclick={() => remove(s.id, s.name)}
							>
								<TrashIcon class="size-3.5" /> Delete
							</Button>
						</div>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</ScrollArea>
</div>
