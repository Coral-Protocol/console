<script lang="ts">
	import { activeFile } from '$lib/activeFile.svelte';
	import { Input } from '@coral-os/component-library/components/ui/input/index.js';
	import { untrack } from 'svelte';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import { Button } from '@coral-os/component-library/components/ui/button/index.js';
	import IconPlusRegular from 'phosphor-icons-svelte/IconPlusRegular.svelte';

	type Row = { id: string; key: string; value: string };

	let rows = $state<Row[]>(toRows(activeFile.current?.annotations));
	let newKey = $state('');
	let newValue = $state('');

	function toRows(annotations: Record<string, string> | undefined): Row[] {
		return Object.entries(annotations ?? {}).map(([key, value]) => ({
			id: crypto.randomUUID(),
			key,
			value
		}));
	}

	$effect(() => {
		const activeAnnotations = activeFile.current?.annotations;
		untrack(() => (rows = toRows(activeAnnotations)));
	});

	function commit() {
		activeFile.replaceAnnotations(Object.fromEntries(rows.map((r) => [r.key, r.value])));
	}

	function updateKey(id: string, key: string) {
		const row = rows.find((r) => r.id === id);
		if (row) row.key = key;
		commit();
	}

	function updateValue(id: string, value: string) {
		const row = rows.find((r) => r.id === id);
		if (row) row.value = value;
		commit();
	}

	function removeRow(id: string) {
		rows = rows.filter((r) => r.id !== id);
		commit();
	}

	function addRow() {
		if (!newKey) return;
		rows.push({ id: crypto.randomUUID(), key: newKey, value: newValue });
		newKey = '';
		newValue = '';
		commit();
	}
</script>

<section>
	{#if activeFile.current && activeFile.current.annotations}
		<h2 class="">Session annotations</h2>
		<header class="text-muted-foreground flex w-full grow justify-between gap-1 py-2 text-sm">
			<span class="w-1/2">Key</span>
			<span class="w-1/2">Value</span>
		</header>
		<ol class="flex flex-col gap-2">
			<li class="flex w-full gap-1 pb-4">
				<Input type="string" placeholder="new key" class="max-w-xs grow" bind:value={newKey} />
				<Input type="string" placeholder="new value" class="max-w-xs grow" bind:value={newValue} />
				<Button onclick={addRow} disabled={!newKey}><IconPlusRegular /></Button>
			</li>
			{#each rows as row (row.id)}
				<li class="flex w-full gap-1">
					<Input
						type="string"
						placeholder="key"
						class="max-w-xs grow"
						value={row.key}
						onchange={(e: Event) => updateKey(row.id, (e.target as HTMLInputElement).value)}
					/>
					<Input
						type="string"
						placeholder="value"
						class="max-w-xs grow"
						value={row.value}
						onchange={(e: Event) => updateValue(row.id, (e.target as HTMLInputElement).value)}
					/>
					<Button variant="ghostDestructive" onclick={() => removeRow(row.id)}><IconTrash /></Button
					>
				</li>
			{/each}
		</ol>
	{/if}
</section>
