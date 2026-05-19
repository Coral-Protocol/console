<script lang="ts">
	// Svelte / Kit
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';

	// UI
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as UnderlineTabs from '@coral-os/component-library/ui/underline-tabs/index.js';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';

	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { Skeleton } from '@coral-os/component-library/ui/skeleton/index.js';

	// Icons
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

	// Utils / libs
	import { cn } from '$lib/utils.js';
	import slugify from 'slugify';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import { appContext } from '$lib/context';
	import * as Dialog from '@coral-os/component-library/components/ui/dialog/index.js';

	import { createSessionContext } from '../../../routes/(app)/workbench/+page.svelte';
	import { toast } from 'svelte-sonner';

	const sessCtx = createSessionContext.get();

	// API / types

	// -----------------------
	// STATE
	// -----------------------

	let loading = $state(true);
	let error: string | null = $state(null);
	// let agent: any = $state(null);

	let open = $state(false);
	let selectedVersion = $state('');
	let triggerRef = $state<HTMLButtonElement>(null!);

	// -----------------------
	// VIEW MODEL
	// -----------------------

	interface agent {
		name: string;
		version: string;
		iconUrl?: string;
		developer: string;
		summary: string;
		readme: string;
		pricing: any;
		priceRange: string | null;
		versions: any[];
		capabilities: any[];
		keywords: any[];
		restrictions: any;
		options: Record<string, any>;
	}

	// let view: AgentView | null = $derived.by(() => {
	// 	if (!agent) return null;

	// 	const pricing = agent.registryAgent.marketplace?.pricing ?? null;

	// 	let priceRange: string | null = null;
	// 	if (pricing) {
	// 		const { min, max } = pricing.recommendations;
	// 		priceRange =
	// 			min === max ? `$${min} ${pricing.currency}` : `$${min} – $${max} ${pricing.currency}`;
	// 	}

	// 	return {
	// 		name: agent.registryAgent.info.identifier.name,
	// 		version: agent.registryAgent.info.identifier.version,
	// 		iconUrl: agent.extension?.iconUrl,
	// 		developer: agent.extension?.developer ?? 'Unknown',
	// 		summary: agent.registryAgent.info.summary ?? '',
	// 		readme: agent.registryAgent.info.readme ?? '',
	// 		pricing,
	// 		priceRange,
	// 		versions: agent.extension?.versions ?? [],
	// 		capabilities: agent.registryAgent.info.capabilities ?? [],
	// 		keywords: agent.registryAgent.info.keywords ?? [],
	// 		restrictions: agent.restrictions,
	// 		options: agent.registryAgent.options ?? {}
	// 	};
	// });

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => triggerRef?.focus());
	}

	let search = $state('');

	function extractHeadings(markdown: string) {
		return markdown
			.split('\n')
			.filter((line) => /^#{1,6}\s+/.test(line))
			.map((line) => {
				const match = line.match(/^(#{1,6})\s+(.*)/);
				return {
					depth: match?.[1]?.length ?? 0,
					text: match?.[2]?.trim() ?? ''
				};
			});
	}

	let { agent }: { agent: { name: string; versions: string[] } } = $props();

	let ctx = appContext.get();
</script>

<section class="flex min-h-[calc(min(100vw,1616px)*9/16)] w-full flex-col overflow-hidden">
	{#await ctx.server.lookupAgent( { name: agent.name, version: agent.versions[0]!, registrySourceId: { type: 'marketplace' } } )}
		<UnderlineTabs.Root
			value="description"
			class="mx-auto mb-8 flex h-full min-h-0 w-full grow flex-col gap-4 overflow-hidden"
		>
			<section class="flex w-full justify-between gap-4">
				<span class="flex gap-4">
					<Avatar.Root class="size-16">
						<Avatar.Image class="bg-cover object-cover" />
						<Avatar.Fallback class="bg-brand-primary text-primary-foreground  text-lg">
							...</Avatar.Fallback
						>
					</Avatar.Root>
					<h1 class="h-full content-center font-[Oxanium] text-2xl">
						<Skeleton class="h-6 w-24" />
					</h1>
				</span>
				<span class="flex items-center gap-2">
					<Button variant="secondary" target="_blank" size="lg" disabled>View on Market</Button>
					<Button class="bg-brand-primary" target="_blank" size="lg" disabled>Use this agent</Button
					>
					<Dialog.Close><Button variant="outline" size="lg">Close</Button></Dialog.Close>
				</span>
			</section>
			<section class="flex flex-col gap-6">
				<ol class="flex h-10 items-center gap-4 font-[Oxanium]">
					<li class="flex items-center gap-2">
						<Skeleton class="h-4 w-18" />
					</li>
					<Separator orientation="vertical" class="bg-foreground/40" />
					<li>
						<Popover.Root>
							<Popover.Trigger class="border-0">
								<Button variant="outline" class="justify-between" role="combobox">
									Latest
									<ChevronsUpDownIcon class="ms-2 size-4 shrink-0 opacity-50" />
								</Button>
							</Popover.Trigger>
						</Popover.Root>
					</li>
				</ol>
				<Skeleton class="h-4 w-64" />
				<Skeleton class="h-4 w-32" />
			</section>
			<header class="flex flex-col gap-6"></header>

			<UnderlineTabs.List class="overflow-visible ">
				<UnderlineTabs.Trigger value="description">Description</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="input">Input</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="pricing">Pricing</UnderlineTabs.Trigger>
			</UnderlineTabs.List>
			<section class="flex h-full min-h-0 grow gap-4 p-4">
				<Tabs.Content value="description" class="prose dark:prose-invert max-w-none">
					<Resizable.PaneGroup direction="horizontal" class="overflow-visible!">
						<Resizable.Pane defaultSize={85} class="flex flex-col gap-4 pr-4">
							<Skeleton class="h-10 w-64" />
							<Skeleton class="h-4 w-12" />
						</Resizable.Pane>
						<Resizable.Handle class="bg-accent" />
						<Resizable.Pane defaultSize={25} class="hidden h-full overflow-visible! md:block">
							<section class="sticky top-8 h-fit p-4">
								<span class="flex items-center gap-2 font-bold">
									<iconify-icon
										icon="solar:hamburger-menu-broken"
										class="h-6 w-6"
										width="1.5em"
										height="1.5em"
									></iconify-icon> Summary
								</span>
								<ol class="list-none">
									<li>
										<Skeleton class="h-3 w-12" />
									</li>
									<li>
										<Skeleton class="h-3 w-8" />
									</li>
									<li>
										<Skeleton class="h-3 w-9" />
									</li>
									<li>
										<Skeleton class="h-3 w-12" />
									</li>
								</ol>
							</section>
						</Resizable.Pane>
					</Resizable.PaneGroup>
				</Tabs.Content>
			</section>
		</UnderlineTabs.Root>
	{:then details}
		<UnderlineTabs.Root
			value="description"
			class="mx-auto mb-8 flex h-full min-h-0 w-full grow flex-col gap-4 overflow-hidden"
		>
			<section class="flex w-full justify-between gap-4">
				<span class="flex gap-4">
					<Avatar.Root class="size-16">
						<Avatar.Image
							class="bg-cover object-cover"
							src={details.extension?.iconUrl}
							alt={details.registryAgent.info.identifier.name.charAt(0).toUpperCase()}
						/>
						<Avatar.Fallback class="bg-brand-primary text-primary-foreground  text-lg">
							{details.registryAgent.info.identifier.name.charAt(0).toUpperCase()}</Avatar.Fallback
						>
					</Avatar.Root>
					<h1 class="h-full content-center font-[Oxanium] text-2xl">
						{details.registryAgent.info.identifier.name}
					</h1>
				</span>
				<span class="flex items-center gap-2">
					<Button
						variant="secondary"
						target="_blank"
						size="lg"
						href={`https://marketplace.coralprotocol.ai/agents/${details?.extension?.developer}/${details.registryAgent.info.identifier.name}`}
						>View on Market</Button
					>
					<Dialog.Close>
						<Button
							class="bg-brand-primary"
							size="lg"
							onclick={() => {
								toast.promise(
									sessCtx.addAgent(
										details.registryAgent.info.identifier.name,
										details.registryAgent.info.identifier.registrySourceId.type,
										details.registryAgent.info.identifier.version
									),
									{
										loading: 'Adding agent...',
										success: 'Agent added successfully',
										error: (err: any) => `Failed: ${err.message || err}`
									}
								);
							}}
						>
							Use this agent
							<iconify-icon icon="gridicons:external"></iconify-icon>
						</Button>
					</Dialog.Close>

					<Dialog.Close><Button variant="outline" size="lg">Close</Button></Dialog.Close>
				</span>
			</section>
			<section class="flex flex-col gap-6">
				<ol class="flex h-10 items-center gap-4 font-[Oxanium]">
					{#if details?.extension?.developer}
						<li>
							Developed by
							<span class="text-foreground/60 px-2 font-sans hover:underline">
								{details?.extension?.developer}
							</span>
						</li>
						<Separator orientation="vertical" class="bg-foreground/40" />
					{/if}
					<li>
						<Popover.Root bind:open>
							<Popover.Trigger bind:ref={triggerRef} class="border-0">
								<Button
									variant="outline"
									class="justify-between"
									role="combobox"
									aria-expanded={open}
								>
									{selectedVersion || 'Latest'}
									<ChevronsUpDownIcon class="ms-2 size-4 shrink-0 opacity-50" />
								</Button>
							</Popover.Trigger>
							<Popover.Content class="p-0">
								<Command.Root>
									<Command.Input placeholder="Search version..." />
									<Command.List>
										<Command.Empty>No version found.</Command.Empty>
										<Command.Group>
											{#each agent.versions as v}
												<Command.Item
													value={v}
													onSelect={() => {
														selectedVersion = v;
														closeAndFocusTrigger();
													}}
												>
													<CheckIcon
														class={cn('me-2 size-4', selectedVersion !== v && 'text-transparent')}
													/>
													{v}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
					</li>
					<!-- {#if view.priceRange}
						<Separator orientation="vertical" class="bg-foreground/40" />
						<li class="text-foreground/60 text-sm">{view.priceRange} / run</li>
					{/if} -->
				</ol>
				{#if details.registryAgent.info.summary}
					<p>{details.registryAgent.info.summary}</p>
				{:else}
					<p class="text-muted-foreground">No summary available</p>
				{/if}
			</section>
			<header class="flex flex-col gap-6"></header>

			<UnderlineTabs.List class="overflow-visible font-[Oxanium]">
				<UnderlineTabs.Trigger value="description">Description</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="input">Input</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="pricing">Pricing</UnderlineTabs.Trigger>
			</UnderlineTabs.List>
			<section class="flex h-full min-h-0 grow gap-4 overflow-y-scroll p-4">
				<Tabs.Content value="description" class="prose dark:prose-invert max-w-none">
					{#if details.registryAgent.info.readme}
						<Resizable.PaneGroup direction="horizontal" class="overflow-visible!">
							<Resizable.Pane defaultSize={85} class="pr-4">
								<SvelteMarkdown source={details.registryAgent.info.readme} />
							</Resizable.Pane>
							<Resizable.Handle class="bg-accent" />
							<Resizable.Pane defaultSize={25} class="hidden h-full overflow-visible! md:block">
								<section class="sticky top-8 h-fit p-4">
									<span class="flex items-center gap-2 font-bold">
										<iconify-icon
											icon="solar:hamburger-menu-broken"
											class="h-6 w-6"
											width="1.5em"
											height="1.5em"
										></iconify-icon> Summary
									</span>
									<ol class="list-none">
										{#each extractHeadings(details.registryAgent.info.readme) as heading}
											{#if heading.depth}
												<li class="ml-{(heading?.depth - 1) * 4} mt-2">
													<a
														href="#{heading.text
															.toLowerCase()
															.replace(/[^\w\s]/g, '')
															.replace(/\s+/g, '-')}"
														class="text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
													>
														{heading.text}
													</a>
												</li>
											{/if}
										{/each}
									</ol>
								</section>
							</Resizable.Pane>
						</Resizable.PaneGroup>
					{:else}
						<p class="text-muted-foreground">No description available.</p>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="input" class="w-full">
					<ol class="flex flex-col gap-8">
						<li class="flex flex-col gap-2">
							<h2 class="flex items-center gap-4 text-2xl font-bold">
								Options <span class="text-muted-foreground text-sm font-light"
									>({Object.keys(details.registryAgent.options).length})</span
								>
							</h2>
							<p class="text-muted-foreground">Settings for how this agent behaves and interacts</p>
							<Input placeholder="Search options..." class="w-1/3" bind:value={search} />
							{#if Object.keys(details.registryAgent.options).length > 0}
								<ol class="flex flex-col gap-2">
									{#each Object.entries(details.registryAgent.options) as [name, option]}
										{#if !search || name
												.replace(/_/g, ' ')
												.toLowerCase()
												.includes(search.replace(/_/g, ' ').toLowerCase())}
											<li class="flex flex-col gap-1">
												<Accordion.Root
													type="single"
													value={search ? name : undefined}
													class="border"
												>
													<Accordion.Item value={name}>
														<Accordion.Trigger class="hover:no-underline"
															><strong class="flex gap-4 text-sm"
																>{name}
																<Badge variant="secondary">{option.type}</Badge>
																<Badge variant="secondary">{option?.required ?? 'optional'}</Badge>
															</strong></Accordion.Trigger
														>
														<Accordion.Content class="flex flex-col gap-2">
															<span>{option?.display?.description ?? 'no description'}</span>
															{#if option.default}
																<span class="text-foreground/50"> Default value: </span>
																<pre
																	class="bg-background/50 p-4 whitespace-break-spaces">{option.default}</pre>
															{:else}
																<span class="text-muted-foreground">No default value</span>
															{/if}
														</Accordion.Content>
													</Accordion.Item>
												</Accordion.Root>
											</li>
										{/if}
									{/each}
								</ol>
							{:else}
								<p class="text-muted-foreground">None configured</p>
							{/if}
						</li>
					</ol>
				</Tabs.Content>

				<Tabs.Content value="pricing" class="prose dark:prose-invert max-w-none">
					{#if details.registryAgent.marketplace?.pricing}
						<div class="mb-6 flex items-baseline gap-2">
							<span class="text-2xl font-bold">{details.registryAgent.marketplace?.pricing}</span>
							<span class="text-muted-foreground">/ run</span>
						</div>
						<SvelteMarkdown source={details.registryAgent.marketplace?.pricing.description} />
					{:else}
						<p class="text-muted-foreground">No pricing information available.</p>
					{/if}
				</Tabs.Content>
			</section>
		</UnderlineTabs.Root>
	{:catch error}
		<p class="text-muted-foreground m-auto flex flex-col justify-center gap-4 text-center">
			{error ?? 'Agent not found'}
			<Dialog.Close><Button variant="outline" size="lg">Close</Button></Dialog.Close>
		</p>
	{/await}
</section>
