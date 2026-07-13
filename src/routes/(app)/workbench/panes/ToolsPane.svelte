<script lang="ts">
	import * as Item from '@coral-os/component-library/ui/item/index.js';

	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';

	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';
	import { TwostepButton } from '@coral-os/component-library';

	import ToolInput from './ToolInput.svelte';

	import { randomAdjective, randomAnimal } from '$lib/words';
	import { activeFile } from '$lib/activeFile.svelte';

	let selectedTool: string | undefined = $state(undefined);

	// TODO: currently agents are taking tools by name but i need to use it by clientId cause rn if you add a tool, tell an agent to use it, then rename it, its broken!
</script>

<header class="flex w-full flex-col gap-4 border-b p-4">
	<p class="text-sm">Custom tools</p>
	<Button
		onclick={() => {
			const clientId = activeFile.addTool({
				name: `${randomAdjective()}-${randomAnimal()}`,
				transport: { type: 'http', url: '' },
				inputSchema: {
					type: ''
				},
				outputSchema: {
					type: ''
				}
			});
			selectedTool = clientId;
		}}>+</Button
	>
</header>
<section class="flex flex-col gap-4 px-4 pt-4">
	<Item.Root variant="outline" class="p-2 ">
		<Item.Content>
			<ScrollArea class="max-h-60 overflow-scroll">
				{#if (activeFile.current?.tools ?? []).length === 0}
					<p class="text-muted-foreground flex h-9 w-full place-items-center justify-center">
						No tools have been created.
					</p>
				{/if}
				{#each activeFile.current?.tools ?? [] as tool (tool.clientId)}
					<Toggle
						class="flex w-full justify-start pr-0"
						bind:pressed={
							() => selectedTool === tool.clientId, () => (selectedTool = tool.clientId)
						}
					>
						<p class="grow text-left">{tool.name}</p>
						<TwostepButton
							class="size-9"
							variant="ghostDestructive"
							onclick={() => {
								activeFile.removeTool(tool.clientId);
								selectedTool = (activeFile.current?.tools ?? [])[0]?.clientId ?? undefined;
							}}><IconTrash /></TwostepButton
						>
					</Toggle>
				{/each}
			</ScrollArea>
		</Item.Content>
	</Item.Root>

	{#if selectedTool !== undefined}
		<ToolInput id={selectedTool} />
	{/if}
</section>
