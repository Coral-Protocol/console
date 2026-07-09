<!-- <script lang="ts">
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';

	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';

	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';
	import * as ToggleGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';
	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import * as Card from '@coral-os/component-library/components/ui/card/index.js';
	import * as Accordion from '@coral-os/component-library/components/ui/accordion/index.js';

	import * as Label from '@coral-os/component-library/ui/label/index.js';

	import CurrencyInput from '../options/CurrencyInput.svelte';

	import { Context } from 'runed';

	import { TooltipLabel, TwostepButton } from '@coral-os/component-library';

	import { randomAdjective, randomAnimal } from '$lib/words';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { cn } from '$lib/utils';

	let ctx = getSessionContext();

	let form = $derived(ctx?.form as any);
	let errors = $derived(ctx?.errors as any);

	function formatMsToHHMMSS(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
	}

	let minimumStored = $state(0);

	const buildExhaustionBehavior = (
		type: 'kill_agent' | 'kill_session' | 'ignore',
		minimum = 0,
		force = true
	) => {
		switch (type) {
			case 'kill_agent':
				return { type, force, minimum } as const;
			case 'kill_session':
				return { type, minimum } as const;
			case 'ignore':
				return { type } as const;
		}
	};

	const setBehavior = (behavior: any) => {
		if (!$formData) return;
		$formData.sessionBudgetSettings.exhaustionBehavior = behavior;
	};

	const getMinimum = () => {
		if (!$formData) return 0;
		if ($formData.sessionBudgetSettings.exhaustionBehavior.type === 'ignore')
			return minimumStored ?? 0;
		return $formData.sessionBudgetSettings.exhaustionBehavior.minimum;
	};

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
				(minimumStored = getMinimum()), setBehavior(buildExhaustionBehavior('ignore'));
			},
			tooltip:
				'Once the session budget is exhausted and claimed from, a warning will be produced. This behavior has a high risk of overclaiming.'
		}
	] as const;

	const MICRODOLLARS_PER_DOLLAR = 100_000_000;

	const toDollars = (micro: number) => micro / MICRODOLLARS_PER_DOLLAR;
	const toMicro = (dollars: number) => Math.round(dollars * MICRODOLLARS_PER_DOLLAR);

	const isWarnOnly = $derived($formData.sessionBudgetSettings.exhaustionBehavior.type === 'ignore');
</script>

{#if ctx && $formData}
	<section class="flex h-full min-h-0 grow flex-col gap-2 overflow-y-auto px-4">
		<p>
			The Session Budget is a shared pool of funds used across all agents in the session. Agents
			with their own budget settings will not take from this balance unless configured to do so.
		</p>
		<Form.ElementField {form} name="sessionBudgetSettings.budget" class="flex items-center gap-2 ">
			<Form.Control>
				{#snippet children({ props })}
					<TooltipLabel
						title="Session budget"
						tooltip="This budget is shared across all agents in the session and can be used by any agent configured to consume the shared budget."
						extra={{
							required: true,
							type: 'integer'
						}}
						class="max-w-1/4 min-w-1/4  "
					>
						Session budget
					</TooltipLabel>
					<CurrencyInput
						value={$formData.sessionBudgetSettings.budget ?? 0}
						onchange={(micro) => {
							$formData.sessionBudgetSettings.budget = micro;
						}}
					/>
				{/snippet}
			</Form.Control>
		</Form.ElementField>
		<Form.ElementField
			{form}
			name="sessionBudgetSettings.exhaustionBehavior"
			class="flex w-full items-center gap-2 "
		>
			<Form.Control>
				{#snippet children()}
					<TooltipLabel
						title="Exhaustion Behavior"
						tooltip="What happens once the budget has been drained"
						extra={{
							required: true
						}}
						class="max-w-1/4 min-w-1/4"
					>
						Exhaustion Behavior
					</TooltipLabel>
					<ToggleGroup.Root
						type="single"
						class="w-full grow"
						variant="outline"
						value={$formData.sessionBudgetSettings.exhaustionBehavior.type}
						onValueChange={(v: any) => {
							if (!v) return;

							const current = $formData.sessionBudgetSettings.exhaustionBehavior;

							const force = current.type === 'kill_agent' ? current.force : false;

							setBehavior(
								buildExhaustionBehavior(
									v as 'kill_agent' | 'kill_session' | 'ignore',
									getMinimum(),
									force
								)
							);
						}}
					>
						{#each exhaustionOptions as opt (opt.value)}
							<Tooltip.Root delayDuration={400}>
								<Tooltip.Trigger>
									{#snippet child({ props }: { props: any })}
										<ToggleGroup.Item
											{...props}
											onclick={opt.onclick}
											class={$formData.sessionBudgetSettings.exhaustionBehavior.type === opt.value
												? 'bg-accent'
												: ''}
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
				{/snippet}
			</Form.Control>
		</Form.ElementField>

		{#if $formData.sessionBudgetSettings.exhaustionBehavior.type === 'kill_agent'}
			<Form.ElementField
				{form}
				name="sessionBudgetSettings.exhaustionBehavior.force"
				class="flex w-full items-center gap-2 "
			>
				<Form.Control>
					{#snippet children({ props })}
						<TooltipLabel
							title="Force kill agent"
							tooltip="When the session budget is below the minimum and an agent attempts to claim from the session budget, the agent will be killed immediately. If this is false, the agent will only be killed if the agent requests for automatic closing."
							extra={{
								required: true,
								type: 'boolean'
							}}
							class="max-w-1/4 min-w-1/4 "
						>
							Force kill agent
						</TooltipLabel>
						<ToggleGroup.Root
							type="single"
							class="w-full grow"
							variant="outline"
							value={$formData.sessionBudgetSettings.exhaustionBehavior.type === 'kill_agent'
								? String($formData.sessionBudgetSettings.exhaustionBehavior.force)
								: 'false'}
							onValueChange={(v: string) => {
								if (v && $formData.sessionBudgetSettings.exhaustionBehavior.type === 'kill_agent') {
									$formData.sessionBudgetSettings.exhaustionBehavior.force = v === 'true';
								}
							}}
						>
							<ToggleGroup.Item value="true">True</ToggleGroup.Item>

							<ToggleGroup.Item value="false">False</ToggleGroup.Item>
						</ToggleGroup.Root>
					{/snippet}
				</Form.Control>
			</Form.ElementField>
		{/if}
		{#if $formData.sessionBudgetSettings.exhaustionBehavior.type !== 'ignore'}
			<Form.ElementField
				{form}
				name="sessionBudgetSettings.exhaustionBehavior.minimum"
				class="flex items-center gap-2 "
			>
				<Form.Control>
					{#snippet children({ props })}
						{#if $formData.sessionBudgetSettings.exhaustionBehavior.type !== 'ignore'}
							<TooltipLabel
								title="Minimum threshold"
								tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming."
								extra={{
									required: true,
									type: 'integer'
								}}
								class="max-w-1/4 min-w-1/4 "
							>
								Minimum
							</TooltipLabel>
							<CurrencyInput
								value={$formData.sessionBudgetSettings.exhaustionBehavior.minimum ?? 0}
								disabled={isWarnOnly}
								onchange={(micro) => {
									if ($formData.sessionBudgetSettings.exhaustionBehavior.type !== 'ignore') {
										$formData.sessionBudgetSettings.exhaustionBehavior.minimum = micro;
									}
								}}
							/>
						{/if}
					{/snippet}
				</Form.Control>
			</Form.ElementField>
		{/if}

		<Alert.Root class="text-left">
			<IconInfo />
			<Alert.Title>Output</Alert.Title>
			<Alert.Description>
				<p>
					{#if $formData.sessionBudgetSettings.exhaustionBehavior.type === 'ignore'}
						When the session budget of
						<span class="font-semibold">
							${$formData.sessionBudgetSettings.budget / 100000000}
						</span>
						has been consumed, a
						<span class="font-semibold">warning</span>
						will be generated.
					{:else if $formData.sessionBudgetSettings.exhaustionBehavior.type === 'kill_session'}
						When the session budget of
						<span class="font-semibold">
							${$formData.sessionBudgetSettings.budget / 100000000}
						</span>
						drops below
						<span class="font-semibold">
							${$formData.sessionBudgetSettings.exhaustionBehavior.minimum / 100000000}
						</span>, the entire
						<span class="font-semibold">session</span>
						will be
						<span class="font-semibold">terminated</span>.
					{:else if $formData.sessionBudgetSettings.exhaustionBehavior.type === 'kill_agent'}
						When the session budget of
						<span class="font-semibold">
							${$formData.sessionBudgetSettings.budget / 100000000}
						</span>
						is less than or equal to
						<span class="font-semibold">
							${$formData.sessionBudgetSettings.exhaustionBehavior.minimum / 100000000}
						</span>, any
						<span class="font-semibold">agent</span>
						requesting budget will be
						<span class="font-semibold">killed</span>
						{#if $formData.sessionBudgetSettings.exhaustionBehavior.force}
							<span class="font-semibold">immediately</span>.
						{:else}
							if the claim requested for automatic closing.
						{/if}
					{/if}
				</p>
			</Alert.Description>
		</Alert.Root>
	</section>
{/if} -->
