<script lang="ts">
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Select from '@coral-os/component-library/ui/select/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';

	import { Button } from '@coral-os/component-library/ui/button/index.js';

	import { createSessionContext } from '../+page.svelte';

	let ctx = createSessionContext.get();
	let formData = $derived(ctx.formData);
</script>

<header class="flex w-full flex-col gap-4 border-b p-4">
	<p class="text-sm">
		Agents can only communicate with other agents in their group, agents with no group cannot
		collaborate.
	</p>
	{#if ($formData.groups.at(-1)?.length ?? 1) == 0}
		<Tooltip.Provider>
			<Tooltip.Root delayDuration={100}>
				<Tooltip.Trigger class="w-fit"
					><Button
						class="gap-1 px-3"
						disabled={($formData.groups.at(-1)?.length ?? 1) == 0}
						onclick={() => {
							$formData.groups = [...$formData.groups, []];
						}}>Create a new group</Button
					></Tooltip.Trigger
				>
				<Tooltip.Content>
					Empty group already exists, please add agents to it before creating another.
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	{:else}
		<Button
			class="w-fit gap-1 px-3"
			onclick={() => {
				$formData.groups = [...$formData.groups, []];
			}}>Create a new group</Button
		>
	{/if}
</header>
<ul class=" flex flex-col">
	{#each $formData.groups as link, i}
		<Accordion.Root type="single">
			<Accordion.Item value="item-1">
				<Accordion.Trigger variant="compact" class="border-b">
					<span
						>Group {i + 1}
						<span class="text-muted-foreground pl-2 text-sm">{link.length} members</span></span
					>
				</Accordion.Trigger>
				<Accordion.Content class="border-b">
					<Select.Root
						type="multiple"
						value={link}
						onValueChange={(value) => {
							$formData.groups[i] = value;
							$formData.groups = $formData.groups;
						}}
					>
						<Select.Trigger class="mt-4">
							<span>Add agents </span>
						</Select.Trigger>
						<Select.Content>
							{#if $formData.agents.length == 0}
								<span class="text-muted-foreground px-2 text-sm italic">No agents</span>
							{/if}
							{#each new Set($formData.agents.map((agent) => agent.name)) as id}
								<Select.Item value={id}>{id}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<ol class="list-decimal pl-4">
						{#each link as agentName}
							<li>{agentName}</li>
						{/each}
					</ol>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	{/each}
</ul>
