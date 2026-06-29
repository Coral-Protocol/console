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
	import IconAlertCircle from 'phosphor-icons-svelte/IconWarningCircleRegular.svelte';

	import * as Label from '@coral-os/component-library/ui/label/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';

	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';

	import { TooltipLabel, Combobox } from '@coral-os/component-library';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';

	import OptionField from '../OptionField.svelte';

	import { appContext } from '$lib/context';
	import type { CoralServer, RegistryAgentIdentifier } from '$lib/CoralServer.svelte';
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
	import { activeFile } from '../../../../lib/activeFile.svelte';
	import type { RuntimeId } from '$lib/sessionSchema/types';
	import type { Agent } from '$lib/fileStorage';

	let ctx = appContext.get();
	let sessCtx = getSessionContext();

	let curAgent = $derived(
		sessCtx.selectedAgent !== null
			? normalizeAgent(
					activeFile.current?.agents.find((agent) => agent.clientId === sessCtx.selectedAgent)
				)
			: undefined
	);

	let curAgentId = $derived(curAgent ? agentIdOf(curAgent.id) : null);
	let curCatalog = $derived(
		curAgent && ctx.server.catalogs[registryIdOf(curAgent.id.registrySourceId)]
	);

	function normalizeAgent(agent?: Agent) {
		if (!agent) return undefined;
		agent.options ??= {};
		return agent;
	}

	const getDetails = async (agentId?: RegistryAgentIdentifier | null) => {
		if (!agentId) return null;

		try {
			return await ctx.server.lookupAgent(agentId);
		} catch (error) {
			console.error('lookupAgent failed:', error);
			sessCtx.selectedAgentError = error instanceof Error ? error : new Error(String(error));

			return null;
		}
	};

	let agentDetails = $state<Awaited<ReturnType<CoralServer['lookupAgent']>> | null>(null);
	let agentDetailsFor = $state<string | null>(null);

	$effect(() => {
		const id = curAgent?.id;
		(async () => {
			const result = await getDetails(id);
			// guard against race: only commit if this is still the current agent
			if (id === curAgent?.id) {
				agentDetails = result;
				agentDetailsFor = id ? agentIdOf(id) : null;
			}
		})();
	});

	const UNGROUPED = '__ungrouped';

	let groupedOptions = $derived.by(() => {
		const metaId = curAgent?.id;
		const currentId = curAgentId;

		if (!metaId || !currentId || agentIdOf(metaId) !== currentId) {
			return {};
		}
		if (!curAgentId || agentDetailsFor !== curAgentId) {
			return {};
		}

		return Object.entries(agentDetails?.registryAgent.options ?? {}).reduce<
			Record<string, [string, any][]>
		>((acc, [name, opt]) => {
			const group = opt?.display?.group ?? UNGROUPED;
			(acc[group] ??= []).push([name, opt]);
			return acc;
		}, {});
	});

	// // Type-safe helpers for exhaustion behavior
	// function getAgentExhaustionBehavior(agentIdx: number) {
	// 	return $formData.agents[agentIdx]?.budgetSettings?.exhaustionBehavior;
	// }

	// const agentBehavior = $derived(
	// 	$formData.agents[sessCtx.selectedAgent!]?.budgetSettings?.exhaustionBehavior
	// );

	let mounted = $state(false);

	onMount(() => {
		setTimeout(() => (mounted = true), 400);
	});
</script>

{#if sessCtx.selectedAgent !== null && curAgent}
	{#await curAgent?.id}
		<Spinner class="m-auto my-8" />
	{:then}
		{@const id = curAgent.id}
		{@const reg = curCatalog?.agents[id.name]!}
		{@const provider = curAgent.provider}
		{@const items = Object.keys(agentDetails?.registryAgent?.runtimes ?? {})}
		{@const tools = curAgent.customToolAccess!}

		<header class="grid w-full grid-cols-2 gap-2 px-2">
			<section class="col-span-1 flex flex-col gap-2">
				<TooltipLabel tooltip={'Name of the agent in this session'} class="m-0  w-fit"
					>Name
				</TooltipLabel>
				<Input
					value={curAgent.name}
					onchange={(e: Event) => {
						const input = e.currentTarget as HTMLInputElement;
						activeFile.updateAgent(curAgent.clientId, { name: input.value });
					}}
				/>
				<TooltipLabel
					tooltip={'Optional agent description shared with other agents'}
					class="m-0  w-fit"
					>Description
				</TooltipLabel>
				<Textarea
					class="relative m-0 grow resize-y"
					value={curAgent.description}
					onchange={(e: Event) => {
						const input = e.currentTarget as HTMLInputElement;
						activeFile.updateAgent(curAgent.clientId, { description: input.value });
					}}
				/>
			</section>
			<section class="col-span-1 flex h-fit flex-col gap-2">
				<TooltipLabel
					tooltip={'Version to use from the server agent registry'}
					class="w m-0  w-fit truncate">Version</TooltipLabel
				>
				{#if reg?.versions != null}
					<Combobox
						class="w-auto grow pr-[2px] "
						side="right"
						align="start"
						disabled={reg.versions.length <= 1}
						bind:selected={() => id.version, () => {}}
						options={[{ items: reg.versions }]}
						searchPlaceholder="Search versions..."
						onValueChange={(value: string) => {
							activeFile.updateAgent(curAgent.clientId, { id: { ...id, version: value } });
						}}
					/>
				{:else}
					<Combobox
						class="w-auto grow pr-[2px] {!agentDetails
							? 'pointer-events-auto! cursor-not-allowed!'
							: ''}"
						side="right"
						align="start"
						disabled
					/>
				{/if}

				<TooltipLabel
					tooltip={'Will only show available options for the selected agent type'}
					class="m-0  w-fit">Runtime</TooltipLabel
				>
				<Combobox
					class="w-auto grow pr-[2px] {!agentDetails
						? 'pointer-events-auto! cursor-not-allowed!'
						: ''}"
					side="right"
					align="start"
					disabled={items.length <= 1 || !agentDetails}
					options={[
						{
							items
						}
					]}
					searchPlaceholder="Search runtimes..."
					bind:selected={
						() => provider.runtime || Object.keys(agentDetails?.registryAgent?.runtimes ?? {})[0],
						() => {}
					}
					onValueChange={(selected: string) => {
						activeFile.updateAgent(curAgent.clientId, {
							provider: { ...provider, runtime: selected as RuntimeId }
						});
					}}
				/>
				<TooltipLabel tooltip={'What custom tools this agent has access to.'} class="m-0 w-fit "
					>Custom Tools</TooltipLabel
				>
				<Select.Root
					type="multiple"
					value={tools}
					disabled={!agentDetails}
					onValueChange={(value) => {
						activeFile.updateAgent(curAgent.clientId, {
							customToolAccess: value
						});
					}}
				>
					<Select.Trigger class="m-0 w-full grow">
						<span>{tools.length} tools</span>
					</Select.Trigger>
					<Select.Content>
						{#if !activeFile.current?.sessionSettings.customTools || Object.keys(activeFile.current.sessionSettings.customTools).length == 0}
							<span class="text-muted-foreground h-9 px-2 text-sm italic"
								>No tools found, add some in the tools pane</span
							>
						{/if}
						{#each Object.values(activeFile.current?.sessionSettings.customTools ?? {}) as tool}
							<!-- <Select.Item value={tool}>{tool}</Select.Item> -->
						{/each}
					</Select.Content>
				</Select.Root>
			</section>
		</header>
		{#if sessCtx.selectedAgentError}
			<section class="flex flex-col gap-2 p-2">
				<Alert.Root variant="destructive">
					<IconAlertCircle />
					<Alert.Title>Agent Error</Alert.Title>
					<Alert.Description>
						<p>{sessCtx.selectedAgentError}</p>
					</Alert.Description>
				</Alert.Root>
			</section>
		{:else}
			<ol>
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
														{#key curAgent.clientId}
															<OptionField agent={curAgent} {name} meta={opt} class="px-4" />
														{/key}
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
											<OptionField agent={curAgent} {name} meta={opt} />
										</Card.Content>
									</Card.Root>
								{/each}
							</ol>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	{:catch}
		aaaaa
	{/await}
{:else}
	<section
		class="text-muted-foreground m-auto flex h-full w-full grow flex-col items-center justify-center gap-6 text-center"
	>
		<AgentPanelIcon class="w-4/5 py-8 " />
	</section>
{/if}
