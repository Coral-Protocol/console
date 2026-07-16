<script lang="ts">
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as ToggleGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { TooltipLabel } from '@coral-os/component-library';
	import CurrencyInput from '../options/CurrencyInput.svelte';

	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { activeFile } from '$lib/activeFile.svelte';
	import type { Agent } from '$lib/fileStorage.svelte';

	let sessCtx = getSessionContext();

	const sessionAgentObject = $derived(
		sessCtx.selectedAgentClientId !== null
			? activeFile.current?.agents.find((agent) => agent.clientId === sessCtx.selectedAgentClientId)
			: undefined
	);

	const budgetSettings = $derived(sessionAgentObject?.budgetSettings);
	const exhaustionBehavior = $derived(budgetSettings?.exhaustionBehavior);

	function patchBudgetSettings(patch: Partial<NonNullable<Agent['budgetSettings']>>) {
		const clientId = sessCtx.selectedAgentClientId;
		if (!clientId || !sessionAgentObject) return;
		activeFile.updateAgent(clientId, {
			budgetSettings: {
				...sessionAgentObject.budgetSettings,
				...patch
			}
		});
	}

	function setBudget(micro: number) {
		if (micro === 0) {
			const clientId = sessCtx.selectedAgentClientId;
			if (!clientId || !sessionAgentObject) return;
			const next = { ...sessionAgentObject.budgetSettings };
			delete next.budget;
			activeFile.updateAgent(clientId, { budgetSettings: next });
		} else {
			patchBudgetSettings({ budget: micro });
		}
	}

	function setExhaustionType(type: 'kill' | 'consume_session') {
		if (type === 'kill') {
			patchBudgetSettings({
				exhaustionBehavior: { type: 'kill', minimum: 0, force: false }
			});
		} else {
			patchBudgetSettings({
				exhaustionBehavior: { type: 'consume_session' }
			});
		}
	}

	function setForce(force: boolean) {
		patchBudgetSettings({
			exhaustionBehavior: {
				type: 'kill',
				force,
				minimum: exhaustionBehavior?.type === 'kill' ? exhaustionBehavior.minimum : 0
			}
		});
	}

	function setMinimum(micro: number) {
		if (exhaustionBehavior?.type !== 'kill') return;
		patchBudgetSettings({
			exhaustionBehavior: { ...exhaustionBehavior, minimum: micro }
		});
	}
</script>

<div class="flex items-center gap-2 py-2">
	<TooltipLabel
		title="Agent budget"
		tooltip="This budget is shared across all agents in the session and can be used by any agent configured to consume the shared budget."
		extra={{ type: 'integer' }}
		class="max-w-1/4 min-w-1/4"
	>
		<div class="flex flex-col">
			<span class="truncate wrap-break-word">Agent budget</span>
			<span class="text-muted-foreground truncate text-xs">
				This budget is shared across all agents in the session and can be used by any agent
				configured to consume the shared budget.
			</span>
		</div>
	</TooltipLabel>

	<CurrencyInput value={budgetSettings?.budget ?? 0} onchange={setBudget} />
</div>

<Separator class="mb-2" />

<div class="flex w-full items-center gap-2">
	<TooltipLabel
		title="Exhaustion Behavior"
		tooltip="What happens once the budget has been drained"
		extra={{}}
		class="max-w-1/4 min-w-1/4"
	>
		<div class="flex flex-col">
			<span class="truncate wrap-break-word">Exhaustion Behavior</span>
			<span class="text-muted-foreground truncate text-xs">
				What happens once the budget has been drained
			</span>
		</div>
	</TooltipLabel>

	<ToggleGroup.Root
		type="single"
		class="w-full grow"
		variant="outline"
		value={exhaustionBehavior?.type}
	>
		<Tooltip.Root delayDuration={400}>
			<Tooltip.Trigger>
				{#snippet child({ props }: { props: any })}
					<ToggleGroup.Item
						{...props}
						onclick={() => setExhaustionType('kill')}
						class={exhaustionBehavior?.type === 'kill' ? 'bg-accent' : ''}
					>
						Kill
					</ToggleGroup.Item>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word">
				<p>
					Once the agent's budget is less than the specified minimum amount, the agent will be
					killed. The higher the minimum is the lower the chance of overclaiming. This behavior will
					stop the agent claiming from the session's budget
				</p>
			</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root delayDuration={400}>
			<Tooltip.Trigger>
				{#snippet child({ props }: { props: any })}
					<ToggleGroup.Item
						{...props}
						onclick={() => setExhaustionType('consume_session')}
						class={exhaustionBehavior?.type === 'consume_session' ? 'bg-accent' : ''}
					>
						Consume session
					</ToggleGroup.Item>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word">
				<p>
					Once the agent's budget is exhausted, it will consume the session's budget. If the
					session's budget is also exhausted, the session's exhaustion behavior will be applied. If
					a claim is made that cannot be fully fulfilled by the agent's budget, the remainder will
					be taken from the session's budget.
				</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</ToggleGroup.Root>
</div>

{#if exhaustionBehavior?.type === 'kill'}
	<Separator class="my-2" />

	<div class="flex w-full items-center gap-2">
		<TooltipLabel
			title="Force kill agent"
			tooltip="If this is true, the agent will be killed immediately. If this is false, the agent will only be killed if the claim requests for automatic closing."
			extra={{ required: true, type: 'boolean' }}
			class="max-w-1/4 min-w-1/4"
		>
			<div class="flex flex-col">
				<span class="truncate wrap-break-word">Force kill agent</span>
				<span class="text-muted-foreground truncate text-xs">
					If this is true, the agent will be killed immediately. If this is false, the agent will
					only be killed if the claim requests for automatic closing
				</span>
			</div>
		</TooltipLabel>

		<ToggleGroup.Root
			type="single"
			class="w-full grow"
			variant="outline"
			value={String(exhaustionBehavior.force)}
			onValueChange={(v: string) => {
				if (!v) return;
				setForce(v === 'true');
			}}
		>
			<ToggleGroup.Item value="true">True</ToggleGroup.Item>
			<ToggleGroup.Item value="false">False</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<Separator class="my-2" />

	<div class="flex items-center gap-2">
		<TooltipLabel
			title="Minimum threshold"
			tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming."
			extra={{ required: true, type: 'integer' }}
			class="max-w-1/4 min-w-1/4"
		>
			<div class="flex flex-col">
				<span class="truncate wrap-break-word">Minimum</span>
				<span class="text-muted-foreground truncate text-xs">
					If the session budget drops below this, it will trigger the exhaustion behavior. This is
					used to prevent overclaiming
				</span>
			</div>
		</TooltipLabel>

		<CurrencyInput value={exhaustionBehavior.minimum ?? 0} onchange={setMinimum} />
	</div>
{/if}
