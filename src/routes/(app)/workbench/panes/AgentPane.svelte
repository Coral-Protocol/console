<script lang="ts">
	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Select from '@coral-os/component-library/ui/select/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import AgentPanelIcon from '$lib/icons/agent-panel.svelte';
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';
	import * as ToggleGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';

	import * as Label from '@coral-os/component-library/ui/label/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';

	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';

	import { TooltipLabel, Combobox } from '@coral-os/component-library';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';

	import OptionField from '../OptionField.svelte';

	import { appContext } from '$lib/context';
	import { agentIdOf, registryIdOf } from '$lib/CoralServer.svelte';
	import { onMount, tick } from 'svelte';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';

	import { buttonVariants } from '@coral-os/component-library/components/ui/button/index.js';
	import AgentPicker from '../AgentPicker.svelte';
	import { CarTaxiFrontIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import TemplatePicker from '../TemplatePicker.svelte';
	import { getSessionDataFromTemplateName } from '../templates/TemplateLib';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { cn } from '$lib/utils';
	import CurrencyInput from '../options/CurrencyInput.svelte';

	let appCtx = appContext.get();

	let ctx = getSessionContext();
	let serverCtx = appContext.get();

	let form = $derived(ctx.form);
	let formData = $derived(ctx.formData);

	let curAgent = $derived(
		ctx.selectedAgent !== null ? $formData.agents[ctx.selectedAgent] : undefined
	);
	let curCatalog = $derived(
		curAgent && appCtx.server.catalogs[registryIdOf(curAgent.id.registrySourceId)]
	);

	const loadTemplate = (template: string) => {
		if (template) {
			toast('Loading template...', { duration: 2000 });
			try {
				const templateSessionData = getSessionDataFromTemplateName(template);

				ctx.importSession({
					from: templateSessionData,
					success: 'Template loaded successfully'
				});
			} catch (err) {
				console.error('Failed to load template:', err);
				toast.error('Failed to load template: ' + err);
			}
		}
	};

	const UNGROUPED = '__ungrouped';

	let curAgentId = $derived(curAgent ? agentIdOf(curAgent.id) : null);
	let groupedOptions = $derived.by(() => {
		const metaId = ctx.detailedAgent?.registryAgent?.info?.identifier;
		const currentId = curAgentId;

		if (!metaId || !currentId || agentIdOf(metaId) !== currentId) {
			return {};
		}

		return Object.entries(ctx.detailedAgent?.registryAgent?.options ?? {}).reduce<
			Record<string, [string, any][]>
		>((acc, [name, opt]) => {
			const group = opt?.display?.group ?? UNGROUPED;
			(acc[group] ??= []).push([name, opt]);
			return acc;
		}, {});
	});

	// Type-safe helpers for exhaustion behavior
	function getAgentExhaustionBehavior(agentIdx: number) {
		return $formData.agents[agentIdx]?.budgetSettings?.exhaustionBehavior;
	}

	const agentBehavior = $derived(
		$formData.agents[ctx.selectedAgent!]?.budgetSettings?.exhaustionBehavior
	);
</script>

{#if ctx.selectedAgent !== null && curAgent && curCatalog}
	{#if !ctx.detailedAgent || !ctx.detailedAgent.registryAgent?.info?.identifier || agentIdOf(ctx.detailedAgent.registryAgent.info.identifier) !== agentIdOf(curAgent.id)}
		<Spinner class="m-auto my-8" />
	{:else}
		<header class="flex flex-col gap-2 px-4">
			<Form.ElementField
				{form}
				name="agents[{ctx.selectedAgent}].name"
				class="flex items-center gap-2"
			>
				<Form.Control>
					{#snippet children({ props })}
						<TooltipLabel tooltip={'Name of the agent in this session'} class="m-0 max-w-1/4"
							>Name
						</TooltipLabel>
						<Input {...props} bind:value={$formData.agents[ctx.selectedAgent!]!.name} />
					{/snippet}
				</Form.Control>
			</Form.ElementField>
			<Form.ElementField
				{form}
				name="agents[{ctx.selectedAgent}].description"
				class="flex items-center gap-2"
			>
				<Form.Control>
					{#snippet children({ props })}
						<TooltipLabel
							tooltip={'Optional agent description shared with other agents'}
							class="m-0 max-w-1/4"
							>Description
						</TooltipLabel>
						<Textarea
							{...props}
							class="relative m-0 resize-y"
							bind:value={$formData.agents[ctx.selectedAgent!]!.description}
						/>
					{/snippet}
				</Form.Control>
			</Form.ElementField>
			<Form.ElementField
				{form}
				name="agents[{ctx.selectedAgent}].id.version"
				class="flex items-center gap-2"
			>
				<Form.Control>
					{#snippet children({ props })}
						{@const id = curAgent.id}
						{@const reg = curCatalog.agents[id.name]!}

						<TooltipLabel
							tooltip={'Version to use from the server agent registry'}
							class="w m-0 max-w-1/4 truncate">Version</TooltipLabel
						>
						<Combobox
							{...props}
							class="w-auto grow pr-[2px] "
							side="right"
							align="start"
							disabled={reg.versions.length <= 1}
							bind:selected={() => id.version, () => {}}
							options={[{ items: reg.versions }]}
							searchPlaceholder="Search versions..."
							onValueChange={(value: string) => {
								$formData.agents[ctx.selectedAgent!]!.id.version = value;
								$formData.agents = $formData.agents;
								tick().then(() => {
									$formData.agents = $formData.agents;
								});
							}}
						/>
					{/snippet}
				</Form.Control>
			</Form.ElementField>

			<Form.ElementField
				{form}
				name="agents[{ctx.selectedAgent}].provider.runtime"
				class="flex items-center gap-2"
			>
				<Form.Control>
					{#snippet children({ props })}
						{@const runtime = $formData.agents[ctx.selectedAgent!]!.provider.runtime}
						{@const items = Object.keys(ctx.detailedAgent?.registryAgent?.runtimes ?? {})}
						<TooltipLabel
							tooltip={'Will only show available options for the selected agent type'}
							class="m-0 max-w-1/4">Runtime</TooltipLabel
						>
						<Combobox
							{...props}
							class="w-auto grow pr-[2px]"
							side="right"
							align="start"
							disabled={items.length <= 1}
							options={[
								{
									items
								}
							]}
							searchPlaceholder="Search runtimes..."
							bind:selected={
								() => runtime || Object.keys(ctx.detailedAgent?.registryAgent?.runtimes ?? {})[0],
								() => {}
							}
							onValueChange={(selected: string) => {
								$formData.agents[ctx.selectedAgent!]!.provider.runtime = selected as any;
							}}
						/>
					{/snippet}
				</Form.Control>
			</Form.ElementField>
			<Form.ElementField
				{form}
				name="agents[{ctx.selectedAgent}].provider.runtime"
				class="flex items-center gap-2"
			>
				<Form.Control>
					{#snippet children({ props })}
						{@const tools = $formData.agents[ctx.selectedAgent!]!.customToolAccess}
						<TooltipLabel
							tooltip={'What custom tools this agent has access to.'}
							class="m-0 max-w-1/4">Custom Tools</TooltipLabel
						>
						<Select.Root
							{...props}
							type="multiple"
							value={Array.from(tools.keys())}
							onValueChange={(value) => {
								if (ctx.selectedAgent === null || !$formData.agents[ctx.selectedAgent]) return;
								$formData.agents[ctx.selectedAgent!]!.customToolAccess = new Set(value);
								$formData.agents = $formData.agents;
							}}
						>
							<Select.Trigger class="m-0">
								<span>{tools.size} tools</span>
							</Select.Trigger>
							<Select.Content>
								{#if Object.keys($formData.tools).length == 0}
									<span class="text-muted-foreground h-9 px-2 text-sm italic"
										>No tools found, add some in the tools pane</span
									>
								{/if}
								{#each Object.values($formData.tools) as tool}
									<Select.Item value={tool.id}>{tool.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/snippet}
				</Form.Control>
			</Form.ElementField>
		</header>
		<ol class="border-t">
			<li>
				<Accordion.Root type="multiple" value={['budget']}>
					<Accordion.Item value="budget">
						<Accordion.Trigger variant="compact">Agent budget</Accordion.Trigger>

						<Accordion.Content class="flex flex-col gap-2 p-0">
							{@const agentIdx = ctx.selectedAgent!}
							<Form.ElementField
								{form}
								name="agents[{agentIdx}].budgetSettings.budget"
								class="flex items-center gap-2 "
							>
								<Form.Control>
									{#snippet children({ props })}
										<TooltipLabel
											title="Session budget"
											tooltip="This budget is shared across all agents in the session and can be used by any agent configured to consume the shared budget."
											extra={{
												required: true,
												type: 'integer'
											}}
											class="max-w-1/4 min-w-1/4"
										>
											Agent budget
										</TooltipLabel>

										<CurrencyInput
											value={$formData.agents[agentIdx]?.budgetSettings?.budget ?? 0}
											onchange={(micro) => {
												const agent = $formData.agents[agentIdx];
												if (!agent) return;

												agent.budgetSettings ??= {};

												agent.budgetSettings.budget = micro;

												$formData.agents = $formData.agents;
											}}
										/>
									{/snippet}
								</Form.Control>
							</Form.ElementField>

							<Form.ElementField
								{form}
								name="agents[{agentIdx}].budgetSettings.exhaustionBehavior.type"
								class="flex w-full items-center gap-2 "
							>
								<Form.Control>
									{#snippet children()}
										{@const exhaustionBehavior = getAgentExhaustionBehavior(agentIdx)}
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
											value={exhaustionBehavior?.type}
										>
											<Tooltip.Root delayDuration={400}>
												<Tooltip.Trigger>
													{#snippet child({ props }: { props: any })}
														<ToggleGroup.Item
															{...props}
															onclick={() => {
																if (
																	$formData.agents[agentIdx]!.budgetSettings!.exhaustionBehavior!
																		.type !== 'kill'
																) {
																	$formData.agents[agentIdx]!.budgetSettings!.exhaustionBehavior = {
																		type: 'kill',
																		minimum: 0,
																		force: false
																	};
																}
															}}
															class={exhaustionBehavior?.type === 'kill' ? 'bg-accent' : ''}
														>
															Kill
														</ToggleGroup.Item>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word">
													<p>
														Once the agent's budget is less than the specified minimum amount, the
														agent will be killed. The higher the minimum is the lower the chance of
														overclaiming. This behavior will stop the agent claiming from the
														session's budget
													</p>
												</Tooltip.Content>
											</Tooltip.Root>
											<Tooltip.Root delayDuration={400}>
												<Tooltip.Trigger>
													{#snippet child({ props }: { props: any })}
														<ToggleGroup.Item
															{...props}
															onclick={() => {
																$formData.agents[agentIdx]!.budgetSettings!.exhaustionBehavior = {
																	type: 'consume_session',
																	minimum: 0
																} as any;
															}}
															class={exhaustionBehavior?.type === 'consume_session'
																? 'bg-accent'
																: ''}
														>
															Consume session
														</ToggleGroup.Item>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word">
													<p>
														Once's the agent's budget is exhausted, it will consume the session's
														budget. If the session's budget is also exhausted, the session's
														exhaustion behavior will be applied. If a claim is made that cannot be
														fully fulfilled by the agent's budget, the remainder will be taken from
														the session's budget.
													</p>
												</Tooltip.Content>
											</Tooltip.Root>
										</ToggleGroup.Root>
									{/snippet}
								</Form.Control>
							</Form.ElementField>
							{#if agentBehavior?.type !== 'consume_session' && agentBehavior}
								{@const killBehavior = getAgentExhaustionBehavior(agentIdx)}
								{@const force = killBehavior?.type === 'kill' ? killBehavior.force : false}
								<Form.ElementField
									{form}
									name="agents[{agentIdx}].budgetSettings.exhaustionBehavior.force"
									class="flex w-full items-center gap-2 "
								>
									<Form.Control>
										{#snippet children({ props })}
											<TooltipLabel
												title="Force kill agent"
												tooltip="If this is true, the agent will be killed immediately. If this is false, the agent will only be killed if the claim requests for automatic closing."
												extra={{
													required: true,
													type: 'boolean'
												}}
												class="max-w-1/4 min-w-1/4"
											>
												Force kill agent
											</TooltipLabel>
											<ToggleGroup.Root
												{...props}
												type="single"
												class="w-full grow"
												variant="outline"
												value={String(force)}
												onValueChange={(v: string) => {
													if (!v) return;

													const agent = $formData.agents[agentIdx];
													if (!agent) return;

													agent.budgetSettings ??= {};

													const existing = agent.budgetSettings.exhaustionBehavior;

													agent.budgetSettings.exhaustionBehavior = {
														type: 'kill',
														force: v === 'true',
														minimum: existing?.type === 'kill' ? existing.minimum : 0
													};

													$formData.agents = $formData.agents;
												}}
											>
												<ToggleGroup.Item value="true">True</ToggleGroup.Item>

												<ToggleGroup.Item value="false">False</ToggleGroup.Item>
											</ToggleGroup.Root>
										{/snippet}
									</Form.Control>
								</Form.ElementField>
								{#if killBehavior?.type === 'kill'}
									<Form.ElementField
										{form}
										name="agents[{agentIdx}].budgetSettings.exhaustionBehavior.minimum"
										class="flex items-center gap-2 "
									>
										<Form.Control>
											{#snippet children({ props })}
												<TooltipLabel
													title="Minimum threshold"
													tooltip="If the session budget drops below this, it will trigger the exhaustion behavior. This is used to prevent overclaiming."
													extra={{
														required: true,
														type: 'integer'
													}}
													class="max-w-1/4 min-w-1/4"
												>
													Minimum
												</TooltipLabel>
												<CurrencyInput
													value={killBehavior.minimum ?? 0}
													onchange={(micro) => {
														killBehavior.minimum = micro;
														$formData.agents = $formData.agents;
													}}
												/>
											{/snippet}
										</Form.Control>
									</Form.ElementField>
								{/if}
							{/if}
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</li>
			{#each Object.entries(groupedOptions) as [group, entries]}
				<li>
					{#if group !== '__ungrouped'}
						<Accordion.Root type="multiple" value={[group]}>
							<Accordion.Item value={group}>
								<Accordion.Trigger variant="compact">
									{group}
								</Accordion.Trigger>

								<Accordion.Content class="!p-0">
									<ol>
										{#each entries as [name, opt] (name)}
											<OptionField superform={form} agent={ctx.selectedAgent!} {name} meta={opt} />
										{/each}
									</ol>
								</Accordion.Content>
							</Accordion.Item>
						</Accordion.Root>
					{:else}
						<ol>
							{#each entries as [name, opt] (name)}
								<OptionField superform={form} agent={ctx.selectedAgent!} {name} meta={opt} />
							{/each}
						</ol>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
{:else}
	<section
		class="text-muted-foreground m-auto flex w-3/4 grow flex-col items-center justify-center gap-6 text-center"
	>
		<AgentPanelIcon class="w-4/5 py-8 " />

		<Alert.Root class="text-left">
			<IconInfo />
			<Alert.Title>Tip</Alert.Title>
			<Alert.Description
				>New here? Agents are the building blocks of sessions, they communicate, execute tools, and
				output results, try loading a template for a prebuilt configuration.</Alert.Description
			>
		</Alert.Root>
	</section>
{/if}
