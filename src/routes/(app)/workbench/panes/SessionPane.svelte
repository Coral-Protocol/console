<script lang="ts">
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';

	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';
	import * as ToggleGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import * as ButtonGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';
	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import * as Card from '@coral-os/component-library/components/ui/card/index.js';

	import { Context } from 'runed';

	import { TooltipLabel, TwostepButton } from '@coral-os/component-library';

	import { randomAdjective, randomAnimal } from '$lib/words';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { cn } from '$lib/utils';

	let ctx = $derived.by(() => {
		try {
			return getSessionContext();
		} catch {
			return null; // render nothing or a skeleton during HMR gap
		}
	});

	let form = $derived(ctx?.form);
	let errors = $derived(ctx?.errors);
	let formData = $derived(ctx?.formData);

	function formatMsToHHMMSS(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
	}

	let minimumStored = $state(0);

	const buildExhaustionBehavior = (
		type: 'kill_agent' | 'kill_session' | 'warn',
		minimum = 0,
		force = true
	) => {
		switch (type) {
			case 'kill_agent':
				return { type, force, minimum } as const;
			case 'kill_session':
				return { type, minimum } as const;
			case 'warn':
				return { type } as const;
		}
	};

	const setBehavior = (behavior: any) => {
		if (!$formData) return;
		$formData.sessionBudgetSettings.exhaustionBehavior = behavior;
	};

	const getMinimum = () => {
		if (!$formData) return 0;
		if ($formData.sessionBudgetSettings.exhaustionBehavior.type === 'warn')
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
			value: 'warn',
			label: 'Send Warning',
			onclick: () => {
				(minimumStored = getMinimum()), setBehavior(buildExhaustionBehavior('warn'));
			},
			tooltip:
				'Once the session budget is exhausted and claimed from, a warning will be produced. This behavior has a high risk of overclaiming.'
		}
	] as const;

	const agentBudgetBuilder = (
		agent: string,
		type: 'kill_agent' | 'consume_session',
		minimum = 0,
		force = true
	) => {
		switch (type) {
			case 'kill_agent':
				return { type, force, minimum } as const;
			case 'consume_session':
				return { type } as const;
		}
	};

	const agentBudgetDraft = $state({
		agent: 'default',
		type: '',
		minimum: 0,
		force: false
	});

	const agentBudgets = [];
</script>

{#if ctx && $formData}
	<section class="flex h-full min-h-0 grow flex-col overflow-y-auto p-4">
		<ol
			class="flex h-full min-h-0 grow flex-col gap-4 [&_li]:flex [&_li]:flex-col [&_li]:gap-2 [&_li]:border-b [&_li]:pb-4"
		>
			<li>
				<h1 class="font-semibold">Session</h1>

				<Form.ElementField
					{form}
					name="sessionRuntimeSettings.ttl"
					class="flex items-center gap-2 "
				>
					<Form.Control>
						{#snippet children({ props })}
							<TooltipLabel
								title="Time to live (TTL)"
								tooltip="Measured in milliseconds, the time to live is the maximum duration the session can last"
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
						Maximum session duration: {formatMsToHHMMSS(
							$formData.sessionRuntimeSettings.ttl ?? 0
						) ?? 'HH:MM:SS'}
					</TooltipLabel>

					<!--		Todo: Show only when some agents actually have a cost, and show only based on their actual time-based cost-->
					<!--		<TooltipLabel-->
					<!--			tooltip="Maximum cost of the session, calculated by number of agents, per minute."-->
					<!--			class="max-w-fit"-->
					<!--		>-->
					<!--			Maximum cost of session: {usdFormatter.format((maxCostEstimate ?? 0) / 10000)}-->
					<!--		</TooltipLabel>-->
				</span>
				{#if $errors?.sessionRuntimeSettings?.ttl && JSON.stringify($errors.sessionRuntimeSettings?.ttl) !== '{}' && JSON.stringify($errors.sessionRuntimeSettings?.ttl) !== '{}'}
					<span class="text-xs">
						{$errors?.sessionRuntimeSettings?.ttl}
					</span>
				{/if}
			</li>
			<li>
				<h1 class="font-semibold">Budget</h1>

				<!-- TODO: later all of this should use the same input field components that the optionfield comp uses -->
				<p>
					The budget is a shared pool of funds used across all agents in the session. Agents with
					their own budget settings will not take from this balance unless configured to do so.
				</p>
				<Form.ElementField
					{form}
					name="sessionBudgetSettings.budget"
					class="flex items-center gap-2 **:h-full **:content-center "
				>
					<!-- TODO: fix the wild tailwind above -->
					<Form.Control>
						{#snippet children({ props })}
							<TooltipLabel
								title="Session budget"
								tooltip="This budget is shared across all agents in the session and can be used by any agent configured to consume the shared budget."
								extra={{
									required: true,
									type: 'integer'
								}}
								class="max-w-1/4 min-w-1/4 "
							>
								Session budget
							</TooltipLabel>
							<Input
								{...props}
								bind:value={$formData.sessionBudgetSettings.budget}
								placeholder="amount in microcents"
								maxlength={15778476000}
								type="number"
								class="grow"
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
								tooltip="The behavior for agents consuming from this budget after it has been exhausted.  Note that this behavior only applies to agents that consume from the session budgets. Agents that have their own budget will first perform behaviors described by the agent's own budget settings."
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
											v as 'kill_agent' | 'kill_session' | 'warn',
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
													class={$formData.sessionBudgetSettings.exhaustionBehavior.type ===
													opt.value
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
								<ButtonGroup.Root {...props} class="m-0 justify-start">
									<Button
										class={cn(
											$formData.sessionBudgetSettings.exhaustionBehavior.force !== true &&
												'bg-accent text-accent-foreground'
										)}
										onclick={() => {
											$formData.sessionBudgetSettings.exhaustionBehavior.force = true;
										}}>True</Button
									>
									<Button
										class={cn(
											$formData.sessionBudgetSettings.exhaustionBehavior.force !== false
												? 'bg-accent text-accent-foreground'
												: ''
										)}
										onclick={() => {
											$formData.sessionBudgetSettings.exhaustionBehavior.force = false;
										}}>False</Button
									>
								</ButtonGroup.Root>
							{/snippet}
						</Form.Control>
					</Form.ElementField>
				{/if}
				{#if $formData.sessionBudgetSettings.exhaustionBehavior.type !== 'warn'}
					<Form.ElementField
						{form}
						name="sessionBudgetSettings.exhaustionBehavior.minimum"
						class="flex items-center gap-2 "
					>
						<Form.Control>
							{#snippet children({ props })}
								<TooltipLabel
									title="Minimum threshold"
									tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming. Disabled if exhaustion type is 'warn'."
									extra={{
										required: $formData.sessionBudgetSettings.exhaustionBehavior.type !== 'warn',
										type: 'integer'
									}}
									class="max-w-1/4 min-w-1/4 "
								>
									Minimum
								</TooltipLabel>
								<Input
									{...props}
									bind:value={$formData.sessionBudgetSettings.exhaustionBehavior.minimum}
									placeholder="amount in microcents"
									maxlength={$formData.sessionBudgetSettings.budget || 15778476000}
									type="number"
									class="grow"
								/>
							{/snippet}
						</Form.Control>
					</Form.ElementField>
				{/if}

				<Alert.Root class="text-left">
					<IconInfo />
					<Alert.Title>Output</Alert.Title>
					<Alert.Description>
						<p>
							{#if $formData.sessionBudgetSettings.exhaustionBehavior.type === 'warn'}
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
								drops below
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

				<h1 class="font-semibold">Agent budgets</h1>

				<Card.Root>
					<Card.Header>
						<Card.Title>Agent budget builder</Card.Title>
						<Card.Description>Specify additional funding for specific agents</Card.Description>
					</Card.Header>
					<Card.Content>
						the agent
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>{agentBudgetDraft.agent}</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								{#each $formData.agents as agent}
									<DropdownMenu.Item onclick={() => (agentBudgetDraft.agent = agent.id.name)}
										>{agent.id.name}</DropdownMenu.Item
									>
								{:else}
									No agents in session
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
						has a budget of
						<Form.ElementField
							{form}
							name="sessionBudgetSettings.exhaustionBehavior.minimum"
							class="flex items-center gap-2 "
						>
							<Form.Control>
								{#snippet children({ props })}
									<!-- <TooltipLabel
									title="Minimum threshold"
									tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming. Disabled if exhaustion type is 'warn'."
									extra={{
										required: $formData.sessionBudgetSettings.exhaustionBehavior.type !== 'warn',
										type: 'integer'
									}}
									class="max-w-1/4 min-w-1/4 "
								>
									Minimum
								</TooltipLabel> -->
									<Input
										{...props}
										bind:value={$formData.sessionBudgetSettings.exhaustionBehavior.minimum}
										placeholder="amount in microcents"
										maxlength={$formData.sessionBudgetSettings.budget || 15778476000}
										type="number"
										class="grow"
									/>
								{/snippet}
							</Form.Control>
						</Form.ElementField>

						when budget reaches

						<Form.ElementField
							{form}
							name="sessionBudgetSettings.exhaustionBehavior.minimum"
							class="flex items-center gap-2 "
						>
							<Form.Control>
								{#snippet children({ props })}
									<!-- <TooltipLabel
									title="Minimum threshold"
									tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming. Disabled if exhaustion type is 'warn'."
									extra={{
										required: $formData.sessionBudgetSettings.exhaustionBehavior.type !== 'warn',
										type: 'integer'
									}}
									class="max-w-1/4 min-w-1/4 "
								>
									Minimum
								</TooltipLabel> -->
									<Input
										{...props}
										bind:value={$formData.sessionBudgetSettings.exhaustionBehavior.minimum}
										placeholder="amount in microcents"
										maxlength={$formData.sessionBudgetSettings.budget || 15778476000}
										type="number"
										class="grow"
									/>
								{/snippet}
							</Form.Control>
						</Form.ElementField>

						do:
						<ToggleGroup.Root type="single" size="sm" value="kill" class="grow">
							<ToggleGroup.Item value="kill" aria-label="Toggle bold">Kill</ToggleGroup.Item>
							<ToggleGroup.Item value="kill" aria-label="Toggle bold">Force</ToggleGroup.Item>
							<ToggleGroup.Item value="session" aria-label="Toggle italic"
								>Consume session</ToggleGroup.Item
							>
						</ToggleGroup.Root>
					</Card.Content>
					<Card.Footer>
						<Button>Create Budget</Button>
						<Button variant="secondary">Clear</Button>
					</Card.Footer>
				</Card.Root>

				Budgets:
				{#each agentBudgets as item}
					hello
				{/each}
			</li>
		</ol>
	</section>
{/if}
