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
	import { createSessionContext } from '../+page.svelte';

	let ctx = createSessionContext.get();
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

	const usdFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const maxCostEstimate = $derived(
		(($formData.sessionRuntimeSettings.ttl ?? 0) * $formData.agents.length * 10) / 60000
	);

	let selectedTool: string | null = $state(null);
</script>

<section class="flex flex-col gap-4 px-4">
	<h1 class="font-semibold">Session settings</h1>

	<Form.ElementField {form} name="sessionRuntimeSettings.ttl" class="flex items-center gap-2 ">
		<Form.Control>
			{#snippet children({ props })}
				<TooltipLabel
					title="Time to live (TTL)"
					tooltip="Measured in milliseconds, the time to live is the maximum duration a session can last"
					extra={{
						required: true,
						type: 'number'
					}}
					class="max-w-1/4 min-w-1/4"
				>
					Time to live
				</TooltipLabel>
				<Input
					{...props}
					bind:value={$formData.sessionRuntimeSettings.ttl}
					placeholder="time in milliseconds"
					maxlength={15778476000}
					type="number"
					class="grow"
				/>
			{/snippet}
		</Form.Control>
	</Form.ElementField>
	<span class="text-muted-foreground flex flex-col justify-between">
		<TooltipLabel tooltip="Based off Session time to live settings" class=" max-w-fit">
			Maximum session duration: {formatMsToHHMMSS($formData.sessionRuntimeSettings.ttl ?? 0) ??
				'HH:MM:SS'}
		</TooltipLabel>

		<TooltipLabel
			tooltip="Maximum cost of the session, calculated by number of agents, per minute."
			class="max-w-fit"
		>
			Maximum cost of session: {usdFormatter.format((maxCostEstimate ?? 0) / 100)}
		</TooltipLabel>
	</span>
	{#if $errors?.sessionRuntimeSettings?.ttl && JSON.stringify($errors.sessionRuntimeSettings?.ttl) !== '{}' && JSON.stringify($errors.sessionRuntimeSettings?.ttl) !== '{}'}
		<span class="text-xs">
			{$errors?.sessionRuntimeSettings?.ttl}
		</span>
	{/if}
</section>
<Separator />
<section class="flex flex-col gap-4 px-4">
	<h1 class="font-semibold">Custom Tools</h1>
	<Button
		onclick={() => {
			const id = crypto.randomUUID() as string;
			($formData.tools[id] = {
				id,
				name: `${randomAdjective()}-${randomAnimal()}`,
				transport: { type: 'http', url: '' },
				schema: {}
			}),
				(selectedTool = id);
		}}>+</Button
	>
	<Item.Root variant="outline" class="p-2">
		<Item.Content>
			<ScrollArea>
				{#if Object.keys($formData.tools).length == 0}
					<p class="text-muted-foreground flex h-9 w-full place-items-center justify-center">
						No tools.
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
