<script lang="ts">
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as HoverCard from '@coral-os/component-library/ui/hover-card/index.js';
	import type { CoralServer } from '$lib/CoralServer.svelte';
	import type { components } from '$generated/api';

	let {
		server,
		onSelect
	}: {
		server: CoralServer;
		onSelect?: (
			agent: { name: string; versions: string[] },
			catalogId: components['schemas']['AgentRegistrySource']['identifier']
		) => void;
	} = $props();
</script>

<Command.Root>
	<Command.Input placeholder="Search agents..." />
	<Command.List>
		<Command.Empty>No agents found.</Command.Empty>
		{#each Object.values(server.catalogs) as catalog}
			<Command.Group heading={catalog.identifier.type}>
				{#each Object.values(catalog.agents) as agent}
					<HoverCard.Root>
						<HoverCard.Trigger class="m-0">
							<Command.Item
								class="w-full cursor-pointer border-b px-4 py-2"
								onSelect={() => onSelect?.(agent, catalog.identifier)}
							>
								<span class="grow">{agent.name}</span>
							</Command.Item>
						</HoverCard.Trigger>

						<HoverCard.Content side="right" class="max-w-1/2 min-w-full whitespace-pre-wrap">
							{#await server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
								<span class="text-muted">loading...</span>
							{:then details}
								{details.registryAgent.info.description}
							{/await}
						</HoverCard.Content>
					</HoverCard.Root>
				{/each}
			</Command.Group>
		{/each}
	</Command.List>
</Command.Root>
