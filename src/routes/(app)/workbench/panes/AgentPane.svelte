<script lang="ts">
	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import * as Select from '@coral-os/component-library/ui/select/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import AgentPanelIcon from '$lib/icons/agent-panel.svelte';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';

	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';

	import { TooltipLabel, Combobox } from '@coral-os/component-library';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';

	import OptionField from '../OptionField.svelte';

	import { createSessionContext } from '../+page.svelte';
	import { appContext } from '$lib/context';
	import { agentIdOf, registryIdOf } from '$lib/CoralServer.svelte';
	import { tick } from 'svelte';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';

	import { buttonVariants } from '@coral-os/component-library/components/ui/button/index.js';
	import AgentPicker from '../AgentPicker.svelte';
	import { CarTaxiFrontIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import TemplatePicker from '../TemplatePicker.svelte';
	import { getSessionDataFromTemplateName } from '../templates/TemplateLib';

	let appCtx = appContext.get();

	let ctx = createSessionContext.get();
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
						<TooltipLabel tooltip={'Optional agent description'} class="m-0 max-w-1/4"
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
									// for (const name in $formData.agents[ctx.selectedAgent!]!.options) {
									// 	if (!(name in availableOptions)) {
									// 		delete $formData.agents[ctx.selectedAgent!]!.options[name];
									// 	}
									// }
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
		<span class="flex flex-col gap-2">
			<h2 class="text-foreground text-xl">Start a new session</h2>
			<p>
				Get started creating a new session by <span class="font-medium">adding an agent</span> or
				choosing a <span class="font-medium">template</span>.
			</p>
		</span>
		<div class="flex flex-col gap-2">
			<Popover.Root>
				<Popover.Trigger class="{buttonVariants()}, w-42">
					<IconPlusCircle /> Add agent</Popover.Trigger
				>
				<Popover.Content class="p-1">
					<AgentPicker
						server={serverCtx.server}
						onSelect={(agent, catalogId) => {
							toast.promise(ctx.addAgent(agent.name, catalogId.type, agent.versions[0]!), {
								loading: 'Adding agent...',
								success: 'Agent added successfully',
								error: (err: any) => `Failed: ${err.message || err}`
							});
						}}
					/>
				</Popover.Content>
			</Popover.Root>
			<Popover.Root>
				<Popover.Trigger class="{buttonVariants({ variant: 'outline' })}, w-42"
					><IconFileText /> Load template</Popover.Trigger
				>
				<Popover.Content class="p-1">
					<TemplatePicker
						server={serverCtx.server}
						onSelect={(template) => {
							loadTemplate(template);
						}}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>
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
