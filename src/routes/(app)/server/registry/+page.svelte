<script lang="ts">
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';

	import { appContext } from '$lib/context';
	import IconMagnifyingGlassRegular from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import { fade } from 'svelte/transition';
	import { Skeleton } from '@coral-os/component-library/ui/skeleton/index.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

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
	<Breadcrumbs />
</header>
<main class="flex min-h-0 grow flex-col overflow-hidden p-4">
	<header class="mb-2 md:w-[400px]">
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
						{#await ctx.server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: catalog.identifier } )}
							<div class="bg-foreground/5 h-[250px] w-xs border"></div>
						{:then details}
							<li class="h-[250px] w-xs grow rounded-md">
								<Dialog.Root>
									<Dialog.Trigger class=" h-[250px] w-full text-left">
										<Card.Root class="hover:dark:bg-ring/20 hover:bg-ring/10 h-full grow">
											<Card.Header class="flex gap-2">
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
											</Card.Header>
											<Card.Content class="flex w-full grow flex-col gap-2">
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
							</li>
						{/await}
					{/each}
				</ol>
			</li>
		{/each}
	</ol>
</main>
