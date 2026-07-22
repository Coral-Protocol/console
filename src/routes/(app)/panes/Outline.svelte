<script lang="ts">
	import { activeFile } from '$lib/activeFile.svelte';
	import * as Table from '@coral-os/component-library/ui/table/index.js';
	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	let sessCtx = getSessionContext();
	import { useStore } from '@xyflow/svelte';
	const store = useStore();
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[160px]">Name</Table.Head>
			<Table.Head>Runtime</Table.Head>
			<Table.Head>Agent verison</Table.Head>
			<Table.Head>Tools</Table.Head>
			<Table.Head class="text-end">Budget</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#if activeFile.current?.agents.length}
			{#each activeFile.current.agents as agent}
				<Table.Row
					onclick={() => {
						store.handleNodeSelection(agent.clientId);
					}}
					class={sessCtx.selectedAgentIds.includes(agent.clientId) ? 'bg-muted/50' : ''}
				>
					<Table.Cell class="max-w-[160px] truncate font-medium">
						{agent.name}
						<span class="text-foreground/50 block text-xs">{agent.id.name}</span>
					</Table.Cell>

					<Table.Cell>
						<Badge variant="secondary">
							{agent.provider.runtime}
						</Badge>
					</Table.Cell>
					<Table.Cell>
						<Badge variant="outline">
							{agent.id.version}
						</Badge>
					</Table.Cell>

					<Table.Cell>
						{#if agent.customToolAccess?.length}
							{agent.customToolAccess.length}
						{:else}
							<span class="text-foreground/50">-</span>
						{/if}
					</Table.Cell>
					<Table.Cell class="text-end">
						{#if agent.budgetSettings && agent.budgetSettings.budget}
							<span>${agent.budgetSettings.budget / 100_000_000}</span>
						{/if}
					</Table.Cell>
				</Table.Row>
			{/each}
		{:else}
			<Table.Row>
				<Table.Cell colspan={5} class="text-foreground/50 text-center">
					No agents in this graph yet.
				</Table.Cell>
			</Table.Row>
		{/if}
	</Table.Body>
</Table.Root>
