<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import { buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import { activeFile } from '$lib/activeFile.svelte';
	import type { Group, Agent } from '$lib/fileStorage.svelte';

	let groups = $derived<Group[]>(activeFile?.current?.groups ?? []);
	let agents = $derived<Agent[]>(activeFile.current?.agents ?? []);
</script>

<header class="flex w-full flex-col gap-4 border-b p-4">
	<p class="text-sm">
		Agents can only communicate in their group, meaning any agent in no groups cannot collaborate
		with others.
	</p>

	<section class="flex gap-2">
		<Button
			class="w-fit gap-1 px-3"
			onclick={() => {
				activeFile.addGroup({ name: '', agentClientIds: [] });
			}}>Create a new group</Button
		>
		<!-- <Button
			class="w-fit gap-1 px-3"
			variant="outline"
			onclick={() => {
				$formData.groups = [...$formData.groups, []];
			}}>New group from selection</Button
		> -->
	</section>
</header>

{#if groups.length == 0}
	<p class="text-muted-foreground m-auto text-center">Create a new group to invite agents.</p>
{:else}
	<ul class=" flex flex-col">
		<ol class="flex flex-col gap-1 p-2">
			{#each groups as group, i}
				<li
					class="flex w-full items-stretch gap-2 border p-2 {group.agentClientIds.length == 0
						? 'border-dashed'
						: ''} p-2"
				>
					<div
						style="background-color: oklch(0.7 0.1 {53 * i})"
						class="w-2 self-stretch transition-all"
					></div>
					<section class="flex w-full">
						<ol class="flex w-full grow flex-wrap gap-2">
							{#each group.agentClientIds as agentClientId}
								{@const agent = agents.find((agent) => agent.clientId === agentClientId)}
								<li>
									<Badge variant="outline" class="h-fit justify-start pr-0.5"
										>{agent?.name}
										<Button
											variant="ghost"
											size="xs"
											class="h-5 w-5"
											onclick={() => {
												activeFile.updateGroup(group.clientId, {
													agentClientIds: group.agentClientIds.filter((id) => id !== agentClientId)
												});
											}}
										>
											<IconXRegular class="h-2 w-2" />
										</Button></Badge
									>
								</li>
							{:else}
								<span class="text-muted-foreground opacity-50">empty group</span>
							{/each}
						</ol>
						<section class="flex grow gap-2">
							<Popover.Root>
								<Popover.Trigger class={buttonVariants({ variant: 'outline' })}
									>+ Add</Popover.Trigger
								>
								<Popover.Content
									><Command.Root>
										<Command.Input placeholder="Search agents..." />
										<Command.List>
											<Command.Group heading="Available agents">
												{#each agents as agent}
													{#if !group.agentClientIds.includes(agent.clientId)}
														<Command.Item
															value={agent.name}
															onSelect={() => {
																activeFile.updateGroup(group.clientId, {
																	agentClientIds: [...group.agentClientIds, agent.clientId]
																});
															}}
														>
															{agent.name}</Command.Item
														>
													{/if}
												{/each}
											</Command.Group>
											<Command.Empty>No agents found.</Command.Empty>
										</Command.List>
									</Command.Root></Popover.Content
								>
							</Popover.Root>
							<Button
								variant="outline"
								onclick={() => {
									activeFile.removeGroup(group.clientId);
								}}><IconTrash /></Button
							>
						</section>
					</section>
				</li>
			{/each}
		</ol>
		<p
			class="text-muted-foreground mx-auto transition-opacity select-none {(groups?.length ?? 0) >
				1 && (groups?.filter((g) => (g.agentClientIds?.length ?? 0) === 0)?.length ?? 0) >= 1
				? 'opacity-50 delay-300 duration-800'
				: 'opacity-0 delay-0 duration-0'}"
		>
			note: empty groups are not saved
		</p>
	</ul>
{/if}
