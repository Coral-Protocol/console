<script lang="ts">
	import { page } from '$app/state';

	import * as Collapsible from '@coral-os/component-library/ui/collapsible/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as ContextMenu from '@coral-os/component-library/ui/context-menu/index.js';

	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { SidebarLink } from '@coral-os/component-library';

	import IconGameController from 'phosphor-icons-svelte/IconGameControllerRegular.svelte';

	import { cn } from '$lib/utils';
	import type { SessionAgentStatus } from '$lib/session.svelte';
	import { type SessionAgentStatusMap, humanReadableMap, resolveStateMap } from '$lib';

	import type { Component } from 'svelte';
	import { appContext } from '$lib/context';

	let {
		items
	}: {
		items: {
			disabled?: boolean;
			title: string;
			icon?: Component;
			sumBadges?: boolean;
			items: {
				id?: string;
				title: string;
				url: string;
				badge?: number;
				state?: SessionAgentStatus;
			}[];
		}[];
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
</script>

<Sidebar.Menu>
	{#each items as item (item.title)}
		{@const activeSubitems = item.items.map((sub) => page.url.pathname === sub.url)}
		{@const badgeSum = item.sumBadges
			? item.items.reduce((acc, cur) => {
					return acc + (cur.badge ?? 0);
				}, 0)
			: 0}
		<Collapsible.Root open={activeSubitems.indexOf(true) != -1} class="group/collapsible">
			{#snippet child({ props })}
				<Collapsible.Trigger {...props} disabled={item.items.length === 0 || item.disabled}>
					{#snippet child({ props })}
						<SidebarLink
							{...props}
							title={item.title}
							icon={item.icon}
							badge={badgeSum}
							collapsible
						/>
					{/snippet}
				</Collapsible.Trigger>
				<Collapsible.Content>
					<Sidebar.MenuSub>
						{#each item.items as subItem, i (subItem.id ?? subItem.title)}
							<Sidebar.MenuSubItem>
								<Sidebar.MenuSubButton isActive={activeSubitems[i]}>
									{#snippet child({ props })}
										<ContextMenu.Root>
											<ContextMenu.Trigger {...props}>
												{#snippet child({ props })}
													<Tooltip.Provider>
														<Tooltip.Root>
															<Tooltip.Trigger {...props}>
																{#snippet child({ props })}
																	<a href={subItem.url} {...props}>
																		{#if subItem.state}
																			<span
																				class={cn(
																					'size-2 rounded-full',
																					resolveStateMap(subItem.state, stateColors)
																				)}
																				><span class="sr-only"
																					>({resolveStateMap(
																						subItem.state,
																						humanReadableMap
																					)})</span
																				></span
																			>
																		{/if}
																		<span class="truncate font-sans font-medium tracking-wide"
																			>{subItem.title}</span
																		>
																		{#if subItem.badge}
																			<Badge>{subItem.badge}</Badge>
																		{/if}
																	</a>
																{/snippet}
															</Tooltip.Trigger>
															<Tooltip.Content
																><p>
																	{subItem.title} - {subItem.state
																		? resolveStateMap(subItem.state, humanReadableMap)
																		: ''}
																</p></Tooltip.Content
															>
														</Tooltip.Root>
													</Tooltip.Provider>
												{/snippet}
											</ContextMenu.Trigger>
											<ContextMenu.Content class="w-52">
												<ContextMenu.Item
													onclick={() => {
														if (!ctx.session) return;
														ctx.session.possessed = subItem.id ?? null;
													}}><IconGameController /> Possess</ContextMenu.Item
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
	{/each}
</Sidebar.Menu>
