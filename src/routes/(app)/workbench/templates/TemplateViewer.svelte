<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import { toast } from 'svelte-sonner';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import Graph from '$lib/components/Graph/Graph.svelte';

	import { TwostepButton } from '@coral-os/component-library';
	import { type Template } from './TemplateV1';
	import { Highlight } from 'svelte-highlight';
	import { downloadTemplate } from './TemplateLib';
	import json from 'svelte-highlight/languages/json';
	import { base } from '$app/paths';
	import { appContext } from '$lib/context';
	import { registryIdOf } from '$lib/CoralServer.svelte';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import CodePane from '../panes/CodePane.svelte';

	function formatMissingAgent(item: any) {
		switch (item.reason) {
			case 'missing_catalog':
				return {
					title: 'Catalog not loaded',
					message: `Registry "${item.details.registryId}" could not be found.`,
					badge: 'registry'
				};

			case 'missing_agent_in_catalog':
				return {
					title: 'Agent not found',
					message: `"${item.details.name}" does not exist in registry "${item.details.registryId}".`,
					badge: 'agent'
				};

			case 'missing_version':
				return {
					title: 'Version mismatch',
					message: `"${item.details.name}" version "${item.details.requestedVersion}" is not available.`,
					extra: `Available: ${item.details.availableVersions.join(', ')}`,
					badge: 'version'
				};
		}
	}

	let {
		template = $bindable(''),
		templateData = $bindable({} as Template),
		payload = $bindable({}),
		open = $bindable(false),
		templates = $bindable([]),
		onRefresh = $bindable(() => {})
	}: {
		template: Template['name'];
		templateData: Template;
		payload: any;
		open: boolean;
		templates: string[];
		onRefresh: (name?: string) => void;
	} = $props();

	const server = appContext.get().server;

	let loading = $state(false);
	let editMode = $state(false);

	let newName = $state(template);
	let newDescription = $state(templateData.description || '');

	$effect(() => {
		newName = template;
		newDescription = templateData.description || '';
	});

	let missingAgents = $derived.by(() => {
		const agents = payload.agentGraphRequest?.agents || [];

		return agents
			.map((agent: any) => {
				const regId = registryIdOf(agent.id.registrySourceId);
				const catalog = server.catalogs[regId];

				if (!catalog) {
					return {
						agent,
						missing: true,
						reason: 'missing_catalog',
						details: {
							registrySourceId: agent.id.registrySourceId,
							registryId: regId
						}
					};
				}

				const catalogAgent = catalog.agents[agent.id.name];

				if (!catalogAgent) {
					return {
						agent,
						missing: true,
						reason: 'missing_agent_in_catalog',
						details: {
							registryId: regId,
							name: agent.id.name
						}
					};
				}

				if (!catalogAgent.versions.includes(agent.id.version)) {
					return {
						agent,
						missing: true,
						reason: 'missing_version',
						details: {
							registryId: regId,
							name: agent.id.name,
							requestedVersion: agent.id.version,
							availableVersions: catalogAgent.versions
						}
					};
				}

				return null; // valid agent
			})
			.filter(Boolean);
	});

	let allAgentsAvailable = $derived(missingAgents.length === 0);

	let errors = $derived(!allAgentsAvailable);

	const removeTemplate = (name: string) => {
		try {
			localStorage.removeItem(`template_${name}`);
			const index = templates.indexOf(name);
			if (index !== -1) templates.splice(index, 1);

			toast.success('Template removed successfully!');
			open = false;
		} catch (error) {
			console.error(error);
			toast.error('Failed to remove template.');
		}
	};

	const markTrusted = (templateName: string) => {
		try {
			const data = localStorage.getItem(`template_${templateName}`);
			if (!data) throw new Error('Template not found');

			const parsed = JSON.parse(data);
			parsed.trusted = true;

			localStorage.setItem(`template_${templateName}`, JSON.stringify(parsed));
			templateData = parsed;

			toast.success('Template marked as trusted!');
			onRefresh();
		} catch (error) {
			console.error(error);
			toast.error('Failed to mark as trusted.');
		}
	};

	const saveTemplate = () => {
		try {
			const data = localStorage.getItem(`template_${template}`);
			if (!data) throw new Error('Template not found');

			const parsed = JSON.parse(data);
			const oldName = template;

			parsed.name = newName;
			parsed.description = newDescription;

			localStorage.setItem(`template_${newName}`, JSON.stringify(parsed));

			if (oldName !== newName) {
				localStorage.removeItem(`template_${oldName}`);
			}

			const templateIndex = JSON.parse(localStorage.getItem('template_index') || '[]');
			const updatedIndex = templateIndex.map((n: string) => (n === oldName ? newName : n));
			localStorage.setItem('template_index', JSON.stringify(updatedIndex));

			template = newName;
			templateData = parsed;

			toast.success('Template saved');
			onRefresh();
			editMode = false;

			return true;
		} catch (error) {
			console.error(error);
			toast.error('Failed to save template.');
			return false;
		}
	};

	let currentTab = $state('description');
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="w-fit max-w-fit min-w-fit">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-4">
				{#if editMode}
					<input class="w-full rounded border bg-transparent p-1" bind:value={newName} />
				{:else}
					<span>{template}</span>
				{/if}
			</Dialog.Title>

			<Dialog.Description>
				<div class="col-span-1 flex justify-between">
					<ol>
						<li>Created: {new Date(templateData.updated || 0).toLocaleString()}</li>
						<li>
							{payload.agentGraphRequest?.agents?.length ?? 0} agents,
							{payload.agentGraphRequest?.groups?.length ?? 0} groups
						</li>
					</ol>

					<ul class="flex gap-2">
						{#if !allAgentsAvailable}
							<Tooltip.Root>
								<Tooltip.Trigger
									onclick={() => {
										currentTab = 'errors';
									}}
								>
									<Badge variant="destructive">Missing agents</Badge>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<ol>
										{#each missingAgents as agent}
											<li>{agent.agent.name}</li>
										{/each}
									</ol>
								</Tooltip.Content>
							</Tooltip.Root>
						{/if}

						{#if !templateData.trusted}
							<Badge variant="destructive">Externally Imported</Badge>
						{/if}
					</ul>
				</div>

				<section class="grid h-[400px] w-[800px] grid-cols-2 gap-2">
					<div class="bg-sidebar col-span-1 h-[400px] w-[400px]">
						<SvelteFlowProvider>
							<Graph
								agents={payload.agentGraphRequest?.agents || []}
								groups={payload.agentGraphRequest?.groups || []}
							/>
						</SvelteFlowProvider>
					</div>

					<Tabs.Root bind:value={currentTab} class="col-span-1 w-[400px] overflow-hidden">
						<Tabs.List class="bg-sidebar flex w-full justify-start">
							<Tabs.Trigger value="description">Description</Tabs.Trigger>
							<Tabs.Trigger value="data">Data</Tabs.Trigger>
							{#if errors}
								<Tabs.Trigger value="errors">Errors</Tabs.Trigger>
							{/if}
						</Tabs.List>

						<Tabs.Content value="description" class="overflow-y-scroll">
							{#if editMode}
								<textarea
									class="h-[250px] w-full rounded border bg-transparent p-2"
									bind:value={newDescription}
								></textarea>
							{:else}
								<p>{templateData.description || 'No description'}</p>
							{/if}
						</Tabs.Content>

						<Tabs.Content value="data" class="prose overflow-y-scroll">
							<CodePane customPayload={JSON.stringify(payload, null, 4)} />
						</Tabs.Content>
						{#if errors}
							<Tabs.Content
								value="errors"
								class="flex h-full w-full flex-col overflow-y-scroll wrap-break-word "
							>
								<ol>
									{#each missingAgents as item}
										{@const view = formatMissingAgent(item)}

										<div class="card border-b">
											<div class="header">
												<strong>{view?.title}</strong>
											</div>

											<div class="message">
												{view?.message}
											</div>

											{#if view?.extra}
												<div class="extra">
													{view?.extra}
												</div>
											{/if}

											<details class="raw">
												<summary>Debug</summary>
												<CodePane customPayload={JSON.stringify(item, null, 4)} />
											</details>
										</div>
									{/each}
								</ol>
								<footer class="mt-auto flex items-center justify-between border p-1">
									<span>This template is very unlikely to work</span>
									<Button
										size="sm"
										variant="destructive"
										href={`${base}/workbench?template=${template}`}
									>
										Load anyway?
									</Button>
								</footer>
							</Tabs.Content>
						{/if}
					</Tabs.Root>
				</section>

				<Separator class="my-2" />
			</Dialog.Description>

			<Dialog.Footer class="flex gap-2">
				<TwostepButton
					variant="ghostDestructive"
					disabled={loading || editMode}
					onclick={() => removeTemplate(template)}
				>
					Delete
				</TwostepButton>

				<Button
					variant="ghost"
					disabled={loading || editMode}
					onclick={() => downloadTemplate(template)}
				>
					Download
				</Button>

				<Button
					variant="ghost"
					onclick={() => {
						if (editMode) {
							saveTemplate();
							editMode = !editMode;
						}
						editMode = !editMode;
					}}
				>
					{editMode ? 'Save' : 'Edit'}
				</Button>

				{#if !templateData.trusted}
					<TwostepButton class="ml-auto" disabled={editMode} onclick={() => markTrusted(template)}>
						Mark as trusted
					</TwostepButton>
				{/if}

				{#if templateData.trusted}
					{#if !errors}
						<Button class="ml-auto" href={`${base}/workbench?template=${template}`}>
							Load template
						</Button>
					{:else}
						<Button
							class="ml-auto"
							disabled={currentTab === 'errors'}
							onclick={() => (currentTab = 'errors')}>Load template</Button
						>
					{/if}
				{/if}
			</Dialog.Footer>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
