<script lang="ts">
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Select from '@coral-os/component-library/ui/select/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';

	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as HoverCard from '@coral-os/component-library/ui/hover-card/index.js';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import { buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';

	let ctx = getSessionContext();
	let formData = $derived(ctx.formData);

	let openId: string | null = $state(null);

	function handleScroll() {
		openId = null;
	}

	let newGroup = [];
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
				$formData.groups = [...$formData.groups, []];
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
<ul class=" flex flex-col">
	{#if Object.keys($formData.groups).length == 0}
		<p class="text-muted-foreground flex w-full place-items-center justify-center pt-8">
			No groups to display.
		</p>
	{/if}
	<ol class="flex flex-col gap-1 p-2">
		{#each $formData.groups as group, i}
			<li
				class="flex h-full w-full grid-cols-2 items-center gap-2 border {group.length == 0
					? 'border-dashed'
					: ''} p-2"
			>
				<div
					style="background-color: oklch(0.7 0.1 {53 * i})"
					class="h-full w-2 transition-all"
				></div>
				<section class="flex w-full">
					<ol class="flex w-full grow flex-wrap gap-2">
						{#each group as agentName, agentI}
							<li>
								<Badge variant="outline" class="h-fit justify-start pr-0.5"
									>{agentName}
									<Button
										variant="ghost"
										size="xs"
										class="h-5 w-5"
										onclick={() => {
											$formData.groups[i]?.splice(agentI, 1);
											$formData.groups = $formData.groups;
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
							<Popover.Trigger class={buttonVariants({ variant: 'outline' })}>+ Add</Popover.Trigger
							>
							<Popover.Content
								><Command.Root>
									<Command.Input placeholder="Search agents..." />
									<Command.List onscroll={handleScroll}>
										<Command.Group heading="Available agents">
											{#each new Set($formData.agents.map((agent) => agent.name)) as agent}
												{#if !$formData.groups[i]?.includes(agent)}
													<Command.Item
														value={agent}
														onSelect={() => {
															$formData.groups[i]?.push(agent);
															$formData.groups = $formData.groups;
														}}
													>
														{agent}</Command.Item
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
								$formData.groups.splice(i, 1);
								$formData.groups = $formData.groups;
							}}><IconTrash /></Button
						>
					</section>
				</section>
			</li>
		{/each}
	</ol>
		note: empty groups are ignored during session creation
		class="text-muted-foreground mx-auto transition-opacity select-none {$formData.groups.length >
			1 && $formData.groups.filter((g) => g.length === 0).length >= 1
			? 'opacity-50 delay-300 duration-800'
			: 'opacity-0 delay-0 duration-0'}"
	>
		note: empty groups are removed during session creation
	</p>
</ul>
