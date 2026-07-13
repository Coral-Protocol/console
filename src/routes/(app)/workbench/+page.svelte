<script lang="ts">
	import DiagonalLines from './DiagonalLines.svelte';

	import DeleteWarning from './DeleteWarning.svelte';

	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import Header from '$lib/components/header.svelte';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import IconCircle from 'phosphor-icons-svelte/IconCircleFill.svelte';
	import IconPlusRegular from 'phosphor-icons-svelte/IconPlusRegular.svelte';
	import IconMinusRegular from 'phosphor-icons-svelte/IconMinusRegular.svelte';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import type { components, paths } from '$generated/api';

	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { PersistedState, PressedKeys } from 'runed';

	import IconCodeRegular from 'phosphor-icons-svelte/IconCodeRegular.svelte';
	import IconTableRegular from 'phosphor-icons-svelte/IconTableRegular.svelte';
	import IconGraphRegular from 'phosphor-icons-svelte/IconGraphRegular.svelte';
	import IconEditRegular from 'phosphor-icons-svelte/IconPencilSimpleLineRegular.svelte';

	import { SvelteFlowProvider } from '@xyflow/svelte';
	import Graph from '$lib/components/Graph/Graph.svelte';
	import CodePane from './panes/CodePane.svelte';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { format, formatDistanceToNow } from 'date-fns';
	import MarketPane from './panes/MarketPane.svelte';
	import { appContext } from '$lib/context';
	import { setSessionContext, type SessionCreatorContext } from '$lib/sessionCreatorContext';
	import AgentPane from './panes/AgentPane.svelte';
	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import ToolsPane from './panes/ToolsPane.svelte';
	import GroupsPane from './panes/GroupsPane.svelte';
	import SessionPane from './panes/SessionPane.svelte';
	import {
		filesMeta,
		deleteFileData,
		deleteFileDataDelta,
		updateFileDataFromDelta,
		hasFileDataDelta,
		hasFileData,
		type FileMeta,
		type FileData,
		zodErrorsToFileErrors,
		validateRequest,
		updateFileMeta
	} from '$lib/fileStorage.svelte.js';
	import DndProvider, { useDnD } from '$lib/components/DndProvider.svelte';
	import { toSessionRequest, fromSessionRequest } from '$lib/payloadConstructor.svelte';
	import { activeFile } from '$lib/activeFile.svelte';
	import { file, z, ZodError, type length } from 'zod';
	import { keys } from '$lib/keyHandler.svelte';
	import { toast } from 'svelte-sonner';
	import { debugMode } from '$lib/debugMode.svelte';
	import { Spinner } from '@coral-os/component-library/components/ui/spinner/index.js';
	import { Session } from '$lib/session.svelte';
	import { shortcut } from '$lib/actions/shortcut.svelte';
	import { onMount, tick } from 'svelte';
	import { json } from '@sveltejs/kit';
	import { SessionRequest } from '$generated/api.zod';
	import { randomAdjective, randomAnimal, randomPlant } from '$lib/words';

	type Tab = { id: string };

	const isShiftPressed = $derived(keys.has('Shift'));
	const isMobile = new IsMobile();

	let ctx = appContext.get();

	let sessCtx = $state({
		selectedAgentClientId: undefined,
		availableAgents: null
	}) as SessionCreatorContext;

	setSessionContext(sessCtx);

	const tabs = new PersistedState<Tab[]>('workbench:tabs', []);
	const activeTab = new PersistedState<string>('workbench:activeTab', '');

	$effect(() => {
		const tabId = activeTab.current;
		if (!tabId) {
			activeFile.close();
			return;
		}
		activeFile.open(tabId);
	});

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
		const fileId = crypto.randomUUID();

		const fileName = uniqueName(
			'Untitled',
			Object.values(filesMeta.current).map((f) => f.name)
		);

		filesMeta.current = {
			...filesMeta.current,
			[fileId]: {
				name: fileName,
				created: Date.now()
			}
		};

		tabs.current.push({ id: fileId });
		activeTab.current = fileId;
	}

	let showDeleteConfirmation = $state(false);
	let tabToClose = $state<string | null>(null);

	const tabToCloseName = $derived(tabToClose ? (filesMeta.current[tabToClose]?.name ?? '') : '');

	async function closeTab(id: string, force = false) {
		try {
			const [hasDelta, hasData] = await Promise.all([hasFileDataDelta(id), hasFileData(id)]);

			if (hasDelta && !force) {
				tabToClose = id;
				showDeleteConfirmation = true;
				return;
			}

			if (!hasData) {
				const { [id]: _, ...rest } = filesMeta.current;
				filesMeta.current = rest;
			}
			await deleteFileDataDelta(id);

			showDeleteConfirmation = false;
			removeTab(id);
		} catch (error) {
			console.error(error);
		}
	}

	function removeTab(id: string) {
		const index = tabs.current.findIndex((tab) => tab.id === id);
		if (index < 0) return;

		const wasActive = activeTab.current === id;

		const remainingTabs = tabs.current.filter((tab) => tab.id !== id);
		tabs.current = remainingTabs;

		if (wasActive) {
			activeTab.current = remainingTabs[Math.max(0, index - 1)]?.id ?? remainingTabs[0]?.id ?? '';
		}

		tabToClose = null;
		showDeleteConfirmation = false;

		updateFileMeta(id, { edited: undefined });
	}

	function openFile(id: string) {
		const alreadyOpen = tabs.current.some((tab) => tab.id === id);
		if (!alreadyOpen) {
			tabs.current.push({ id });
		}
		activeTab.current = id;
	}

	// async function deleteFile(id: string) {
	// 	const fileIndex = filesMeta.current.findIndex((f) => f.id === id);
	// 	if (fileIndex !== -1) filesMeta.current.splice(fileIndex, 1);
	// 	await closeTab(id);
	// 	await deleteFileData(id);
	// }

	let draftName = $state('');
	let draftDescription = $state('');

	$effect(() => {
		draftName = activeFile.meta?.name ?? '';
		draftDescription = activeFile.meta?.description ?? '';
	});

	let recentFiles = $derived(
		Object.entries(filesMeta.current)
			.map(([id, file]) => ({ ...file, id }))
			.sort((a, b) => b.created - a.created)
	);

	// INFO: a note on how this all works:
	// when a tab is clicked on, it will get activeFile to "open" the file with the tab id, which is a shared ID between tabs, file meta data, file data, and file data delta
	// activeFile is then populated from fileStorage.svelte.ts
	// the activeFile data, and meta, is displayed across the page
	// any changes made will use functions provided by activeFile, for example, activeFile.updateAgent, or activeFile.addAgent, this is how changes are made
	// when any changes are made using these functions, it will commit an update to the current data in activeFile, replacing the previous values, the ui reads from this, so it will display as expected
	// activeFile has two main parts: data, and meta, meta is stored in localStorage, data is stored in IndexedDB
	// when commiting updated activeData, it will save these changes to a new store in IndexedDB, as "unsaved-data"
	// this allows tabs to maintain data of unsaved changes, without overwriting the files previously saved changes
	// when desired, you can call activeFile.save, to commit the changes from unsaved-data, to saved-data, removing the unsaved-data in the process, and merging/overwriting any previous data inside the saved-data store
	// so effectively, each file is:
	// meta to store its name, description, stats, etc
	// unsaved-data to store changes
	// saved-data to store saved changes
	// and the ui just calls update/get calls appropriately.

	// also if you close a tab and the file has no delta or data, the files meta is deleted.
	let sendingRequest = $state(false);
	let validation = $state('successful');

	async function createSession(): Promise<void> {
		if (
			activeFile.current !== null &&
			validation === 'successful' &&
			activeFile.current?.agents.length > 0
		) {
			activeFile.updateAnnotations({
				sessionName: uniqueName(
					draftName,
					Object.values(ctx.server.sessions)
						.map((f) => f.annotations.sessionName)
						.filter((name): name is string => typeof name === 'string')
				)
			});

			sendingRequest = true;
			if (activeFile.current !== null) {
				try {
					toast.promise(
						(async () => {
							const body = toSessionRequest(activeFile.current!, 'submission');
							const res = await ctx.server.api.POST('/api/v1/local/session', { body });
							('');
							if (res.error) {
								let error: { message?: string; stackTrace?: string[] } = res.error;
								throw new Error(error.message ?? 'Failed to create session');
							}

							if (!res.data) {
								throw new Error('no data received');
							}

							ctx.session = new Session({
								sessionId: res.data.sessionId,
								namespace: ctx.server.namespace,
								server: ctx.server
							});
						})(),
						{
							loading: 'Creating session...',
							success: 'Session created',
							error: (e: unknown) =>
								`Failed to create session: ${(e instanceof Error ? e.message : e) ?? e}`
						}
					);
				} catch (e) {
					console.error(e);
				} finally {
					sendingRequest = false;
				}
			}
		}
	}

	const saveFile = async () => {
		if (activeFile.current?.id) {
			const hasDelta = await hasFileDataDelta(activeFile.current.id);

			if (hasDelta) {
				toast.promise(activeFile.save(), {
					loading: 'Saving file...',
					success: `File saved`,
					error: 'Failed to save file'
				});
			}
		}
	};

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<svelte:window
	use:shortcut={{
		key: 's',
		ctrl: true,
		callback: (event: KeyboardEvent) => {
			if (event.repeat) return;
			saveFile();
		}
	}}
/>

<DeleteWarning bind:showDeleteConfirmation name={tabToCloseName} id={tabToClose} {closeTab} />

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
							{#each recentFiles as file}
								<Menubar.Item class="flex w-full justify-between" onclick={() => openFile(file.id)}>
									<span class="truncate">{file.name}</span>
									<span class="text-foreground/50 w-max text-xs text-nowrap">
										{formatDistanceToNow(file.created, { addSuffix: true })}
									</span>
								</Menubar.Item>
							{/each}
						</Menubar.SubContent>
					</Menubar.Sub>
					<Menubar.Separator />
					<Menubar.Item
						disabled={tabs.current.length <= 0}
						onclick={() => {
							// close tabs that do NOT have an edited timestamp on their file meta
							for (const tab of tabs.current.filter((t) => !filesMeta.current[t.id]?.edited))
								closeTab(tab.id);
							if (!tabs.current.find((t) => t.id === activeTab.current)) activeTab.current = '';
						}}>Close all saved files</Menubar.Item
					>
					<Menubar.Separator />
					<Menubar.Item onclick={saveFile}>Save</Menubar.Item>
					<Menubar.Item disabled>Save as</Menubar.Item>

					<Menubar.Separator />

					<Menubar.Item onclick={() => window.print()}>Print</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Edit</Menubar.Trigger>
				<Menubar.Content>
					<!-- <Menubar.Item
						disabled={!activeFile}
						onclick={() => {
							if (activeFile.meta?.id) {
								activeFile && deleteFile(activeFile.meta.id);
							}
						}}>Delete File</Menubar.Item
					> -->
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
					<Menubar.Item
						onclick={() => {
							for (const tab of tabs.current.filter((t) => !filesMeta.current[t.id]?.edited))
								closeTab(tab.id);
							if (!tabs.current.find((t) => t.id === activeTab.current)) activeTab.current = '';
						}}>Close All Tabs</Menubar.Item
					>
					<!-- need to make these tabs go visually first instead of one by one, leave that in the backend id say -->
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
				{#each tabs.current as tab, i}
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
											><span class="truncate {filesMeta.current[tab.id]?.edited ? 'italic' : ''}"
												>{filesMeta.current[tab.id]?.name ?? ''}
											</span></Tabs.Trigger
										>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>
										{filesMeta.current[tab.id]?.name ?? ''}
										{#if filesMeta.current[tab.id]?.edited}
											<span class="text-muted-foreground text-xs">(unsaved)</span>
										{/if}
									</p>
								</Tooltip.Content>
							</Tooltip.Root>

							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child({ props }: any)}
										<Button
											{...props}
											variant="ghost"
											class="group-hover:text-foreground group/button peer-data-active:text-foreground hover:bg-card-foreground/20! absolute top-0 right-1.5 bottom-0 my-auto aspect-auto size-6 -translate-0 text-transparent "
											onclick={() => closeTab(tab.id)}
											><IconXRegular
												class="peer absolute top-0 bottom-0 m-auto size-4 {filesMeta.current[tab.id]
													?.edited
													? 'opacity-0 group-hover/button:opacity-100'
													: ''}"
											/>
											<IconCircle
												class="absolute top-0 bottom-0 m-auto size-2.5 opacity-0 {filesMeta.current[
													tab.id
												]?.edited
													? 'text-foreground/80 opacity-100 group-hover/button:opacity-0'
													: ''}"
											/></Button
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
				<div
					class="flex h-full w-full min-w-0 flex-1 grow items-center border-y! border-r!"
					onauxclick={(e: MouseEvent) => {
						if (e.button === 1) newTab();
					}}
				>
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
							<Resizable.Pane
								defaultSize={75}
								minSize={40}
								class="relative min-h-0 min-w-0 overflow-hidden"
							>
								{#if mounted}
									{#if tabs.current.length >= 1}
										<Tabs.Root value="Diagram" class="relative h-full grow gap-0 overflow-hidden">
											<header class="flex h-[85px] w-full items-center gap-4 border-b p-4">
												<section class="flex min-w-0 flex-1 flex-col">
													{#if activeFile.meta}
														{#key activeFile.meta}
															<form
																class="relative inline-flex w-max max-w-full min-w-0 items-center gap-1"
															>
																<input
																	type="text"
																	maxlength="45"
																	bind:value={draftName}
																	onfocus={async (e) => {
																		if (/^Untitled \d+$/.test(e.currentTarget.value)) {
																			e.currentTarget.value = uniqueName(
																				`${randomAdjective()} ${randomAnimal()}`,
																				Object.values(filesMeta.current).map((f) => f.name)
																			);
																			draftName = e.currentTarget.value;
																		}
																		e.currentTarget.select();
																	}}
																	onblur={() => {
																		activeFile.updateMeta({ name: draftName });
																	}}
																	class="peer absolute inset-0 z-10 w-full min-w-0 text-xl outline-0!"
																/>
																<span
																	class="pointer-events-none max-w-full truncate text-xl opacity-0"
																	>{draftName || ' '}</span
																>
																{#if /^Untitled \d+$/.test(draftName)}
																	<!-- TODO: shouldnt be a regex test everytime but ill fix this later -->
																	<IconEditRegular
																		class="z-0 shrink-0 opacity-50 peer-focus:opacity-0"
																	/>
																{/if}
															</form>
															<form>
																<input
																	type="text"
																	placeholder="no description"
																	bind:value={draftDescription}
																	onchange={() => {
																		const id = activeFile?.current?.id;
																		if (id && filesMeta.current[id])
																			filesMeta.current[id].description = draftDescription ?? '';
																	}}
																	class="text-foreground/80 outline-0!"
																/>
															</form>
														{/key}
													{/if}
												</section>
												<Tabs.List class="shrink-0 gap-2 bg-transparent pr-4">
													<Button
														class="opacity-0 {isShiftPressed
															? 'hover:opacity-100 '
															: 'pointer-events-none'}"
														data-shift
														onclick={(e: { shiftKey: any }) => {
															debugMode.current = !debugMode.current;
														}}>Debug mode</Button
													>
													<Tabs.Trigger value="Diagram"><IconGraphRegular /> Diagram</Tabs.Trigger>
													<Tabs.Trigger value="Outline"><IconTableRegular /> Outline</Tabs.Trigger>
													<Tabs.Trigger value="Code">
														<IconCodeRegular />
														Code
													</Tabs.Trigger>
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
											<Tabs.Content value="Diagram" class="p-0">
												<Graph controls enableContext />
												{#if debugMode.current === true}
													<section
														class="bg-destructive/10 text-destructive absolute top-40 left-0 z-50 flex w-fit flex-col gap-2 p-2 text-sm"
													>
														<span>active file id: {activeFile.current?.id}</span>

														{#if activeFile.meta?.created}
															<span>file created: {format(activeFile.meta.created, 'Pp')}</span>
														{/if}
														{#if activeFile.meta?.saved}
															<span>file saved: {format(activeFile.meta.saved, 'Pp')}</span>
														{/if}
														{#if activeFile.meta?.edited}
															<span>file edited: {format(activeFile.meta.edited, 'Pp')}</span>
														{/if}
														<span>file name: {activeFile.meta?.name}</span>
														<span>file description: {activeFile.meta?.description}</span>
														<span>files: {Object.entries(filesMeta.current).length}</span>
														<span>tabs: {tabs.current.length}</span>
														<span>tab id: {activeTab.current}</span>

														<Separator />
														<span>selected agent client id: {sessCtx.selectedAgentClientId}</span>
														<span>file agents: {activeFile.current?.agents.length}</span>
													</section>
												{/if}
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

											<Tabs.Content
												value="Code"
												class="relative flex min-h-0 flex-1 flex-col overflow-hidden"
											>
												{#if activeFile.current}
													{#key activeFile.meta}
														{#if debugMode.current === true}
															<CodePane
																data={JSON.stringify(activeFile.current, null, 4)}
																onchange={() => {}}
															/>
														{:else}
															<CodePane
																data={JSON.stringify(
																	toSessionRequest(activeFile.current as FileData),
																	null,
																	4
																)}
																onchange={() => {}}
															/>
														{/if}
													{/key}
												{/if}
											</Tabs.Content>
										</Tabs.Root>
									{:else if tabs?.current !== null}
										<DiagonalLines />
										<div
											class="absolute top-1/2 left-1/2 flex h-fit min-h-42 w-fit min-w-1/2 -translate-1/2 flex-col gap-4"
										>
											<h1 class="text-center text-xl">Coral Console Workbench</h1>
											<div class="flex gap-4">
												<section class="flex w-full grow flex-col gap-2">
													<span>Recent</span>
													{#each recentFiles as file}
														<Button
															variant="link"
															class="text-brand-primary flex w-full justify-between"
															onclick={() => openFile(file.id)}
														>
															<span class="truncate">{file.name}</span>
															{#if file.saved}
																<span class="text-foreground/50 w-max text-xs text-nowrap">
																	{formatDistanceToNow(file.saved, { addSuffix: true })}
																</span>
															{/if}
														</Button>
													{:else}
														<span class="text-foreground/50">no recent files</span>
													{/each}
												</section>
												<Separator orientation="vertical" class="min-h-42" />
												<section class="flex w-full grow flex-col gap-2">
													<span>Actions</span>
													<Button
														variant="link"
														class="text-brand-primary flex justify-between"
														onclick={() => newTab()}
													>
														New file
													</Button>
													<Button
														variant="link"
														disabled
														class="text-brand-primary flex justify-between"
														onclick={() => newTab()}
													>
														Open file
													</Button>
													<Button
														disabled
														variant="link"
														class="text-brand-primary flex justify-between"
														onclick={() => newTab()}
													>
														Import file
													</Button>
												</section>
											</div>
										</div>
									{/if}
								{:else}
									<Spinner
										class="absolute top-1/2 right-1/2 bottom-1/2 left-1/2 size-6 -translate-1/2"
									/>{/if}
							</Resizable.Pane>
							<Resizable.Handle />
							<Resizable.Pane defaultSize={35} minSize={10}>
								<Resizable.PaneGroup direction="vertical">
									<Resizable.Pane defaultSize={35} minSize={10}>
										<Tabs.Root
											value={sessCtx.selectedAgentClientId ? 'Inspector' : 'Agents'}
											class="h-full grow gap-0"
										>
											<Tabs.List
												variant="line"
												class="*:after:bg-brand-primary w-full justify-start border-b"
											>
												<Tabs.Trigger value="Agents">Agents</Tabs.Trigger>
												<Tabs.Trigger value="Inspector">Inspector</Tabs.Trigger>
												<Tabs.Trigger value="Groups">Groups</Tabs.Trigger>
												<Tabs.Trigger value="Tools">Tools</Tabs.Trigger>
												<Tabs.Trigger value="Session">Settings</Tabs.Trigger>
												<!-- <Tabs.Trigger value="Errors">Errors</Tabs.Trigger> -->
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
												<AgentPane />
											</Tabs.Content>
											<Tabs.Content value="Session" class="p-2">
												<SessionPane />
											</Tabs.Content>
											<Tabs.Content value="Tools" class="p-2">
												<!-- <ToolsPane /> -->
											</Tabs.Content>
											<Tabs.Content value="Groups" class="p-2">
												<GroupsPane />
											</Tabs.Content>
											<Tabs.Content value="Errors" class="p-2">
												{#each Object.entries(activeFile.current?.errors ?? {}) as error}
													{JSON.stringify(error)}
												{/each}
											</Tabs.Content>
										</Tabs.Root>
									</Resizable.Pane>
									<Resizable.Handle />
									<Resizable.Pane
										defaultSize={4}
										minSize={2}
										maxSize={5}
										class="flex items-center justify-end gap-2 px-2 align-middle"
									>
										<Button
											variant="secondary"
											disabled={activeFile.current
												? !filesMeta.current[activeFile.current.id]?.edited
												: false}
											onclick={saveFile}
										>
											<!-- <Spinner /> -->
											Save request</Button
										>

										<Button
											onclick={async (e: { shiftKey: any }) => {
												const validationErrors = await validateRequest(ctx.server);

												if (!validationErrors || e.shiftKey) {
													createSession();
												} else {
													toast.error('Session body contains errors', {
														description:
															'Hold shift when creating a session to ignore validation errors and continue anyway'
													});
												}
											}}
											disabled={sendingRequest}
										>
											{#if sendingRequest}
												<Spinner />
											{/if}
											Create session</Button
										>
										{#if activeFile.current?.errors}
											<Tooltip.Root>
												<Tooltip.Trigger>
													<Button>!</Button>
												</Tooltip.Trigger>
												<Tooltip.Content>Session request body contains errors</Tooltip.Content>
											</Tooltip.Root>
										{/if}
									</Resizable.Pane>
								</Resizable.PaneGroup>
							</Resizable.Pane>
						</Resizable.PaneGroup>
					</DndProvider>
				</SvelteFlowProvider>
			</Card.Content>
		</Tabs.Root>
	</Card.Root>
</section>
