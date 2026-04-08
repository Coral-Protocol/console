<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';

	import IconCrane from 'phosphor-icons-svelte/IconCraneRegular.svelte';
	import { appContext } from '$lib/context';
	import IconMagnifyingGlassRegular from 'phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte';
	import { fade } from 'svelte/transition';
	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { Skeleton } from '@coral-os/component-library/ui/skeleton/index.js';

	let ctx = appContext.get();

	let search = $state('');
	let searchLower = $derived(search.trim().toLocaleLowerCase());

	let filtered = $derived(
		Object.values(ctx.server.catalogs).map((catalog) => {
			if (searchLower.length == 0) return { ...catalog, agents: Object.values(catalog.agents) };
			return {
				...catalog,
				agents: Object.values(catalog.agents).filter(
					(agent) => agent.name.toLocaleLowerCase().indexOf(search) !== -1
				)
			};
		})
	);
	let filteredCount = $derived(filtered.reduce((acc, cur) => acc + cur.agents.length, 0));
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link>Server</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Page>Agent Registry</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>
<main class="flex min-h-0 grow flex-col overflow-hidden p-4">
	<header class="mb-2 w-1/2">
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
	</header>
	<ol class="flex flex-col gap-4 overflow-y-scroll">
		{#each filtered as catalog}
			<li>
				{#if catalog.agents.length !== 0}
					<h1 class="w-full py-4 text-left text-2xl">
						{catalog.identifier.type.charAt(0).toLocaleUpperCase() +
							catalog.identifier.type.slice(1)}
						Agents
					</h1>
				{/if}
				<ol class="grid grid-cols-[repeat(auto-fit,minmax(320px,0fr))] gap-4">
					{#each catalog.agents as agent}
						<li class="h-[250px] w-xs grow rounded-md">
							<Dialog.Root>
								<Dialog.Trigger class="h-[250px] w-full text-left">
									<Card.Root class="h-full grow">
										<Card.Header class="flex gap-2">
											<Avatar.Root class="size-12">
												<Avatar.Image
													class="bg-cover object-cover"
													src={agent.icon_url}
													alt={agent.name.charAt(0).toUpperCase()}
												/>
												<Avatar.Fallback>{agent.name.charAt(0).toUpperCase()}</Avatar.Fallback>
											</Avatar.Root>
											<div class="flex flex-col gap-1">
												<Card.Title class="font-bold">{agent.name}</Card.Title>
												<Card.Description>By {agent.name ?? 'Unknown developer'}</Card.Description>
											</div>
										</Card.Header>
										<Card.Content class="flex w-full grow flex-col gap-2">
											{#await ctx.server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
												<Skeleton class="h-4 w-full" />
											{:then details}
												<p class="line-clamp-4 overflow-ellipsis">
													{details.registryAgent.info.description}
												</p>
											{/await}
											<!-- {#if agent.tags.length > 0}
													<div class="flex flex-wrap gap-1">
														{#each agent.tags.slice(0, 3) as tag}
															<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
																{tag}
															</span>
														{/each}
													</div>
												{/if} -->
										</Card.Content>
									</Card.Root>
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>{agent.name}</Dialog.Title>
										<Dialog.Description class="min-h-52">
											{#await ctx.server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
												<Skeleton class="h-4 w-full" />
											{:then details}
												{details.registryAgent.info.description}
											{/await}
										</Dialog.Description>
									</Dialog.Header>
								</Dialog.Content>
							</Dialog.Root>
							<Button
								href="/{agent.developer ?? 'coral_protocol'}/{encodeURI(agent.slug)}"
								variant="ghost"
								size="sm"
								class="h-fit w-full rounded-md p-0 drop-shadow-[#ff5c0026]! transition hover:drop-shadow-lg"
							></Button>
						</li>
					{/each}
				</ol>
			</li>
		{/each}
	</ol>
</main>
