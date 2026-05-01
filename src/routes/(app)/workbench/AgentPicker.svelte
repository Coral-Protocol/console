<script lang="ts">
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as HoverCard from '@coral-os/component-library/ui/hover-card/index.js';
	import type { CoralServer } from '$lib/CoralServer.svelte';
	import type { components } from '$generated/api';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';

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
							class=" min-w-full whitespace-pre-wrap"
							hideWhenDetached
						>
							{#await server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
								<span>Loading details...</span>
							{:then details}
								<div class="flex gap-2">
									<Avatar.Root class="size-12">
										<Avatar.Image
											class="bg-cover object-cover"
											src={details.extension?.iconUrl}
											alt={agent.name.charAt(0).toUpperCase()}
										/>
										<Avatar.Fallback>{agent.name.charAt(0).toUpperCase()}</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex flex-col gap-1">
										<Card.Title class="font-bold">{agent.name}</Card.Title>
										<Card.Description>
											{details.extension?.developer
												? 'By ' + details.extension.developer
												: 'Unknown developer'}</Card.Description
										>
									</div>
								</div>
								<div class="flex w-full grow flex-col gap-2">
									<p class="line-clamp-4 overflow-ellipsis">
										{details.registryAgent.info.description}
									</p>
									{#if details.registryAgent?.marketplace?.keywords && details.registryAgent.marketplace.keywords.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each details.registryAgent.marketplace.keywords.slice(0, 3) as keyword}
												<span
													class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
												>
													{keyword}
												</span>
											{/each}
										</div>
									{/if}
								</div>
							{:catch error}
								<span class="text-destructive"
									>Couldn't fetch details for this agent! Check the console for further information.</span
								>
							{/await}
						</HoverCard.Content>
					</HoverCard.Root>
				{/each}
			</Command.Group>
		{/each}
	</Command.List>
</Command.Root>
