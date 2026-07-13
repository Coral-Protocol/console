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
	import { getInitials } from '$lib/utils';
	import { activeFile } from '$lib/activeFile.svelte';
	import { randomAdjective, randomPlant } from '$lib/words';

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

		agentData.current = agent;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', agent.name); // some browsers need at least one type set

		const transparentPixel = new Image();
		transparentPixel.src =
			'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
		event.dataTransfer.setDragImage(transparentPixel, 0, 0);
	};

	const addAgent = async (agent: any, spawnPos: { x: number; y: number } | null = null) => {
		if (!activeFile.current) {
			
		}
		
		const registrySourceId = agent.registrySourceId ?? { type: agent.source };

		const lookupDetails = await ctx.server.lookupAgent({
			name: agent.name,
			version: agent.version,
			registrySourceId
		});

		if (!lookupDetails) {
			console.error('Failed to look up agent details for', agent);
			return;
		}

		const runtime = (Object.keys(lookupDetails.registryAgent.runtimes).at(0) ?? undefined) as
			| 'function'
			| 'executable'
			| 'docker'
			| 'prototype';

		const beforeIds = new Set((activeFile.current?.agents ?? []).map((a) => a.clientId));

		activeFile.addAgent({
			id: { name: agent.name, version: agent.version, registrySourceId },
			name: `${randomAdjective()} ${randomPlant()}`,
			description: lookupDetails.registryAgent.info.description ?? '',
			provider: { type: 'local', runtime },
			blocking: false,
			customToolAccess: [],
			plugins: [],
			budgetSettings: { budget: 0, exhaustionBehavior: { type: 'consume_session' } },
			x402Budgets: [],
			options: {}
		});
	};
</script>

<InputGroup.Root>
	<InputGroup.Input placeholder="Search agents" bind:value={search} />
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
	<!-- {#if catalog.identifier.type == source} -->
	<ol class="flex w-full grow flex-col justify-center pt-2">
		{#each catalog.agents as agent}
			{#await ctx.server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
				<div class="bg-card/50 h-[42px] w-full border"></div>
			{:then details}
				<li
					class="group hover:dark:bg-ring/20 flex max-h-32 min-h-28 w-full items-center gap-3 overflow-hidden border-b p-1"
				>
					<button
						class="min-w-0 flex-1"
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
					>
						<Card.Root class="gap-1 border-0 bg-transparent p-1 text-left shadow-none">
							<Card.Header class="flex gap-2 p-0">
								<Avatar.Root class="size-8 shrink-0">
									<Avatar.Image
										class="bg-cover object-cover"
										src={details.extension?.iconUrl}
										alt={getInitials(agent.name)}
									/>
									<Avatar.Fallback>
										{getInitials(agent.name)}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="flex min-w-0 flex-col items-start gap-1">
									<Card.Title class="truncate font-bold">
										{agent.name}
									</Card.Title>

									<Card.Description class="truncate text-xs">
										{details.extension?.developer
											? 'By ' + details.extension.developer
											: 'Unknown developer'}
									</Card.Description>
								</div>
							</Card.Header>
							<Card.Content
								class="text-foreground/90 group-hover:text-foreground flex flex-col gap-2 p-0"
							>
								<p class="line-clamp-2">
									{details.registryAgent.info.description}
								</p>
								{#if details.registryAgent?.marketplace?.keywords?.length}
									<div class="flex flex-wrap gap-1">
										{#each details.registryAgent.marketplace.keywords.slice(0, 3) as keyword}
											<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
												{keyword}
											</span>
										{/each}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					</button>
					<Button
						variant="outline"
						size="sm"
						class="shrink-0 opacity-0 transition group-hover:opacity-100"
						onclick={() =>
							addAgent({
								name: agent.name,
								version: agent.versions[0]!,
								source: catalog.identifier.type
							})}
					>
						Add
					</Button>
				</li>
			{:catch err}
				<!-- skip -->
			{/await}
		{/each}
	</ol>
	<!-- {/if} -->
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
