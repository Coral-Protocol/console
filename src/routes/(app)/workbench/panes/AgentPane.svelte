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
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';

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

	let mounted = $state(false);

	onMount(() => {
		setTimeout(() => (mounted = true), 400);
	});
</script>

{#if ctx.selectedAgent !== null && curAgent && curCatalog}
	{#if !ctx.detailedAgent || !ctx.detailedAgent.registryAgent?.info?.identifier || agentIdOf(ctx.detailedAgent.registryAgent.info.identifier) !== agentIdOf(curAgent.id)}
		<Spinner class="m-auto my-8" />
	{:else}
		<header class="grid w-full grid-cols-2 gap-2 px-2">
			<section class="col-span-1 flex flex-col gap-2">
				<Form.ElementField
					{form}
					name="agents[{ctx.selectedAgent}].name"
					class="flex w-full flex-col gap-2"
				>
					<Form.Control>
						{#snippet children({ props })}
							<TooltipLabel tooltip={'Name of the agent in this session'} class="m-0  w-fit"
								>Name
							</TooltipLabel>
							<Input {...props} bind:value={$formData.agents[ctx.selectedAgent!]!.name} />
						{/snippet}
					</Form.Control>
				</Form.ElementField>
				<Form.ElementField
					{form}
					name="agents[{ctx.selectedAgent}].description"
					class="flex w-full grow flex-col gap-2"
				>
					<Form.Control>
						{#snippet children({ props })}
							<TooltipLabel
								tooltip={'Optional agent description shared with other agents'}
								class="m-0  w-fit"
								>Description
							</TooltipLabel>
							<Textarea
								{...props}
								class="relative m-0 grow resize-y"
								bind:value={$formData.agents[ctx.selectedAgent!]!.description}
							/>
						{/snippet}
					</Form.Control>
				</Form.ElementField>
			</section>
			<section class="col-span-1 flex h-fit flex-col gap-2">
				<Form.ElementField
					{form}
					name="agents[{ctx.selectedAgent}].id.version"
					class="flex grow flex-col gap-2"
				>
					<Form.Control>
						{#snippet children({ props })}
							{@const id = curAgent.id}
							{@const reg = curCatalog.agents[id.name]!}
							<TooltipLabel
								tooltip={'Version to use from the server agent registry'}
								class="w m-0  w-fit truncate">Version</TooltipLabel
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
					class="flex grow flex-col gap-2"
				>
					<Form.Control>
						{#snippet children({ props })}
							{@const runtime = $formData.agents[ctx.selectedAgent!]!.provider.runtime}
							{@const items = Object.keys(ctx.detailedAgent?.registryAgent?.runtimes ?? {})}
							<TooltipLabel
								tooltip={'Will only show available options for the selected agent type'}
								class="m-0  w-fit">Runtime</TooltipLabel
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
					class="flex grow flex-col gap-2"
				>
					<Form.Control>
						{#snippet children({ props })}
							{@const tools = $formData.agents[ctx.selectedAgent!]!.customToolAccess}
							<TooltipLabel
								tooltip={'What custom tools this agent has access to.'}
								class="m-0 w-fit ">Custom Tools</TooltipLabel
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
								<Select.Trigger class="m-0 w-full grow">
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
			</section>
		</header>

		<ol class="border-t">
			<li class="">
				<Card.Root class="m-2 p-0">
					<Card.Content class="bg-muted/50 p-0">
						<Accordion.Root type="multiple" value={['budget']} class="border-0 ">
							<Accordion.Item value="budget" class="*:px-0 {mounted ? '' : 'animation-duration-0'}">
								<Accordion.Trigger>Budget</Accordion.Trigger>

								<Accordion.Content class="flex flex-col gap-2 border-t px-4 pb-4">
									{@const agentIdx = ctx.selectedAgent!}
									<Form.ElementField
										{form}
										name="agents[{agentIdx}].budgetSettings.budget"
										class="flex items-center gap-2 py-2 "
									>
										<Form.Control>
											{#snippet children({ props })}
												<TooltipLabel
													title="Session budget"
													tooltip="This budget is shared across all agents in the session and can be used by any agent configured to consume the shared budget."
													extra={{
														type: 'integer'
													}}
													class="max-w-1/4 min-w-1/4"
												>
													<div class="flex flex-col">
														<span class="truncate wrap-break-word">Agent budget</span>

														<span class="text-muted-foreground truncate text-xs"
															>This budget is shared across all agents in the session and can be
															used by any agent configured to consume the shared budget.</span
														>
													</div>
												</TooltipLabel>

												<CurrencyInput
													{...props}
													value={$formData.agents[agentIdx]?.budgetSettings?.budget ?? 0}
													onchange={(micro) => {
														const agent = $formData.agents[agentIdx];
														if (!agent) return;
														agent.budgetSettings ??= {};
														if (micro === 0) {
															delete $formData.agents[agentIdx]?.budgetSettings?.budget;
															$formData.agents = $formData.agents;
														} else {
															agent.budgetSettings.budget = micro;
															$formData.agents = $formData.agents;
														}
													}}
												/>
											{/snippet}
										</Form.Control>
									</Form.ElementField>
									<Separator class="mb-2" />

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
													extra={{}}
													class="max-w-1/4 min-w-1/4"
												>
													<div class="flex flex-col">
														<span class="truncate wrap-break-word">Exhaustion Behavior</span>

														<span class="text-muted-foreground truncate text-xs"
															>What happens once the budget has been drained</span
														>
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
																	onclick={() => {
																		if (
																			$formData.agents[agentIdx]!.budgetSettings!
																				.exhaustionBehavior!.type !== 'kill'
																		) {
																			$formData.agents[
																				agentIdx
																			]!.budgetSettings!.exhaustionBehavior = {
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
														<Tooltip.Content
															class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word"
														>
															<p>
																Once the agent's budget is less than the specified minimum amount,
																the agent will be killed. The higher the minimum is the lower the
																chance of overclaiming. This behavior will stop the agent claiming
																from the session's budget
															</p>
														</Tooltip.Content>
													</Tooltip.Root>
													<Tooltip.Root delayDuration={400}>
														<Tooltip.Trigger>
															{#snippet child({ props }: { props: any })}
																<ToggleGroup.Item
																	{...props}
																	onclick={() => {
																		$formData.agents[agentIdx]!.budgetSettings!.exhaustionBehavior =
																			{
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
														<Tooltip.Content
															class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word"
														>
															<p>
																Once's the agent's budget is exhausted, it will consume the
																session's budget. If the session's budget is also exhausted, the
																session's exhaustion behavior will be applied. If a claim is made
																that cannot be fully fulfilled by the agent's budget, the remainder
																will be taken from the session's budget.
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
										<Separator class="my-2" />

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
														<div class="flex flex-col">
															<span class="truncate wrap-break-word">Force kill agent</span>

															<span class="text-muted-foreground truncate text-xs"
																>If this is true, the agent will be killed immediately. If this is
																false, the agent will only be killed if the claim requests for
																automatic closing</span
															>
														</div>
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
											<Separator class="my-2" />

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
															<div class="flex flex-col">
																<span class="truncate wrap-break-word">Minimum</span>

																<span class="text-muted-foreground truncate text-xs"
																	>If the session budget drops below this, it will trigger the
																	exhaustion behavior. This is used to prevent overclaiming</span
																>
															</div>
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
					</Card.Content>
				</Card.Root>
			</li>

			{#each Object.entries(groupedOptions) as [group, entries]}
				<li>
					{#if group !== '__ungrouped'}
						<Card.Root class="bg-muted/50 m-2 p-0">
							<Card.Content class="p-0">
								<Accordion.Root type="multiple" value={[group]} class="border-0 ">
									<Accordion.Item
										value={group}
										class="*:px-0 {mounted ? '' : 'animation-duration-0'}"
									>
										<Accordion.Trigger>
											{group}
										</Accordion.Trigger>

										<Accordion.Content class="border-t ">
											<ol>
												{#each entries as [name, opt] (name)}
													<OptionField
														superform={form}
														agent={ctx.selectedAgent!}
														{name}
														meta={opt}
														class="px-4"
													/>
												{/each}
											</ol>
										</Accordion.Content>
									</Accordion.Item>
								</Accordion.Root>
							</Card.Content>
						</Card.Root>
					{:else}
						<ol>
							{#each entries as [name, opt] (name)}
								<Card.Root class="bg-muted/50 m-2 p-0">
									<Card.Content class="p-0">
										<OptionField superform={form} agent={ctx.selectedAgent!} {name} meta={opt} />
									</Card.Content>
								</Card.Root>
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
