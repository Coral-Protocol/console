<script lang="ts">
	import { page } from '$app/state';

	import * as Collapsible from '@coral-os/component-library/ui/collapsible/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as ContextMenu from '@coral-os/component-library/ui/context-menu/index.js';

	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { SidebarLink } from '@coral-os/component-library';

	import IconGhost from 'phosphor-icons-svelte/IconGhostRegular.svelte';

	import { cn } from '$lib/utils';
	import type { SessionAgentStatus } from '$lib/session.svelte';
	import { type SessionAgentStatusMap, humanReadableMap, resolveStateMap } from '$lib';

	import type { Component, Snippet } from 'svelte';
	import { appContext } from '$lib/context';

	type Item = {
		id?: string;
		title: string;
		url: string;
		badge?: number;
		state?: SessionAgentStatus;
	};
	let {
		title,
		icon,
		sumBadges,
		disabled,
		items,
		emptyLabel = 'No items.',
		actions,
		itemActions
	}: {
		disabled?: boolean;
		title: string;
		icon?: Component;
		sumBadges?: boolean;
		items: Item[];
		emptyLabel?: string;
		actions?: Snippet<[]>;
		itemActions?: Snippet<[{ item: Item }]>;
	} = $props();

	let ctx = appContext.get();

	const stateColors: SessionAgentStatusMap<string> = {
		waiting: 'border-primary/30 border bg-transparent',
		running: {
			connected: {
				sleeping: 'bg-blue-400',
				thinking: 'bg-orange-400 animate-pulse',
				waiting_message: 'bg-green-400'
			},
			not_connected: 'bg-primary/30 animate-pulse'
		},
		stopped: 'bg-destructive'
	};

	let activeSubitems = $derived(items.map((sub) => page.url.pathname === sub.url));
	let badgeSum = $derived(
		sumBadges
			? items.reduce((acc, cur) => {
					return acc + (cur.badge ?? 0);
				}, 0)
			: 0
	);
</script>

<Sidebar.Menu>
	<Collapsible.Root open={activeSubitems.indexOf(true) != -1} class="group/collapsible">
		{#snippet child({ props })}
			<Collapsible.Trigger {...props} {disabled}>
				{#snippet child({ props })}
					<SidebarLink {...props} {title} {icon} badge={badgeSum} collapsible>
						{#snippet extra()}
							{#if actions}
								<span class={cn('flex grow justify-end', badgeSum > 0 && 'pr-8')}>
									{@render actions()}
								</span>
							{/if}
						{/snippet}
					</SidebarLink>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Sidebar.MenuSub>
					{#if items.length === 0}
						<Sidebar.MenuSubItem class="pointer-events-none">
							<Sidebar.MenuSubButton class="text-muted-foreground">
								{emptyLabel}
							</Sidebar.MenuSubButton>
						</Sidebar.MenuSubItem>
					{/if}
					{#each items as item, i (item.id ?? item.title)}
						<Sidebar.MenuSubItem>
							<Sidebar.MenuSubButton isActive={activeSubitems[i]}>
								{#snippet child({ props })}
									<ContextMenu.Root>
										<ContextMenu.Trigger {...props}>
											{#snippet child({ props })}
												<Tooltip.Root>
													<Tooltip.Trigger {...props}>
														{#snippet child({ props })}
															<a href={item.url} {...props}>
																{#if item.state}
																	<span
																		class={cn(
																			'size-2 rounded-full',
																			resolveStateMap(item.state, stateColors)
																		)}
																		><span class="sr-only"
																			>({resolveStateMap(item.state, humanReadableMap)})</span
																		></span
																	>
																{/if}
																<span class="truncate font-sans font-medium tracking-wide"
																	>{item.title}</span
																>
																{#if item.badge}
																	<Badge>{item.badge}</Badge>
																{/if}
																<span class="grow"></span>
																{@render itemActions?.({ item })}
															</a>
														{/snippet}
													</Tooltip.Trigger>
													<Tooltip.Content
														><p>
															{item.title} - {item.state
																? resolveStateMap(item.state, humanReadableMap)
																: ''}
														</p></Tooltip.Content
													>
												</Tooltip.Root>
											{/snippet}
										</ContextMenu.Trigger>
										<ContextMenu.Content class="w-52">
											<ContextMenu.Item
												onclick={() => {
													if (!ctx.session) return;
													ctx.session.possessed = item.id ?? null;
												}}><IconGhost /> Possess</ContextMenu.Item
											>
										</ContextMenu.Content>
									</ContextMenu.Root>
								{/snippet}
							</Sidebar.MenuSubButton>
						</Sidebar.MenuSubItem>
					{/each}
				</Sidebar.MenuSub>
			</Collapsible.Content>
		{/snippet}
	</Collapsible.Root>
</Sidebar.Menu>
