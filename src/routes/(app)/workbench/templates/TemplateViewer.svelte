<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import { toast } from 'svelte-sonner';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import AgentGraph from '$lib/components/AgentGraph.svelte';
	import { TwostepButton } from '@coral-os/component-library';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import { type Template } from './TemplateV1';
	import * as Rename from '@coral-os/component-library/ui/rename/index.js';
	import { Highlight } from 'svelte-highlight';
	import { downloadTemplate } from './TemplateLib';
	import json from 'svelte-highlight/languages/json';
	import { base } from '$app/paths';

	const TEMPLATE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

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

	let loading = $state(false);
	let renameValue = $derived(template);
	let desciptionValue = $derived(templateData.description || 'No description');
	let titleMode = $state<'edit' | 'view'>('view');

	const removeTemplate = (name: string) => {
		try {
			localStorage.removeItem(`template_${name}`);
			const index = templates.indexOf(name);
			if (index !== -1) {
				templates.splice(index, 1);
			}
			toast.success('Template removed successfully!');
			open = false;
		} catch (error) {
			console.error('Error removing template:', error);
			toast.error('Failed to remove template.');
		}
	};

	const createSessionFromTemplate = async (templateName: string) => {
		loading = true;

		try {
			if (!templateData?.payload?.data) throw new Error('Template data not found');

			if (templateData?.version !== 1) throw new Error('Template outdated');

			toast.promise(
				fetch('/api/v1/local/session', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(payload)
				}).then(async (res) => {
					if (!res.ok) {
						const text = await res.text();
						throw new Error(`${res.status} ${res.statusText}: ${text || 'Request failed'}`);
					}
					return res.json();
				}),
				{
					loading: 'Creating session...',
					success: 'Session created!',
					error: (err) =>
						`Failed to create session: ${err instanceof Error ? err.message : String(err)}`
				}
			);

			open = false;
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	};

	const markTrusted = (templateName: string) => {
		try {
			const data = localStorage.getItem(`template_${templateName}`);
			if (!data) {
				throw new Error('Template data not found');
			}
			const parsed = JSON.parse(data);
			parsed.trusted = true;
			localStorage.setItem(`template_${templateName}`, JSON.stringify(parsed));
			templateData = parsed;
			toast.success('Template marked as trusted!');
			onRefresh();
		} catch (error) {
			console.error('Error marking template as trusted:', error);
			toast.error('Failed to mark template as trusted.');
		}
	};

	const updateName = (template: string, newName: string) => {
		try {
			const data = localStorage.getItem(`template_${template}`);
			if (!data) {
				throw new Error('Template data not found');
			}
			const parsed = JSON.parse(data);
			parsed.name = newName;

			localStorage.setItem(`template_${newName}`, JSON.stringify(parsed));

			localStorage.removeItem(`template_${template}`);

			// Update template index
			const templateIndex = JSON.parse(localStorage.getItem('template_index') || '[]');
			const updatedIndex = templateIndex.map((name: string) =>
				name === template ? newName : name
			);
			localStorage.setItem('template_index', JSON.stringify(updatedIndex));

			template = newName;
			toast.success(`Renamed template to ${newName}`);
			onRefresh();

			open = false;
			return true;
		} catch (error) {
			console.error('Error renaming template:', error);
			toast.error('Failed to rename template.');
			open = false;
			return false;
		}
	};

	const updateDescription = (template: string, description: string) => {
		try {
			const data = localStorage.getItem(`template_${template}`);
			if (!data) {
				throw new Error('Template data not found');
			}
			const parsed = JSON.parse(data);
			parsed.description = description;

			localStorage.setItem(`template_${template}`, JSON.stringify(parsed));

			toast.success(`Description updated`);
			return true;
		} catch (error) {
			console.error('Error updating template description:', error);
			toast.error('Failed to update template description.');
			return false;
		}
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="w-fit max-w-fit min-w-fit">
		<Dialog.Header>
			<Dialog.Title
				class="{!templateData.trusted ? 'text-accent' : ''} flex items-center gap-4 align-middle "
			>
				<Rename.Provider>
					<Rename.Root
						this="span"
						bind:value={renameValue}
						inputTag="input"
						bind:mode={titleMode}
						validate={(value: any) => value.length > 0 && TEMPLATE_NAME_REGEX.test(value)}
						class="w-fit p-1"
						onSave={(value: any) => {
							updateName(template, value);
						}}
					/>{#if titleMode === 'edit'}
						<Rename.Save size="sm" variant="ghost" class="text-muted-foreground" />
						<Rename.Cancel size="sm" variant="ghost" class="text-muted-foreground" />
					{:else}
						<Rename.Edit size="sm" variant="ghost" class="text-muted-foreground">Rename</Rename.Edit
						>
					{/if}
				</Rename.Provider>
			</Dialog.Title>
			<Dialog.Description>
				<ol>
					<li>Created at: {new Date(templateData.updated || 0).toLocaleString()}</li>
					<li>
						Has {payload.agentGraphRequest?.agents?.length ?? 0} agent{payload.agentGraphRequest
							?.agents?.length !== 1
							? 's'
							: ''} and {payload.agentGraphRequest?.groups?.length ?? 0} group{payload
							.agentGraphRequest?.groups?.length !== 1
							? 's'
							: ''}.
					</li>
				</ol>

				{#if !templateData.trusted}
					<p class="text-sm text-yellow-500">
						This template was imported externally! Please review this template before running it,
						malicious templates can cause damage.
					</p>
				{/if}

				<Separator class="my-2" />

				<section class="flex h-[400px] w-[800px] max-w-[800px] gap-2 overflow-hidden">
					<div class="bg-sidebar sticky top-0 aspect-square w-[400px] overflow-clip">
						<AgentGraph
							agents={payload.agentGraphRequest?.agents || []}
							groups={payload.agentGraphRequest?.groups || []}
							options={{
								nodeSubLabel: null,
								disableDrag: true,
								disableBrush: true,
								selectedNodeId: null
							}}
						/>
					</div>

					<Tabs.Root value="description" class="w-[400px]">
						<Tabs.List class="bg-sidebar flex w-full rounded-none  *:rounded-none">
							<Tabs.Trigger value="description">Description</Tabs.Trigger>
							<Tabs.Trigger value="data">Data</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="description" class="overflow-y-scroll">
							<Rename.Root
								this="p"
								bind:value={desciptionValue}
								inputTag="textarea"
								validate={(value: string | any[]) => value.length > 0}
								onSave={(value: string) => {
									updateDescription(template, value);
								}}
							/>
						</Tabs.Content>
						<Tabs.Content value="data" class="overflow-y-scroll">
							<Highlight
								class="[&>code]:bg-sidebar max-h-fit text-xs leading-relaxed text-wrap"
								language={json}
								code={JSON.stringify(payload, null, 2)}
							></Highlight>
						</Tabs.Content>
					</Tabs.Root>
				</section>
				<Separator class="my-2" />
			</Dialog.Description>
			<Dialog.Footer class="flex justify-start gap-2">
				<TwostepButton disabled={loading} onclick={() => removeTemplate(template)}
					>Delete</TwostepButton
				>
				<Button disabled={loading} onclick={() => downloadTemplate(template)}>Download</Button>
				{#if templateData.version != 1}
					<Tooltip.Root delayDuration={0}>
						<Tooltip.Trigger class="text-accent opacity-70 hover:opacity-100"
							>Outdated template</Tooltip.Trigger
						>
						<Tooltip.Content>
							<p>
								Template version ({templateData.version}) is outdated, it may not work properly.
							</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{/if}
				{#if !templateData.trusted}
					<TwostepButton
						detail="Are you sure you want to mark this template as trusted? This will remove the warning and let you run the template without confirmation."
						detailClass=""
						class="ml-auto"
						onclick={() => markTrusted(template)}>Mark as trusted</TwostepButton
					>
				{:else}
					<Button class="ml-auto" disabled={loading} href={`${base}/workbench?template=${template}`}
						>Load template</Button
					>
				{/if}
			</Dialog.Footer>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
