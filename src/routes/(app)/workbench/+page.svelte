<script lang="ts">
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import Header from '$lib/components/header.svelte';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import IconPlusRegular from 'phosphor-icons-svelte/IconPlusRegular.svelte';
	import IconMinusRegular from 'phosphor-icons-svelte/IconMinusRegular.svelte';

	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { PersistedState } from 'runed';

	import IconCodeRegular from 'phosphor-icons-svelte/IconCodeRegular.svelte';
	import IconTableRegular from 'phosphor-icons-svelte/IconTableRegular.svelte';
	import IconGraphRegular from 'phosphor-icons-svelte/IconGraphRegular.svelte';
	import IconEditRegular from 'phosphor-icons-svelte/IconPencilSimpleLineRegular.svelte';

	import { SvelteFlowProvider } from '@xyflow/svelte';
	import Graph from '$lib/components/Graph/Graph.svelte';
	import CodePane from './panes/CodePane.svelte';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { formatDistanceToNow } from 'date-fns';
	import MarketPane from './panes/MarketPane.svelte';
	import { appContext } from '$lib/context';
	import { makeFormSchema } from '$lib/sessionSchema/types';
	import { setSessionContext, type SessionCreatorContext } from '$lib/sessionCreatorContext';
	import AgentPane from './panes/AgentPane.svelte';
	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import ToolsPane from './panes/ToolsPane.svelte';
	import GroupsPane from './panes/GroupsPane.svelte';
	import SessionPane from './panes/SessionPane.svelte';
	import { filesMeta, deleteFileData, loadCodeDraft, saveCodeDraft } from '$lib/fileStorage.js';
	import DndProvider from '$lib/components/DndProvider.svelte';
	import { useDnD } from '$lib/components/DnDProvider.svelte';
	import { toSessionRequest, fromSessionRequest } from '$lib/payloadConstructor';
	import { activeFile } from '$lib/activeFile.svelte';

	let ctx = appContext.get();
	let formSchema = $derived(makeFormSchema(ctx.server));
	// svelte-ignore state_referenced_locally
	let form = superForm(defaults(zod4(formSchema)), {
		SPA: true,
		dataType: 'json',
		validators: zod4(formSchema),
		validationMethod: 'onblur',
		resetForm: false
	});

	let { form: formData, errors, enhance } = $derived(form);
	let sessCtx = $state({
		// svelte-ignore state_referenced_locally
		formData,
		// svelte-ignore state_referenced_locally
		errors,
		form,
		selectedAgent: null,
		detailedAgent: null
	}) as SessionCreatorContext;

	setSessionContext(sessCtx);

	const isMobile = new IsMobile();

	type Tab = { id: string; dirty: boolean };

	const openTabs = new PersistedState<Tab[]>('openTabs', []);
	const activeTab = new PersistedState<string>('activeTab', '', { storage: 'session' });

	if (openTabs.current.length === 0 && filesMeta.current[0]) {
		openTabs.current.push({ id: filesMeta.current[0].id, dirty: false });
	}

	if (!activeTab.current && openTabs.current[0]) {
		activeTab.current = openTabs.current[0].id;
	}

	// Open the active tab's file into the shared store whenever activeTab
	// changes. Every component reading `activeFile.current` updates
	// automatically - no prop threading needed.
	$effect(() => {
		const id = activeTab.current;
		if (!id) {
			activeFile.close();
			return;
		}
		activeFile.open(id);
	});

	// Code pane draft text, kept independent of activeFile.current so
	// in-progress/invalid JSON typed in the pane never gets lost or
	// clobbered. Synced from activeFile.current whenever it changes from
	// somewhere OTHER than the Code pane itself (Graph, panes, etc).
	let codePaneContent = $state('');
	let suppressCodePaneSync = false;

	$effect(() => {
		const id = activeTab.current;
		if (!id) return;

		loadCodeDraft(id, () => {
			const file = activeFile.current;
			if (!file) return '';
			try {
				return JSON.stringify(toSessionRequest(file), null, 2);
			} catch {
				return '';
			}
		}).then((draft) => {
			if (activeTab.current !== id) return;
			codePaneContent = draft;
		});
	});

	$effect(() => {
		const file = activeFile.current;
		const id = activeTab.current;
		if (!id || !file) return; // <- this guard already existed, good

		if (suppressCodePaneSync) {
			suppressCodePaneSync = false;
			return;
		}

		try {
			const next = JSON.stringify(toSessionRequest(file), null, 2);
			codePaneContent = next;
			saveCodeDraft(id, next);
		} catch {
			// file isn't convertible yet - leave the Code pane draft alone.
		}
	});

	function onCodePaneChange(newCode: string) {
		const id = activeTab.current;
		const file = activeFile.current;
		if (!id || !file) return;

		// Always persist the raw text, valid or not - protects against
		// losing in-progress edits on refresh.
		saveCodeDraft(id, newCode);

		let request;
		try {
			request = JSON.parse(newCode);
		} catch {
			return;
		}

		try {
			const next = fromSessionRequest(request, file);
			suppressCodePaneSync = true;
			activeFile.replace(next);
		} catch (err) {
			console.error('Failed to apply code pane edit', err);
		}
	}

	function uniqueName(base: string, existingNames: string[]): string {
		if (!existingNames.includes(base)) return base;

		const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const pattern = new RegExp(`^${escaped} (\\d+)$`);

		let max = 1;
		for (const name of existingNames) {
			const match = name.match(pattern);
			if (match) {
				max = Math.max(max, parseInt(match[1] ?? '0', 10));
			}
		}

		return `${base} ${max + 1}`;
	}

	function newTab() {
		const id = crypto.randomUUID();
		const name = uniqueName(
			'Untitled',
			filesMeta.current.map((f) => f.name)
		);
		filesMeta.current.push({ name, description: '', id, created: Date.now() });
		openTabs.current.push({ id, dirty: true });
		activeTab.current = id;
	}

	function openFile(id: string) {
		const alreadyOpen = openTabs.current.some((tab) => tab.id === id);
		if (!alreadyOpen) {
			openTabs.current.push({ id, dirty: false });
		}
		activeTab.current = id;
	}

	async function closeTab(id: string) {
		const tabIndex = openTabs.current.findIndex((tab) => tab.id === id);
		if (tabIndex === -1) return;

		const wasActive = activeTab.current === id;
		const nextActiveId =
			(tabIndex > 0 ? openTabs.current[tabIndex - 1] : openTabs.current[1])?.id ?? '';

		openTabs.current.splice(tabIndex, 1);
		if (wasActive) activeTab.current = nextActiveId;
	}

	async function deleteFile(id: string) {
		const fileIndex = filesMeta.current.findIndex((f) => f.id === id);
		if (fileIndex !== -1) filesMeta.current.splice(fileIndex, 1);
		await closeTab(id);
		await deleteFileData(id);
	}

	let activeFileMeta = $derived(filesMeta.current.find((file) => file.id === activeTab.current));
	let filesById = $derived(new Map(filesMeta.current.map((f) => [f.id, f])));

	let draftName = $state('');
	let draftDescription = $state('');

	$effect(() => {
		draftName = activeFileMeta?.name ?? '';
		draftDescription = activeFileMeta?.description ?? '';
	});

	function commitName() {
		if (activeFileMeta) activeFileMeta.name = draftName;
	}

	function commitDescription() {
		if (activeFileMeta) activeFileMeta.description = draftDescription;
	}
</script>

<section class=" flex h-full min-h-0 grow flex-col overflow-hidden p-2">
	<header class="bg-card">
		<Menubar.Root class="border-input bg-background/80 border-b-0">
			<Menubar.Menu>
				<IconCircuity class="size-6" />
				<Menubar.Trigger>File</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item onclick={newTab}>New File</Menubar.Item>
					<Menubar.Sub>
						<Menubar.SubTrigger>Open Recent...</Menubar.SubTrigger>
						<Menubar.SubContent
							align="start"
							class="max-h-96 max-w-64 overflow-x-hidden overflow-y-auto"
						>
							{#each [...filesMeta.current].sort((a, b) => b.created - a.created) as file}
								<Menubar.Item class="flex w-full justify-between" onclick={() => openFile(file.id)}
									><span class=" truncate">{file.name}</span><span
										class="text-foreground/50 w-max text-xs text-nowrap"
										>{formatDistanceToNow(file.created, { addSuffix: true })}</span
									></Menubar.Item
								>
							{/each}
						</Menubar.SubContent>
					</Menubar.Sub>
					<Menubar.Separator />
					<Menubar.Item onclick={() => ((openTabs.current = []), (activeTab.current = ''))}
						>Close all tabs</Menubar.Item
					>
					<Menubar.Separator />
					<Menubar.Item onclick={() => window.print()}>Print</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Edit</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item
						disabled={!activeFile}
						onclick={() => {
							if (activeFileMeta?.id) {
								activeFile && deleteFile(activeFileMeta.id);
							}
						}}>Delete File</Menubar.Item
					>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Selection</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item disabled>Nothing selected</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>View</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item onclick={() => ((openTabs.current = []), (activeTab.current = ''))}
						>Close All Tabs</Menubar.Item
					>
				</Menubar.Content>
			</Menubar.Menu>
		</Menubar.Root>
	</header>

	<Card.Root class=" h-full min-h-0 grow overflow-hidden border-0 bg-transparent p-0">
		<Tabs.Root bind:value={activeTab.current} class="h-full min-h-0 grow overflow-hidden">
			<Tabs.List
				variant="seamless"
				class="bg-background/80  no-scrollbar flex h-9!  gap-0 overflow-x-auto overflow-y-hidden border-x *:relative *:border-t-0 *:border-l-0! "
			>
				{#each openTabs.current as tab, i}
					<div
						class=" group relative flex h-full w-fit max-w-64 min-w-24 truncate overflow-hidden *:border-l-0!"
					>
						<Tooltip.Provider delayDuration={700}>
							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child({ props }: any)}
										<Tabs.Trigger
											{...props}
											value={tab.id}
											onpointerdown={(e: PointerEvent) => {
												if (e.button !== 0) e.preventDefault();
											}}
											onauxclick={(e: MouseEvent) => {
												if (e.button === 1) closeTab(tab.id);
											}}
											class="not-data-active:bg-background/80! not-data-active:hover:bg-card! peer data-active:border-t-brand-primary! w-full grow justify-start overflow-hidden pr-8"
											><span class="truncate"
												>{filesById.get(tab.id)?.name ?? 'Untitled'}
											</span></Tabs.Trigger
										>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{filesById.get(tab.id)?.name}</p>
								</Tooltip.Content>
							</Tooltip.Root>

							<Tooltip.Root>
								<Tooltip.Trigger class="">
									{#snippet child({ props }: any)}
										<Button
											{...props}
											variant="ghost"
											class="group-hover:text-foreground peer-data-active:text-foreground hover:bg-card-foreground/20! absolute top-0 right-1.5 bottom-0 my-auto aspect-auto size-6 -translate-0 text-transparent "
											onclick={() => closeTab(tab.id)}><IconXRegular class="size-4" /></Button
										>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content sideOffset={4}>
									<p>close</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					</div>
				{/each}
				<div class="flex h-full w-full min-w-0 flex-1 grow items-center border-y! border-r!">
					<Button variant="ghost" onclick={newTab}><IconPlusRegular class="size-4 " /></Button>
				</div>
			</Tabs.List>
			<Card.Content class="bg-card h-full min-h-0 grow overflow-hidden border border-t-0 p-0 ">
				<SvelteFlowProvider>
					<DndProvider>
						<Resizable.PaneGroup
							direction="horizontal"
							class=" h-full min-h-0 w-full grow overflow-hidden rounded-lg "
						>
							<Resizable.Pane defaultSize={75} minSize={40} class="min-h-0 min-w-0 overflow-hidden">
								<Tabs.Root value="Diagram" class="h-full grow gap-0 overflow-hidden">
									<header class="flex w-full items-center gap-4 border-b p-4">
										<section class="flex min-w-0 flex-1 flex-col">
											{#if activeFileMeta}
												{#key activeFileMeta.id}
													<form
														class="relative inline-flex w-max max-w-full min-w-0 items-center gap-1"
													>
														<input
															type="text"
															maxlength="45"
															bind:value={draftName}
															onblur={commitName}
															class="peer absolute inset-0 z-10 w-full min-w-0 text-xl outline-0!"
														/>
														<span class="pointer-events-none max-w-full truncate text-xl opacity-0"
															>{draftName || ' '}</span
														>
														<IconEditRegular class="z-0 shrink-0 opacity-50 peer-focus:opacity-0" />
													</form>
													<form>
														<input
															type="text"
															bind:value={draftDescription}
															placeholder="no description"
															onblur={commitDescription}
															class="text-foreground/80 outline-0!"
														/>
													</form>
												{/key}
											{/if}
										</section>
										<Tabs.List class="shrink-0 gap-2 bg-transparent pr-4">
											<Tabs.Trigger value="Diagram"><IconGraphRegular /> Diagram</Tabs.Trigger>
											<Tabs.Trigger value="Outline"><IconTableRegular /> Outline</Tabs.Trigger>
											<Tabs.Trigger value="Code"><IconCodeRegular /> Code</Tabs.Trigger>
											<Tabs.Trigger value="Raw"><IconCodeRegular /> Raw</Tabs.Trigger>
										</Tabs.List>
										<section class="flex shrink-0 gap-0">
											<Button variant="outline" size="icon" class="border-r-0"
												><IconMinusRegular /></Button
											>
											<Input value="100" class="w-16 border-x-0 bg-transparent!" />
											<Button variant="outline" size="icon" class="border-l-0"
												><IconPlusRegular /></Button
											>
										</section>
									</header>

									<!-- Diagram tab: Graph now needs no rawPayload prop at all -->
									<Tabs.Content value="Diagram" class="p-0">
										<Graph controls enableContext />
									</Tabs.Content>

									<Tabs.Content value="Outline" class="overflow-y-auto p-4">
										{#if activeFile.current?.agents.length}
											<ul class="flex flex-col gap-2">
												{#each activeFile.current.agents as agent}
													<li class="rounded-md border p-2">
														<p class="font-medium">{agent.name}</p>
														<p class="text-foreground/70 text-sm">{agent.description}</p>
													</li>
												{/each}
											</ul>
										{:else}
											<p class="text-foreground/50">No agents in this graph yet.</p>
										{/if}
									</Tabs.Content>

									<Tabs.Content value="Code" class="relative flex min-h-0 flex-1 overflow-hidden">
										{#key activeFileMeta}
											<CodePane bind:data={codePaneContent} onchange={onCodePaneChange} />
										{/key}
									</Tabs.Content>
									<Tabs.Content value="Raw" class="relative flex min-h-0 flex-1 overflow-hidden">
										{#key activeFileMeta}
											<CodePane
												data={JSON.stringify(activeFile.current, null, 4)}
												onchange={() => {}}
											/>
										{/key}
									</Tabs.Content>
								</Tabs.Root>
							</Resizable.Pane>
							<Resizable.Handle />
							<Resizable.Pane defaultSize={25} minSize={10}>
								<Resizable.PaneGroup direction="vertical">
									<Resizable.Pane defaultSize={25} minSize={10}>
										<Tabs.Root
											value={sessCtx.selectedAgent ? 'Inspector' : 'Agents'}
											class="h-full grow"
										>
											<Tabs.List variant="line" class="*:after:bg-brand-primary">
												<Tabs.Trigger value="Agents">Agents</Tabs.Trigger>
												<Tabs.Trigger value="Inspector">Inspector</Tabs.Trigger>
												<Tabs.Trigger value="Session">Session</Tabs.Trigger>
											</Tabs.List>
											<Tabs.Content
												value="Agents"
												class="flex min-h-0 grow flex-col overflow-y-auto p-2 "
											>
												<MarketPane source="marketplace" />
											</Tabs.Content>
											<Tabs.Content
												value="Local"
												class="flex min-h-0 grow flex-col overflow-y-auto p-2"
											>
												<MarketPane source="local" />
											</Tabs.Content>
											<Tabs.Content
												value="Inspector"
												class="flex min-h-0 grow flex-col overflow-y-auto"
											>
												<!-- {#key sessCtx.selectedAgent} -->
												<Tabs.Root value="Settings">
													<Tabs.List variant="line" class="*:after:bg-brand-primary">
														<Tabs.Trigger value="Settings">Settings</Tabs.Trigger>
														<Tabs.Trigger value="Tools">Tools</Tabs.Trigger>
														<Tabs.Trigger value="Groups">Groups</Tabs.Trigger>
													</Tabs.List>
													<Tabs.Content value="Settings" class="p-2">
														<AgentPane />
													</Tabs.Content>
													<Tabs.Content value="Tools" class="p-2">
														<ToolsPane />
													</Tabs.Content>
													<Tabs.Content value="Groups" class="p-2">
														<GroupsPane />
													</Tabs.Content>
												</Tabs.Root>
												<!-- {/key} -->
											</Tabs.Content>
											<Tabs.Content value="Session" class="p-2">
												<SessionPane />
											</Tabs.Content>
										</Tabs.Root>
									</Resizable.Pane>
									<!-- <Resizable.Handle />
							<Resizable.Pane defaultSize={75} minSize={10}>
								<Tabs.Root value="Agent">
									<Tabs.List variant="line" class="*:after:bg-brand-primary">
										<Tabs.Trigger value="Agent">Agent</Tabs.Trigger>
										<Tabs.Trigger value="Tools">Tools</Tabs.Trigger>
										<Tabs.Trigger value="Groups">Groups</Tabs.Trigger>
										<Tabs.Trigger value="Session">Session</Tabs.Trigger>
									</Tabs.List>
									<Tabs.Content value="Agent" class="p-2">
										<AgentPane />
									</Tabs.Content>
									<Tabs.Content value="Tools" class="p-2">
										<ToolsPane />
									</Tabs.Content>
									<Tabs.Content value="Groups" class="p-2">
										<GroupsPane />
									</Tabs.Content>
									<Tabs.Content value="Session" class="p-2">
										<SessionPane />
									</Tabs.Content>
								</Tabs.Root>
							</Resizable.Pane> -->
								</Resizable.PaneGroup>
							</Resizable.Pane>
						</Resizable.PaneGroup>
					</DndProvider>
				</SvelteFlowProvider>
			</Card.Content>
		</Tabs.Root>
	</Card.Root>
</section>
