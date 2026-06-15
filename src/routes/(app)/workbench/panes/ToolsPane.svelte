<script lang="ts">
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';

	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';

	import { TooltipLabel, TwostepButton } from '@coral-os/component-library';

	import ToolInput from './ToolInput.svelte';

	import { randomAdjective, randomAnimal } from '$lib/words';
	import { getSessionContext } from '$lib/sessionCreatorContext';

	let ctx = getSessionContext();
	let form = $derived(ctx.form);
	let errors = $derived(ctx.errors);
	let formData = $derived(ctx.formData);

	function formatMsToHHMMSS(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
	}

	// Todo: Show only when some agents actually have a cost, and show only based on their actual time-based cost

	// const usdFormatter = new Intl.NumberFormat('en-US', {
	// 	style: 'currency',
	// 	currency: 'USD',
	// 	minimumFractionDigits: 2,
	// 	maximumFractionDigits: 2
	// });

	// const maxCostEstimate = $derived(
	// 	(($formData.sessionRuntimeSettings.ttl ?? 0) * $formData.agents.length * 10) / 60000
	// );

	let selectedTool: string | null = $state(null);
</script>

<header class="flex w-full flex-col gap-4 border-b p-4">
	<p class="text-sm">Custom tools</p>
	<Button
		onclick={() => {
			const id = crypto.randomUUID() as string;
			($formData.tools[id] = {
				id,
				name: `${randomAdjective()}-${randomAnimal()}`,
				transport: { type: 'http', url: '' },
				inputSchema: {},
				outputSchema: {}
			}),
				(selectedTool = id);
		}}>+</Button
	>
</header>
<section class="flex flex-col gap-4 px-4 pt-4">
	<Item.Root variant="outline" class="p-2">
		<Item.Content>
			<ScrollArea class="max-h-60 overflow-scroll">
				{#if Object.keys($formData.tools).length == 0}
					<p class="text-muted-foreground flex h-9 w-full place-items-center justify-center">
						No tools have been created.
					</p>
				{/if}
				{#each Object.values($formData.tools) as tool (tool.id)}
					<Toggle
						class="flex w-full justify-start pr-0"
						bind:pressed={() => selectedTool === tool.id, () => (selectedTool = tool.id)}
					>
						<p class="grow text-left">{tool.name}</p>
						<TwostepButton
							class="size-9"
							variant="ghostDestructive"
							onclick={() => {
								delete $formData.tools[tool.id];
								$formData.tools = $formData.tools;
								selectedTool = Object.keys($formData.tools)[0] ?? null;
							}}><IconTrash /></TwostepButton
						>
					</Toggle>
				{/each}
			</ScrollArea>
		</Item.Content>
	</Item.Root>

	{#if selectedTool !== null}
		<ToolInput superform={form} id={selectedTool} />
	{/if}
</section>
