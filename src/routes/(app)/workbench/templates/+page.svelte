<script lang="ts">
	import TemplateSkeleton from './TemplateSkeleton.svelte';
	import TemplateViewer from './TemplateViewer.svelte';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { base } from '$app/paths';

	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as AlertDialog from '@coral-os/component-library/ui/alert-dialog/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { formatDistanceToNow } from 'date-fns';
	import { cn } from '$lib/utils.js';

	import IconPlus from 'phosphor-icons-svelte/IconPlusRegular.svelte';

	import AgentGraph from '$lib/components/AgentGraph.svelte';

	import IconWarningCircleRegular from 'phosphor-icons-svelte/IconWarningCircleRegular.svelte';
	import type { TemplateV1 } from './TemplateV1';
	import {
		normalizeTemplate,
		refreshTemplateFromStorage,
		fetchBundledTemplates,
		fetchTemplatesFromStorage,
		safeJSONParse,
		pickAndParseTemplateFile,
		checkTemplateOverwrite,
		saveTemplateToLocalStorage,
		downloadTemplate
	} from './TemplateLib';

	let templates = $state<string[]>([]);

	let dialogOpen = $state(false);
	let overwriteWarning = $state(false);
	let pendingImport: any = null; // store template data awaiting confirmation
	let template = $state('');
	let templateData = $state<TemplateV1>({} as TemplateV1);
	let payload = $state({}) as any;
	let loading = $state(true);

	onMount(() => {
		const BUNDLED_VERSION = '1';
		if (localStorage.getItem('bundled_templates_seeded') !== BUNDLED_VERSION) {
			for (const bt of fetchBundledTemplates()) {
				if (!localStorage.getItem('template_' + bt.name)) {
					saveTemplateToLocalStorage(bt);
				}
			}
			localStorage.setItem('bundled_templates_seeded', BUNDLED_VERSION);
		}

		templates = fetchTemplatesFromStorage();
		loading = false;
	});

	async function importTemplate() {
		const result = await pickAndParseTemplateFile();

		if (!result.success) {
			toast.error(result.error);
			return;
		}

		const template = result.data;

		if (checkTemplateOverwrite(template.name)) {
			pendingImport = template;
			overwriteWarning = true;
			return;
		}

		const saveResult = saveTemplateToLocalStorage(template);

		if (!saveResult.success) {
			toast.error(saveResult.error ?? 'Error importing template');
			return;
		}

		toast.success(
			saveResult.overwrite ? 'Template updated successfully!' : 'Template saved successfully!'
		);
	}

	function saveTemplate(data: any) {
		const normalized = normalizeTemplate(data);
		normalized.trusted = true;

		try {
			localStorage.setItem(`template_${normalized.name}`, JSON.stringify(normalized));

			const templateIndex = [...new Set([...(templates || []), normalized.name])];

			templates = templateIndex;
			localStorage.setItem('template_index', JSON.stringify(templateIndex));

			toast.success('Template imported successfully!');
		} catch {
			toast.error('Failed to save template.');
		}
	}

	const openTemplate = (name: string) => {
		template = name;

		const raw = localStorage.getItem(`template_${name}`);
		const parsed = normalizeTemplate(safeJSONParse(raw, {}));

		templateData = parsed;
		payload = safeJSONParse(parsed.payload.data);

		dialogOpen = true;
	};
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link href="/workbench">Workbench</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Link>Templates</Breadcrumb.Link>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>

<TemplateViewer
	{template}
	{payload}
	{templateData}
	bind:open={dialogOpen}
	bind:templates
	onRefresh={() => (templates = fetchTemplatesFromStorage())}
/>

<AlertDialog.Root bind:open={overwriteWarning}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Template already exists</AlertDialog.Title>
			<AlertDialog.Description>
				This template already exists. Do you want to overwrite it?
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel
				onclick={() => {
					pendingImport = null;
					overwriteWarning = false;
				}}
			>
				Cancel
			</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => {
					if (pendingImport) {
						saveTemplate(pendingImport);
						pendingImport = null;
					}
					overwriteWarning = false;
				}}
			>
				Overwrite
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<section class="mx-auto flex w-full justify-between p-12 md:max-w-4/5">
	<h1 class="text-2xl">Your templates</h1>
	<section class="flex gap-2">
		<Button
			variant="default"
			href="{base}/workbench"
			class={cn('h-9 w-fit', templates.length > 0 && !loading && 'border-accent/50!')}
			><IconPlus /> Create</Button
		>
		<Button variant="outline" onclick={() => importTemplate()} class="h-9 w-fit">Import</Button>
	</section>
</section>

{#key templates}
	<ul
		class="grid grid-cols-[repeat(auto-fit,minmax(20rem,24em))] justify-center gap-4 overflow-y-scroll p-4"
	>
		{#if templates.length > 0}
			{#if !loading}
				{#each templates as template, i}
					{@const templateData = normalizeTemplate(
						safeJSONParse(localStorage.getItem(`template_${template}`), {})
					)}
					{@const graphData = safeJSONParse(templateData?.payload?.data || '{}')}

					<li class="col-span-1">
						<Card.Root class="rounded-md p-0">
							<Dialog.Root bind:open={dialogOpen}>
								<Card.Content class="flex flex-col p-0 ">
									<button
										class=" bg-sidebar hover:bg-accent-foreground/10 aspect-video w-full overflow-clip transition-all"
										onclick={() => openTemplate(template)}
									>
										<AgentGraph
											agents={graphData?.agentGraphRequest?.agents || []}
											groups={graphData?.agentGraphRequest?.groups || []}
											options={{
												disableZoom: true,
												disableDrag: true,
												disableBrush: true,
												nodeSubLabel: null,
												selectedNodeId: null
											}}
										/>
									</button>

									<Card.Footer class="flex justify-between gap-2 border-t px-6 !py-4">
										<span class="flex flex-col gap-2">
											<Card.Title>{template}</Card.Title>
											{#if !templateData?.trusted}
												<Tooltip.Root delayDuration={0}>
													<Tooltip.Trigger
														class="text-accent absolute right-0 opacity-70 hover:opacity-100"
														><IconWarningCircleRegular class="size-5" /></Tooltip.Trigger
													>
													<Tooltip.Content>
														<p>Imported from external source</p>
													</Tooltip.Content>
												</Tooltip.Root>
											{/if}
											<span class="text-muted-foreground text-xs"
												>Updated {formatDistanceToNow(templateData.updated, {
													addSuffix: true
												})}</span
											>
										</span>
									</Card.Footer>
								</Card.Content>
							</Dialog.Root>
						</Card.Root>
					</li>
				{/each}
			{/if}
		{:else if loading}
			{#each templates}
				<TemplateSkeleton />
			{:else}
				<TemplateSkeleton />
			{/each}
		{:else}
			<section
				class="bg-sidebar m-auto flex max-w-md flex-col items-center gap-4 rounded-lg border p-8 text-center"
			>
				<p class="text-muted-foreground">
					No templates found. Create your first template to get started!
				</p>
			</section>
		{/if}
	</ul>
{/key}
