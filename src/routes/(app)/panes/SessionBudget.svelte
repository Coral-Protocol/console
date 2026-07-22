<script lang="ts">
	import * as ToggleGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';
	import { TooltipLabel } from '@coral-os/component-library';
	import CurrencyInput from '../options/CurrencyInput.svelte';

	import { activeFile } from '$lib/activeFile.svelte';

	type ExhaustionType = 'kill_agent' | 'kill_session' | 'ignore';

	let minimumStored = $state(0);

	const budgetSettings = $derived(activeFile.current?.budgetSettings);
	const exhaustionBehavior = $derived(budgetSettings?.exhaustionBehavior);
	const isWarnOnly = $derived(exhaustionBehavior?.type === 'ignore');

	const buildExhaustionBehavior = (type: ExhaustionType, minimum = 0, force = true) => {
		switch (type) {
			case 'kill_agent':
				return { type, force, minimum } as const;
			case 'kill_session':
				return { type, minimum } as const;
			case 'ignore':
				return { type } as const;
		}
	};

	function setBehavior(behavior: any) {
		if (!activeFile.current?.budgetSettings) return;
		activeFile.updateBudgetSettings({
			exhaustionBehavior: behavior
		});
	}

	function getMinimum() {
		if (!exhaustionBehavior) return 0;
		if (exhaustionBehavior.type === 'ignore') return minimumStored ?? 0;
		return exhaustionBehavior.minimum;
	}

	function setBudget(micro: number) {
		if (!activeFile.current?.budgetSettings) return;
		activeFile.updateBudgetSettings({
			budget: micro
		});
	}

	const exhaustionOptions = [
		{
			value: 'kill_agent',
			label: 'Kill Agent',
			onclick: () => setBehavior(buildExhaustionBehavior('kill_agent', getMinimum(), false)),
			tooltip:
				'Once the session budget drops below the specified minimum, agents that claim for it will be killed. The higher the minimum is the lower the chance of overclaiming.'
		},
		{
			value: 'kill_session',
			label: 'Kill Session',
			onclick: () => setBehavior(buildExhaustionBehavior('kill_session', getMinimum())),
			tooltip:
				'Once the session budget drops below the specified minimum, agents that claim for it will trigger the session to be killed. The higher the minimum is the lower the chance of overclaiming.'
		},
		{
			value: 'ignore',
			label: 'Ignore',
			onclick: () => {
				minimumStored = getMinimum();
				setBehavior(buildExhaustionBehavior('ignore'));
			},
			tooltip:
				'Once the session budget is exhausted and claimed from, a warning will be produced. This behavior has a high risk of overclaiming.'
		}
	] as const;
</script>

{#if activeFile.current && budgetSettings}
	<section class="flex flex-col gap-2">


		<div class="flex items-center gap-2">
			<TooltipLabel
				title="Session budget"
				tooltip="This budget is shared across all agents in the session and can be used by any agent configured to consume the shared budget."
				extra={{ required: true, type: 'integer' }}
				class="max-w-1/4 min-w-1/4"
			>
				Session budget
			</TooltipLabel>
			<CurrencyInput value={budgetSettings.budget ?? 0} onchange={setBudget} />
		</div>

		<div class="flex w-full items-center gap-2">
			<TooltipLabel
				title="Exhaustion Behavior"
				tooltip="What happens once the budget has been drained"
				extra={{ required: true }}
				class="max-w-1/4 min-w-1/4"
			>
				Exhaustion Behavior
			</TooltipLabel>
			<ToggleGroup.Root
				type="single"
				class="w-full grow"
				variant="outline"
				value={exhaustionBehavior?.type}
				onValueChange={(v: any) => {
					if (!v) return;
					const force =
						exhaustionBehavior?.type === 'kill_agent' ? exhaustionBehavior.force : false;
					setBehavior(buildExhaustionBehavior(v as ExhaustionType, getMinimum(), force));
				}}
			>
				{#each exhaustionOptions as opt (opt.value)}
					<Tooltip.Root delayDuration={400}>
						<Tooltip.Trigger>
							{#snippet child({ props }: { props: any })}
								<ToggleGroup.Item
									{...props}
									onclick={opt.onclick}
									class={exhaustionBehavior?.type === opt.value ? 'bg-accent' : ''}
								>
									{opt.label}
								</ToggleGroup.Item>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word">
							<p>{opt.tooltip}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/each}
			</ToggleGroup.Root>
		</div>

		{#if exhaustionBehavior?.type === 'kill_agent'}
			<div class="flex w-full items-center gap-2">
				<TooltipLabel
					title="Force kill agent"
					tooltip="When the session budget is below the minimum and an agent attempts to claim from the session budget, the agent will be killed immediately. If this is false, the agent will only be killed if the agent requests for automatic closing."
					extra={{ required: true, type: 'boolean' }}
					class="max-w-1/4 min-w-1/4"
				>
					Force kill agent
				</TooltipLabel>
				<ToggleGroup.Root
					type="single"
					class="w-full grow"
					variant="outline"
					value={String(exhaustionBehavior.force)}
					onValueChange={async (v: string) => {
						if (exhaustionBehavior?.type !== 'kill_agent') return;

						exhaustionBehavior.force = v === 'true';
						activeFile.updateBudgetSettings({
							exhaustionBehavior: {
								...exhaustionBehavior
							}
						});
					}}
				>
					<ToggleGroup.Item value="true">True</ToggleGroup.Item>
					<ToggleGroup.Item value="false">False</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>
		{/if}

		{#if exhaustionBehavior && exhaustionBehavior.type !== 'ignore'}
			<div class="flex items-center gap-2">
				<TooltipLabel
					title="Minimum threshold"
					tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming."
					extra={{ required: true, type: 'integer' }}
					class="max-w-1/4 min-w-1/4"
				>
					Minimum
				</TooltipLabel>
				<CurrencyInput
					value={exhaustionBehavior.minimum ?? 0}
					disabled={isWarnOnly}
					onchange={async (micro) => {
						if (
							exhaustionBehavior?.type === 'kill_agent' ||
							exhaustionBehavior?.type === 'kill_session'
						) {
							exhaustionBehavior.minimum = micro;
							activeFile.updateBudgetSettings({
								exhaustionBehavior: {
									...exhaustionBehavior
								}
							});
						}
					}}
				/>
			</div>
		{/if}

		<!-- <Alert.Root class="text-left">
			<IconInfo />
			<Alert.Title>Output</Alert.Title>
			<Alert.Description>
				<p>
					{#if exhaustionBehavior?.type === 'ignore'}
						When the session budget of
						<span class="font-semibold">${(budgetSettings.budget ?? 0) / 100000000}</span>
						has been consumed, a <span class="font-semibold">warning</span> will be generated.
					{:else if exhaustionBehavior?.type === 'kill_session'}
						When the session budget of
						<span class="font-semibold">${(budgetSettings.budget ?? 0) / 100000000}</span>
						drops below
						<span class="font-semibold">${exhaustionBehavior.minimum / 100000000}</span>, the entire
						<span class="font-semibold">session</span>
						will be
						<span class="font-semibold">terminated</span>.
					{:else if exhaustionBehavior?.type === 'kill_agent'}
						When the session budget of
						<span class="font-semibold">${(budgetSettings.budget ?? 0) / 100000000}</span>
						is less than or equal to
						<span class="font-semibold">${exhaustionBehavior.minimum / 100000000}</span>, any
						<span class="font-semibold">agent</span> requesting budget will be
						<span class="font-semibold">killed</span>
						{#if exhaustionBehavior.force}
							<span class="font-semibold">immediately</span>.
						{:else}
							if the claim requested for automatic closing.
						{/if}
					{/if}
				</p>
			</Alert.Description>
		</Alert.Root> -->
	</section>
{/if}
