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

	let openId: string | null = $state(null);

	function handleScroll() {
		openId = null;
	}
</script>

<Command.Root>
	<Command.Input placeholder="Search agents..." />
	<Command.List onscroll={handleScroll}>
		<Command.Empty>No agents found.</Command.Empty>
		{#each Object.values(server.catalogs) as catalog}
			<Command.Group heading={catalog.identifier.type}>
				{#each Object.values(catalog.agents) as agent}
					{@const id = `${catalog.identifier.type}-${agent.name}`}
					<HoverCard.Root
						closeDelay={0}
						open={openId === id}
						onOpenChange={(v) => {
							openId = v ? id : null;
						}}
					>
						<HoverCard.Trigger class="m-0">
							<Command.Item
								value={`${catalog.identifier.type}:${agent.name}:${agent.versions[0]}`}
								class="w-full cursor-pointer border-b px-4 py-2"
								onSelect={() => onSelect?.(agent, catalog.identifier)}
							>
								<span class="grow">{agent.name}</span>
							</Command.Item>
						</HoverCard.Trigger>

						<HoverCard.Content
							side="right"
							class="max-w-1/2 min-w-full whitespace-pre-wrap"
							hideWhenDetached
						>
							{#await server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
								<span>Loading details...</span>
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
