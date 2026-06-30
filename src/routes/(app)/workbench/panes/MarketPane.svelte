<script lang="ts">
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';

	import IconCrane from 'phosphor-icons-svelte/IconCraneRegular.svelte';
	import { appContext } from '$lib/context';
	import IconMagnifyingGlassRegular from 'phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte';
	import { fade } from 'svelte/transition';
	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { Skeleton } from '@coral-os/component-library/ui/skeleton/index.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	import Header from '$lib/components/header.svelte';
	import AgentMarketView from '$lib/components/dialogs/AgentMarketView.svelte';

	import { useDnD } from '$lib/components/DndProvider.svelte';
	import { getSessionContext } from '$lib/sessionCreatorContext';

	let ctx = appContext.get();
	let sessCtx = getSessionContext();

	let search = $state('');
	let loading = $state(true);
	let searchLower = $derived(search.trim().toLocaleLowerCase());

	let filtered = $derived(
		Object.values(ctx.server.catalogs).map((catalog) => {
			if (searchLower.length == 0) return { ...catalog, agents: Object.values(catalog.agents) };
			return {
				...catalog,
				agents: Object.values(catalog.agents).filter(
					(agent) => agent.name.toLocaleLowerCase().indexOf(searchLower) !== -1
				)
			};
		})
	);

	$effect(() => {
		sessCtx.availableAgents = filtered.flatMap((catalog) => catalog.agents);
	});

	let filteredCount = $derived(filtered.reduce((acc, cur) => acc + cur.agents.length, 0));
	loading = false;

	let selectedAgentClientId = $state<{
		agent: { name: string; versions: string[] };
		details: Awaited<ReturnType<typeof ctx.server.lookupAgent>>;
	} | null>(null);

	let dialogOpen = $state(false);

	let { source }: { source: string } = $props();

	const agentData = useDnD();

	const onDragStart = (
		event: DragEvent,
		agent: { name: string; version: string; source: string }
	) => {
		if (!event.dataTransfer) {
			return null;
		}

		agentData.agent = agent;
		event.dataTransfer.effectAllowed = 'move';
	};
</script>

<InputGroup.Root>
	<InputGroup.Input placeholder="Search..." bind:value={search} />
	<InputGroup.Addon>
		<IconMagnifyingGlassRegular />
	</InputGroup.Addon>

	<InputGroup.Addon align="inline-end"
		>{#if search.length > 0}
			<span transition:fade={{ duration: 100 }}>{filteredCount} results</span>
		{/if}
	</InputGroup.Addon>
</InputGroup.Root>
{#each filtered as catalog}
	{#if catalog.identifier.type == source}
		<ol class="flex w-full grow flex-col justify-center gap-2 pt-2">
			{#each catalog.agents as agent}
				{#await ctx.server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
					<div class="bg-foreground/5 h-[42px] w-xs border"></div>
				{:then details}
					<li class="w-full grow cursor-pointer">
						<button
							onclick={() => {
								selectedAgentClientId = { agent, details };
								dialogOpen = true;
							}}
							ondragstart={(event) =>
								onDragStart(event, {
									name: agent.name,
									version: agent.versions[0]!,
									source: catalog.identifier.type
								})}
							draggable={true}
							type="button"
							class="h-full w-full grow"
						>
							<Card.Root
								class="hover:dark:bg-ring/20 hover:bg-ring/10 h-full w-full grow gap-0 border-0 bg-transparent p-1 text-left shadow-none"
							>
								<Card.Header class="flex gap-2 p-0">
									<Avatar.Root class="size-8">
										<Avatar.Image
											class="bg-cover object-cover"
											src={details.extension?.iconUrl}
											alt={agent.name.charAt(0).toUpperCase()}
										/>
										<Avatar.Fallback>
											{agent.name.charAt(0).toUpperCase()}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex flex-col items-start gap-1">
										<Card.Title class="font-bold">{agent.name}</Card.Title>
										<Card.Description class="text-xs">
											{details.extension?.developer
												? 'By ' + details.extension.developer
												: 'Unknown developer'}
										</Card.Description>
									</div>
								</Card.Header>
								<!-- <Card.Content class="flex w-full grow flex-col gap-2 p-0">
									<p class="line-clamp-4 overflow-ellipsis">
										{details.registryAgent.info.description}
									</p>
									{#if details.registryAgent?.marketplace?.keywords?.length}
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
								</Card.Content> -->
							</Card.Root>
						</button>
					</li>
				{:catch err}
					<!-- skip -->
				{/await}
			{/each}
		</ol>
	{/if}
{/each}

{#if filteredCount === 0 && !loading}
	<p class="text-muted-foreground h-full w-full grow content-center text-center text-sm">
		No agents found
	</p>
{/if}

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="bg-card h-full max-h-4/5 max-w-4/5! overflow-hidden" showClose={false}>
		{#if selectedAgentClientId}
			<AgentMarketView agent={selectedAgentClientId.agent} />
		{/if}
	</Dialog.Content>
</Dialog.Root>
