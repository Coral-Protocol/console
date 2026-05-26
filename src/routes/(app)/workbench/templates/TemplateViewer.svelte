<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import { toast } from 'svelte-sonner';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import AgentGraph from '$lib/components/AgentGraph.svelte';
	import { TwostepButton } from '@coral-os/component-library';
	import { type Template } from './TemplateV1';
	import { Highlight } from 'svelte-highlight';
	import { downloadTemplate } from './TemplateLib';
	import json from 'svelte-highlight/languages/json';
	import { base } from '$app/paths';
	import { appContext } from '$lib/context';
	import { registryIdOf } from '$lib/CoralServer.svelte';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';

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
		return agents.filter((agent: any) => {
			const regId = registryIdOf(agent.id.registrySourceId);
			const catalog = server.catalogs[regId];
			if (!catalog) return true;
			const catalogAgent = catalog.agents[agent.id.name];
			if (!catalogAgent) return true;
			if (!catalogAgent.versions.includes(agent.id.version)) return true;
			return false;
		});
	});

	let allAgentsAvailable = $derived(missingAgents.length === 0);

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
			open = false;
			editMode = false;

			return true;
		} catch (error) {
			console.error(error);
			toast.error('Failed to save template.');
			return false;
		}
	};
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
				<div class="flex justify-between">
					<ol>
						<li>Created: {new Date(templateData.updated || 0).toLocaleString()}</li>
						<li>
							{payload.agentGraphRequest?.agents?.length ?? 0} agents,
							{payload.agentGraphRequest?.groups?.length ?? 0} groups
						</li>
					</ol>

					<ul class="flex gap-2">
						{#if !allAgentsAvailable}
							<Badge variant="destructive">Missing agents</Badge>
						{/if}

						{#if !templateData.trusted}
							<Badge variant="destructive">Externally Imported</Badge>
						{/if}
					</ul>
				</div>

				<Separator class="my-2" />

				<section class="flex h-[400px] w-[800px] gap-2 overflow-hidden">
					<div class="bg-sidebar w-[400px]">
						<AgentGraph
							agents={payload.agentGraphRequest?.agents || []}
							groups={payload.agentGraphRequest?.groups || []}
							options={{
								nodeSubLabel: null,
								disableDrag: true,
								disableBrush: true
							}}
						/>
					</div>

					<Tabs.Root value="description" class="w-[400px]">
						<Tabs.List class="bg-sidebar flex w-full">
							<Tabs.Trigger value="description">Description</Tabs.Trigger>
							<Tabs.Trigger value="data">Data</Tabs.Trigger>
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

						<Tabs.Content value="data" class="overflow-y-scroll">
							<Highlight class="text-xs" language={json} code={JSON.stringify(payload, null, 2)} />
						</Tabs.Content>
					</Tabs.Root>
				</section>

				<Separator class="my-2" />
			</Dialog.Description>

			<Dialog.Footer class="flex gap-2">
				<TwostepButton disabled={loading || editMode} onclick={() => removeTemplate(template)}>
					Delete
				</TwostepButton>

				<Button
					variant="outline"
					disabled={loading || editMode}
					onclick={() => downloadTemplate(template)}
				>
					Download
				</Button>

				<Button
					onclick={() => {
						if (editMode) {
							saveTemplate();
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
					<Button
						class="ml-auto"
						disabled={loading || !allAgentsAvailable}
						href={`${base}/workbench?template=${template}`}
					>
						Load template
					</Button>
				{/if}
			</Dialog.Footer>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
