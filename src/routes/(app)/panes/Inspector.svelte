<script lang="ts">
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Select from '@coral-os/component-library/ui/select/index.js';
	import AgentPanelIcon from '$lib/icons/agent-panel.svelte';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import IconAlertCircle from 'phosphor-icons-svelte/IconWarningCircleRegular.svelte';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';
	import { TooltipLabel, Combobox } from '@coral-os/component-library';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';

	import OptionField from '../OptionField.svelte';

	import { appContext } from '$lib/context';
	import type { CoralServer, RegistryAgentIdentifier } from '$lib/CoralServer.svelte';
	import { agentIdOf, registryIdOf } from '$lib/CoralServer.svelte';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';

	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { activeFile } from '$lib/activeFile.svelte';
	import type { Agent } from '$lib/fileStorage.svelte';
	import { untrack } from 'svelte';
	import { RuntimeId } from '$generated/api.zod';
	import { Button } from '@coral-os/component-library/components/ui/button/index.js';
	import IconRobot from '$lib/icons/robot.svelte';
	import AgentBudget from './AgentBudget.svelte';


	let ctx = appContext.get();
	let sessCtx = getSessionContext();

	const getOptions = async (agentId?: RegistryAgentIdentifier | null) => {
		if (!agentId) return null;

		try {
			return await ctx.server.lookupAgent(agentId);
		} catch (error) {
			console.error('Failed to get agent options. ', error);
			sessCtx.selectedAgentError = error instanceof Error ? error : new Error(String(error));

			return null;
		}
	};

	const sessionAgentObject = $derived(
		sessCtx.selectedAgentClientId !== null
			? activeFile.current?.agents.find((agent) => agent.clientId === sessCtx.selectedAgentClientId)
			: undefined
	);

	let agentLookup = $state<Awaited<ReturnType<CoralServer['lookupAgent']>> | null>(null);
	let optionsLoading = $state(false);

	const agentKey = $derived(
		sessionAgentObject
			? `${sessionAgentObject.id.registrySourceId}:${sessionAgentObject.id.name}:${sessionAgentObject.id.version}`
			: undefined
	);

	$effect(() => {
		const key = agentKey;
		let cancelled = false;

		if (!key) {
			agentLookup = null;
			return;
		}

		const id = untrack(() => sessionAgentObject?.id);
		if (!id) {
			agentLookup = null;
			return;
		}

		optionsLoading = true;
		getOptions(id).then((result) => {
			if (cancelled) return;
			agentLookup = result;
			optionsLoading = false;
			if (result) sessCtx.selectedAgentError = null;
		});

		return () => {
			cancelled = true;
		};
	});

	const curCatalog = $derived(
		sessionAgentObject
			? ctx.server.catalogs[registryIdOf(sessionAgentObject.id.registrySourceId)]
			: undefined
	);

	const UNGROUPED = '__ungrouped';

	const groupedOptions = $derived.by(() => {
		return Object.entries(agentLookup?.registryAgent.options ?? {}).reduce<
			Record<string, [string, any][]>
		>((acc, [name, opt]) => {
			const group = opt?.display?.group ?? UNGROUPED;
			(acc[group] ??= []).push([name, opt]);
			return acc;
		}, {});
	});

	function updateAgentField(destination: keyof Omit<Agent, 'clientId'>, value: unknown) {
		const id = sessCtx.selectedAgentClientId;
		if (!id) return;
		activeFile.updateAgent(id, { [destination]: value });
	}

	function updateValue(e: Event, destination: keyof Omit<Agent, 'clientId'>) {
		const input = e.currentTarget as HTMLInputElement;
		updateAgentField(destination, input.value);
	}
</script>

{#if optionsLoading}
	<Spinner class="m-auto my-8" />
{:else if sessionAgentObject && sessCtx.selectedAgentClientId}
	{@const id = sessionAgentObject.id}
	{@const provider = sessionAgentObject.provider}
	{@const tools = sessionAgentObject.customToolAccess ?? []}
	{@const items = Object.keys(agentLookup?.registryAgent?.runtimes ?? {})}
	{@const reg = curCatalog?.agents[id.name]}

	<header class="grid w-full grid-cols-2 gap-2 p-2">
		<section class="col-span-1 flex flex-col gap-2">
			<TooltipLabel tooltip={'Name of the agent in this session'} class="m-0 w-fit">
				Name
			</TooltipLabel>
			<Input value={sessionAgentObject.name} onchange={(e: Event) => updateValue(e, 'name')} />

			<TooltipLabel
				tooltip={'Optional agent description shared with other agents'}
				class="m-0 w-fit"
			>
				Description
			</TooltipLabel>
			<Textarea
				class="relative m-0 grow resize-y"
				value={sessionAgentObject.description}
				onchange={(e: Event) => updateValue(e, 'description')}
			/>
		</section>

		<section class="col-span-1 flex h-fit flex-col gap-2">
			<TooltipLabel
				tooltip={'Version to use from the server agent registry'}
				class="w m-0 w-fit truncate"
			>
				Version
			</TooltipLabel>
			{#if reg?.versions != null}
				<Combobox
					class="w-auto grow pr-[2px]"
					side="right"
					align="start"
					disabled={reg.versions.length <= 1}
					selected={id.version}
					options={[{ items: reg.versions }]}
					searchPlaceholder="Search versions..."
					onValueChange={(value: string) => {
						updateAgentField('id', { ...id, version: value });
					}}
				/>
			{:else}
				<Combobox
					class="w-auto grow pr-[2px] {!agentLookup
						? 'pointer-events-auto! cursor-not-allowed!'
						: ''}"
					side="right"
					align="start"
					disabled
				/>
			{/if}

			<TooltipLabel
				tooltip={'Will only show available options for the selected agent type'}
				class="m-0 w-fit"
			>
				Runtime
			</TooltipLabel>
			<Combobox
				class="w-auto grow pr-[2px] {!agentLookup
					? 'pointer-events-auto! cursor-not-allowed!'
					: ''}"
				side="right"
				align="start"
				disabled={items.length <= 1 || !agentLookup}
				options={[{ items }]}
				searchPlaceholder="Search runtimes..."
				selected={provider.runtime || items[0]}
				onValueChange={(selected: string) => {
					updateAgentField('provider', { ...provider, runtime: selected as RuntimeId });
				}}
			/>

			<TooltipLabel tooltip={'What custom tools this agent has access to.'} class="m-0 w-fit">
				Custom Tools
			</TooltipLabel>
			<Select.Root
				type="multiple"
				value={tools}
				disabled={!agentLookup}
				onValueChange={(value) => updateAgentField('customToolAccess', value)}
			>
				<Select.Trigger class="m-0 w-full grow">
					<span>{tools.length} tools</span>
				</Select.Trigger>
				<Select.Content>
					{#if !activeFile.current?.tools || Object.keys(activeFile.current.tools).length === 0}
						<span class="text-muted-foreground h-9 px-2 text-sm italic">
							No tools found, add some in the tools pane
						</span>
					{/if}
					{#each Object.values(activeFile.current?.tools ?? {}) as tool}
						<Select.Item value={tool.name ?? ''}>{tool.name ?? ''}</Select.Item>
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
	{:else if !agentLookup}
		<section
			class="text-muted-foreground m-auto flex h-full w-full grow flex-col items-center justify-center gap-6 text-center"
		>
			<AgentPanelIcon class="w-4/5 py-8" />
		</section>
	{:else}
		<Tabs.Root value="Options" class="gap-0">
			<Tabs.List class="w-full justify-start">
				<Tabs.Trigger value="Options">Options</Tabs.Trigger>
				<Tabs.Trigger value="Budget">Budget</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="Options">
				<ol>
					{#each Object.entries(groupedOptions) as [group, entries]}
						<li>
							{#if group !== '__ungrouped'}
								<Card.Root class="bg-muted/50 border-0 p-0">
									<Card.Content class="p-0">
										<Accordion.Root type="multiple" value={[group]} class="border-0">
											<Accordion.Item value={group} class="*:px-0 ">
												<Accordion.Trigger>
													{group}
												</Accordion.Trigger>
												<Accordion.Content class="border-t">
													<ol class="">
														{#each entries as [name, opt] (name)}
															{#key sessionAgentObject.clientId}
																<OptionField
																	agent={sessionAgentObject}
																	{name}
																	meta={opt}
																	class="px-4"
																/>
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
												<OptionField agent={sessionAgentObject} {name} meta={opt} />
											</Card.Content>
										</Card.Root>
									{/each}
								</ol>
							{/if}
						</li>
					{/each}
				</ol>
			</Tabs.Content>
			<Tabs.Content value="Budget" class="p-2">
				<AgentBudget/>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
{:else}
	<Card.Root class="bg-muted/50 m-2 ">
		<Card.Content class="flex flex-col"
			>Select an agent to configure it with the Inspector
			<span class="text-muted-foreground"
				>You can also select agents in the graph or outline view.</span
			>
		</Card.Content>
	</Card.Root>

	{#if activeFile.current?.agents.length}
		<ol class="flex flex-col gap-2 p-2 pt-0">
			{#each activeFile.current.agents as agent}
				<li>
					<Button
						variant="outline"
						onclick={() => (sessCtx.selectedAgentClientId = agent.clientId)}
						class="h-12 w-full grow justify-start"
					>
						<IconRobot class="size-8" />
						<div class="flex flex-col text-left">
							<p class="font-medium">{agent.name}</p>
							<p class="text-foreground/70 text-xs">{agent.id.name}</p>
						</div>
					</Button>
				</li>
			{/each}
		</ol>
	{:else}
		<p class="text-muted-foreground m-auto text-center">
			Explore the Agents tab to add to get started.
		</p>
	{/if}
{/if}
