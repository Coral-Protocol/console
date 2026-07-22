<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';

	import { format, formatDistanceToNow } from 'date-fns';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { SvelteFlowProvider, useOnSelectionChange } from '@xyflow/svelte';
	import { toast } from 'svelte-sonner';
	import { toggleMode } from 'mode-watcher';

	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as ContextMenu from '@coral-os/component-library/ui/context-menu/index.js';
	import * as Kbd from '@coral-os/component-library/ui/kbd/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Spinner } from '@coral-os/component-library/components/ui/spinner/index.js';

	import IconCheckRegular from 'phosphor-icons-svelte/IconCheckRegular.svelte';
	import IconCircle from 'phosphor-icons-svelte/IconCircleFill.svelte';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import IconCodeRegular from 'phosphor-icons-svelte/IconCodeRegular.svelte';
	import IconEditRegular from 'phosphor-icons-svelte/IconPencilSimpleLineRegular.svelte';
	import IconFolder from 'phosphor-icons-svelte/IconFolderRegular.svelte';
	import IconGearRegular from 'phosphor-icons-svelte/IconGearRegular.svelte';
	import IconGraphRegular from 'phosphor-icons-svelte/IconGraphRegular.svelte';
	import IconMinusRegular from 'phosphor-icons-svelte/IconMinusRegular.svelte';
	import IconPlusRegular from 'phosphor-icons-svelte/IconPlusRegular.svelte';
	import IconQuestion from 'phosphor-icons-svelte/IconQuestionRegular.svelte';
	import IconSearch from 'phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte';
	import IconTableRegular from 'phosphor-icons-svelte/IconTableRegular.svelte';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import MoonIcon from 'phosphor-icons-svelte/IconMoonRegular.svelte';
	import SunIcon from 'phosphor-icons-svelte/IconSunRegular.svelte';

	import DndProvider, { useDnD } from '$lib/components/DndProvider.svelte';
	import Graph from '$lib/components/Graph/Graph.svelte';
	import NamespaceSwitcher from '$lib/components/namespace-switcher.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { tourTarget } from '$lib/components/tour/tourTarget';
	import Quickswitch from '$lib/components/dialogs/quickswitch.svelte';
	import Shortcuts from '$lib/components/dialogs/shortcuts.svelte';
	import Welcome from '$lib/components/dialogs/welcome.svelte';
	import Logo from '$lib/icons/logo.svelte';

	import ConfirmDialog from './ConfirmDialog.svelte';
	import DiagonalLines from './DiagonalLines.svelte';
	import FileExplorer from './FileExplorer.svelte';
	import MarketPane from './panes/Agents.svelte';
	import CodePane from './panes/Code.svelte';
	import GroupsPane from './panes/Groups.svelte';
	import Inspector from './panes/Inspector.svelte';
	import Outline from './panes/Outline.svelte';
	import SessionSettings from './panes/SessionSettings.svelte';
	import ToolsPane from './panes/Tools.svelte';

	import { activeFile } from '$lib/activeFile.svelte';
	import { appContext } from '$lib/context';
	import { debugMode } from '$lib/debugMode.svelte';
	import {
		filesMeta,
		hasFileDataDelta,
		validateRequest,
		type FileData,
		type FileMeta
	} from '$lib/fileStorage.svelte.js';
	import { fileTabs, uniqueName, workbenchTabSide, workbenchTabView } from '$lib/fileTabs.svelte';
	import { graphSelection } from '$lib/graphSelection.svelte';
	import { keys } from '$lib/keyHandler.svelte';
	import { fromSessionRequest, toSessionRequest } from '$lib/payloadConstructor.svelte';
	import { Session } from '$lib/session.svelte';
	import { setSessionContext, type SessionCreatorContext } from '$lib/sessionCreatorContext';
	import { randomAdjective, randomAnimal, randomPlant } from '$lib/words';
	import { shortcut } from '$lib/actions/shortcut.svelte';

	const isShiftPressed = $derived(keys.has('Shift'));

	let ctx = appContext.get();

	let sessCtx = $state({
		selectedAgentIds: [],
		availableAgents: null,
		graphSelectionDragging: false
	}) as unknown as SessionCreatorContext;

	setSessionContext(sessCtx);

	let showFileExplorer = $state(false);
	let openQuickswitch = $state(false);
	let openShortcuts = $state(false);
	let debugToolsOpen = $state(false);
	let welcomeOpen = $state(false);
	let tourOpen = $state(false);

	let draftName = $state('');
	let draftDescription = $state('');

	let sendingRequest = $state(false);
	let validation = $state('successful');

	let mounted = $state(false);
	let draggedIndex: number | null = $state(null);

	$effect(() => {
		fileTabs.syncActiveFile();
	});

	$effect(() => {
		draftName = activeFile.meta?.name ?? '';
		draftDescription = activeFile.meta?.description ?? '';
	});

	onMount(() => {
		mounted = true;
	});

	function checkTitle(name: string) {
		return /^Untitled( \d+)?$/.test(name);
	}

	async function createSession(): Promise<void> {
		if (
			activeFile.current !== null &&
			validation === 'successful' &&
			activeFile.current?.agents.length > 0
		) {
			activeFile.updateAnnotations({ sessionName: draftName });

			sendingRequest = true;
			if (activeFile.current !== null) {
				try {
					toast.promise(
						(async () => {
							const body = toSessionRequest(activeFile.current!, 'submission');
							const res = await ctx.server.api.POST('/api/v1/local/session', { body });

							if (res.error) {
								let error: { message?: string; stackTrace?: string[] } = res.error;
								throw new Error(error.message ?? 'Failed to create session');
							}

							if (!res.data) {
								throw new Error('no data received');
							}

							ctx.session = new Session({
								sessionId: res.data.sessionId,
								namespace: res.data.namespace,
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

	async function duplicateFile() {
		if (!activeFile.current) return;
		const sourceData = activeFile.current;
		const sourceMeta = activeFile.meta;

		const newTab = await fileTabs.newTab();
		if (sourceMeta) {
			activeFile.updateMeta({
				name: uniqueName(
					`${sourceMeta.name} copy`,
					Object.values(filesMeta.current).map((f) => f.name)
				),
				description: sourceMeta.description
			});
		}
		activeFile.replace(sourceData);
		toast.success('Duplicated file');
	}

	function deleteCurrentFile() {
		const id = activeFile.current?.id;
		if (!id) return;
		if (activeFile.current && activeFile.current.agents.length === 0) {
			fileTabs.closeFile(fileTabs.activeTab.current);
			return;
		}
		fileTabs.requestDeleteFile(id);
	}

	async function renameCurrentFile() {
		if (!activeFile.meta) return;
		const next = window.prompt('Rename file', activeFile.meta.name ?? '');
		if (next && next.trim()) {
			activeFile.updateMeta({ name: next.trim() });
		}
	}

	function moveTab(from: number, to: number) {
		if (from === to) return;

		const tabs = fileTabs.tabs.current;
		const [moved] = tabs.splice(from, 1);
		if (!moved) return;
		tabs.splice(to, 0, moved);
		fileTabs.tabs.current = tabs;
	}

	async function closeOthers(index: number) {
		const keepId = fileTabs.tabs.current[index]?.id;
		if (!keepId) return;
		for (const t of [...fileTabs.tabs.current]) {
			if (t.id !== keepId) await fileTabs.closeFile(t.id);
		}
	}

	async function closeToRight(index: number) {
		const toClose = fileTabs.tabs.current.slice(index + 1);
		for (const t of toClose) await fileTabs.closeFile(t.id);
	}

	async function closeAllTabs() {
		for (const t of [...fileTabs.tabs.current]) {
			await fileTabs.closeFile(t.id);
		}
	}

	async function copyTabId(id: string) {
		await navigator.clipboard.writeText(id);
		toast.success('Copied file ID');
	}

	async function copyTabName(id: string) {
		const name = filesMeta.current[id]?.name ?? '';
		await navigator.clipboard.writeText(name);
		toast.success('Copied file name');
	}

	function downloadTab(id: string) {
		if (activeFile.current?.id !== id) {
			toast.error('Open this file to download it');
			return;
		}
		const payload = JSON.stringify(toSessionRequest(activeFile.current), null, 2);
		const blob = new Blob([payload], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${filesMeta.current[id]?.name ?? 'session'}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}
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
<Quickswitch {ctx} bind:open={openQuickswitch} bind:debugMenu={debugToolsOpen} />
<Shortcuts bind:open={openShortcuts} />
<Welcome bind:open={welcomeOpen} bind:tourToggle={tourOpen} />
<ConfirmDialog
	bind:open={fileTabs.dialogOpen}
	mode={fileTabs.dialogMode}
	name={fileTabs.dialogFileName}
	id={fileTabs.dialogFileId}
	closeFile={(id: string | null, force: boolean) => {
		if (id !== null) void fileTabs.closeFile(id, force);
	}}
	deleteFile={(id: string | null) => fileTabs.deleteFile(id)}
/>
<FileExplorer bind:open={showFileExplorer} />

<section class=" flex h-full min-h-0 grow flex-col overflow-hidden">
	<header class="bg-card">
		<Menubar.Root class="bg-background/80 border-0">
			<Menubar.Menu>
				<IconCircuity class="size-6" />
				<Menubar.Trigger>File</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item onclick={() => fileTabs.newTab()}>
						New File <Menubar.Shortcut>⌘N</Menubar.Shortcut>
					</Menubar.Item>
					<Menubar.Item onclick={() => (showFileExplorer = true)}>Open file...</Menubar.Item>
					<Menubar.Sub>
						<Menubar.SubTrigger disabled={fileTabs.recentFiles.length === 0}
							>Open Recent</Menubar.SubTrigger
						>

						<Menubar.SubContent
							align="start"
							class="max-h-96 max-w-64 overflow-x-hidden overflow-y-auto"
						>
							{#each fileTabs.recentFiles.slice(0, 15) as file}
								<Menubar.Item
									class="flex w-full justify-between"
									onclick={() => fileTabs.openFile(file.id)}
								>
									<span class="truncate">{file.name}</span>
									<span class="text-foreground/50 w-max text-xs text-nowrap">
										{formatDistanceToNow(file.created, { addSuffix: true })}
									</span>
								</Menubar.Item>
							{/each}
						</Menubar.SubContent>
					</Menubar.Sub>
					<Menubar.Item disabled>Import...</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item disabled={!activeFile.current} onclick={duplicateFile}>
						Duplicate File
					</Menubar.Item>
					<Menubar.Item disabled={!activeFile.meta} onclick={renameCurrentFile}>
						Rename...
					</Menubar.Item>
					<Menubar.Item
						disabled={!activeFile.current}
						class="text-destructive"
						onclick={deleteCurrentFile}
					>
						Delete File
					</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item
						disabled={fileTabs.tabs.current.length <= 0}
						onclick={() => {
							for (const tab of fileTabs.tabs.current.filter(
								(t) => !filesMeta.current[t.id]?.edited
							))
								fileTabs.closeFile(tab.id);
							if (!fileTabs.tabs.current.find((t) => t.id === fileTabs.activeTab.current))
								fileTabs.activeTab.current = '';
						}}
					>
						Close all saved files
					</Menubar.Item>
					<Menubar.Item
						disabled={!fileTabs.activeTab.current}
						onclick={() => fileTabs.closeFile(fileTabs.activeTab.current)}
					>
						Close <Menubar.Shortcut>⌘W</Menubar.Shortcut>
					</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item
						disabled={activeFile.current ? !filesMeta.current[activeFile.current.id]?.edited : true}
						onclick={saveFile}
					>
						Save <Menubar.Shortcut>⌘S</Menubar.Shortcut>
					</Menubar.Item>
					<Menubar.Item disabled>Save as</Menubar.Item>
					<Menubar.Separator />

					<Menubar.Item
						disabled={!fileTabs.activeTab.current}
						onclick={() => downloadTab(fileTabs.activeTab.current)}>Download</Menubar.Item
					>
					<Menubar.Separator />

					<Menubar.Item onclick={() => window.print()}>
						Print <Menubar.Shortcut>⌘P</Menubar.Shortcut>
					</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>

			<Menubar.Menu>
				<Menubar.Trigger>Edit</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item disabled>Undo</Menubar.Item>
					<Menubar.Item disabled>Redo</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item
						disabled={!graphSelection.hasSelection}
						onclick={() => graphSelection.copySelected()}
					>
						Copy
					</Menubar.Item>
					<Menubar.Item
						disabled={!graphSelection.hasClipboard}
						onclick={() => graphSelection.pasteClipboard()}
					>
						Paste
					</Menubar.Item>
					<Menubar.Item
						disabled={!graphSelection.hasSelection}
						onclick={() => graphSelection.duplicateSelected()}
					>
						Duplicate Selection
					</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item
						disabled={!graphSelection.hasSelection}
						class="text-destructive"
						onclick={() => graphSelection.deleteSelected()}
					>
						Delete Selection
					</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>

			<Menubar.Menu>
				<Menubar.Trigger>Selection</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item onclick={() => graphSelection.selectAll()}>Select All</Menubar.Item>
					<Menubar.Item
						disabled={!graphSelection.hasSelection}
						onclick={() => graphSelection.deselectAll()}
					>
						Deselect All
					</Menubar.Item>
					<Menubar.Item onclick={() => graphSelection.invertSelection()}>
						Invert Selection
					</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item disabled>
						{graphSelection.selectedIds.length === 0
							? 'Nothing selected'
							: `${graphSelection.selectedIds.length} agent${graphSelection.selectedIds.length === 1 ? '' : 's'} selected`}
					</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>

			<Menubar.Menu>
				<Menubar.Trigger>View</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item onclick={() => (workbenchTabView.current = 'Diagram')}>
						Diagram
					</Menubar.Item>
					<Menubar.Item onclick={() => (workbenchTabView.current = 'Outline')}>
						Outline
					</Menubar.Item>
					<Menubar.Item onclick={() => (workbenchTabView.current = 'Code')}>Code</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item onclick={() => (workbenchTabSide.current = 'Agents')}>
						Agents Panel
					</Menubar.Item>
					<Menubar.Item onclick={() => (workbenchTabSide.current = 'Inspector')}>
						Inspector Panel
					</Menubar.Item>
					<Menubar.Item onclick={() => (workbenchTabSide.current = 'Groups')}>
						Groups Panel
					</Menubar.Item>
					<Menubar.Item onclick={() => (workbenchTabSide.current = 'Tools')}>
						Tools Panel
					</Menubar.Item>
					<Menubar.Item onclick={() => (workbenchTabSide.current = 'Session')}>
						Session Panel
					</Menubar.Item>
					<Menubar.Separator />
					<Menubar.CheckboxItem
						checked={debugMode.current}
						onCheckedChange={(v: boolean) => (debugMode.current = v)}
					>
						Debug mode
					</Menubar.CheckboxItem>
					<Menubar.Separator />
					<Menubar.Item
						onclick={() => {
							for (const tab of fileTabs.tabs.current.filter(
								(t) => !filesMeta.current[t.id]?.edited
							))
								fileTabs.closeFile(tab.id);
							if (!fileTabs.tabs.current.find((t) => t.id === fileTabs.activeTab.current))
								fileTabs.activeTab.current = '';
						}}
					>
						Close All Tabs
					</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<div
				class=" ml-auto flex items-center justify-end gap-1 pr-0.5"
				use:tourTarget={'quick-switch'}
			>
				<Button
					class="flex h-6 w-fit max-w-64 cursor-text items-center justify-between gap-6 "
					variant="ghost"
					onclick={() => (openQuickswitch = true)}
				>
					<span class="text-muted-foreground flex items-center gap-2">
						<IconSearch />
						<span class="text-sm">Search</span>
					</span>
					<Kbd.Group>
						<Kbd.Root>CTRL</Kbd.Root>
						<Kbd.Root>K</Kbd.Root>
					</Kbd.Group>
				</Button>

				<Separator orientation="vertical" class="!h-6" />

				<Button class="size-6" variant="ghost" onclick={() => (welcomeOpen = true)}>
					<IconQuestion class="size-4" />
				</Button>

				<Separator orientation="vertical" class="!h-6" />

				<Button onclick={toggleMode} variant="ghost" class="size-6">
					<SunIcon
						class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
					/>
					<MoonIcon
						class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>

				<Separator orientation="vertical" class="!h-6" />

				<Popover.Root>
					<Popover.Trigger
						class="{buttonVariants({ variant: 'ghost', size: 'icon' })} aspect-square size-6"
					>
						<IconGearRegular />
					</Popover.Trigger>
					<Popover.Content align="end" sideOffset={5} alignOffset={-4}>
						<Settings />
					</Popover.Content>
				</Popover.Root>
			</div>
		</Menubar.Root>
	</header>

	<Card.Root class=" h-full min-h-0 grow overflow-hidden border-0 bg-transparent p-0">
		<Tabs.Root bind:value={fileTabs.activeTab.current} class="h-full min-h-0 grow overflow-hidden">
			<Tabs.List
				variant="seamless"
				class="bg-background/80 no-scrollbar flex h-9! gap-0 overflow-x-auto overflow-y-hidden border-0 border-transparent *:relative *:border-t-0 *:border-l-0! "
			>
				{#each fileTabs.tabs.current as tab, i}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							{#snippet child({ props }: any)}
								<div
									{...props}
									draggable="true"
									class="group relative flex h-full w-fit max-w-64 min-w-24 truncate overflow-hidden *:border-l-0!"
									ondragstart={() => {
										draggedIndex = i;
									}}
									ondragover={(e: { preventDefault: () => void }) => {
										e.preventDefault();
									}}
									ondrop={() => {
										if (draggedIndex !== null) {
											moveTab(draggedIndex, i);
										}
										draggedIndex = null;
									}}
									ondragend={() => {
										draggedIndex = null;
									}}
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
															if (e.button === 1) fileTabs.closeFile(tab.id);
														}}
														class="not-data-active:bg-background/80! not-data-active:hover:bg-card! peer data-active:border-t-brand-primary! w-full grow justify-start overflow-hidden pr-8"
														><span
															class="truncate {filesMeta.current[tab.id]?.edited ? 'italic' : ''}"
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
														onclick={() => fileTabs.closeFile(tab.id)}
														><IconXRegular
															class="peer absolute top-0 bottom-0 m-auto size-4 {filesMeta.current[
																tab.id
															]?.edited
																? 'opacity-0 group-hover/button:opacity-100'
																: ''}"
														/>
														<IconCircle
															class="absolute top-0 bottom-0 m-auto size-2.5 opacity-0 {filesMeta
																.current[tab.id]?.edited
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
							{/snippet}
						</ContextMenu.Trigger>
						<ContextMenu.Content>
							<ContextMenu.Item onclick={() => fileTabs.closeFile(tab.id)}>Close</ContextMenu.Item>
							<ContextMenu.Item
								disabled={fileTabs.tabs.current.length <= 1}
								onclick={() => closeOthers(i)}
							>
								Close others
							</ContextMenu.Item>
							<ContextMenu.Item
								disabled={i === fileTabs.tabs.current.length - 1}
								onclick={() => closeToRight(i)}
							>
								Close to the right
							</ContextMenu.Item>
							<ContextMenu.Item onclick={closeAllTabs}>Close all</ContextMenu.Item>
							<ContextMenu.Separator />
							<ContextMenu.Item onclick={() => copyTabId(tab.id)}>Copy ID</ContextMenu.Item>
							<ContextMenu.Item onclick={() => copyTabName(tab.id)}>Copy Name</ContextMenu.Item>
							<ContextMenu.Separator />
							<ContextMenu.Item
								disabled={activeFile.current?.id !== tab.id}
								onclick={() => downloadTab(tab.id)}
							>
								Download
							</ContextMenu.Item>
						</ContextMenu.Content>
					</ContextMenu.Root>
				{/each}
				<div
					class="flex h-full w-full min-w-0 flex-1 grow items-center border-y!"
					onauxclick={(e: MouseEvent) => {
						if (e.button === 1) fileTabs.newTab();
					}}
				>
					<Button variant="ghost" onclick={() => fileTabs.newTab()}
						><IconPlusRegular class="size-4 " /></Button
					>
				</div>
			</Tabs.List>
			<Card.Content class="bg-card h-full min-h-0 grow overflow-hidden border-0 p-0 ">
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
									{#if fileTabs.tabs.current.length >= 1}
										<Tabs.Root
											bind:value={workbenchTabView.current}
											class="relative h-full grow gap-0 overflow-hidden"
										>
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
																		if (checkTitle(e.currentTarget.value)) {
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
																		activeFile.updateAnnotations({ sessionName: draftName });
																	}}
																	class="peer absolute inset-0 z-10 w-full min-w-0 text-xl outline-0!"
																/>
																<span
																	class="pointer-events-none max-w-full truncate text-xl opacity-0"
																	>{draftName || ' '}</span
																>
																{#if checkTitle(draftName)}
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
														<span>tabs: {fileTabs.tabs.current.length}</span>
														<span>tab id: {fileTabs.activeTab.current}</span>

														<Separator />
														<span>selected agent client id: {sessCtx.selectedAgentIds}</span>
														<span>file agents: {activeFile.current?.agents.length}</span>
													</section>
												{/if}
											</Tabs.Content>

											<Tabs.Content value="Outline" class="overflow-y-auto ">
												<Outline />
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
									{:else if fileTabs.tabs?.current !== null}
										<DiagonalLines />
										<div
											class="absolute top-1/2 left-1/2 flex h-fit min-h-42 w-fit min-w-1/2 -translate-1/2 flex-col justify-center gap-4 select-none"
										>
											<div class="m-auto flex -translate-y-16 flex-col">
												<div class="flex">
													<div>
														<Logo class="text-foreground size-10" />
													</div>
													<div class="flex flex-col gap-0.5 text-lg leading-none">
														<span class="font-[Oxanium] font-semibold tracking-widest"
															>Coral<span class="text-brand-primary font-bold tracking-normal"
																>OS</span
															>
														</span>
														<span class="text-brand-primary font-sans text-sm">Console</span>
													</div>
												</div>

												<h2 class="text-muted-foreground pl-2 text-5xl font-light tracking-wider">
													Workbench
												</h2>
											</div>
											<div class="flex gap-4">
												<section class="flex w-full grow flex-col gap-2">
													<span>Recent</span>
													{#each fileTabs.recentFiles.slice(0, 5) as file}
														<Button
															variant="link"
															class="text-brand-primary flex w-full justify-between"
															onclick={() => fileTabs.openFile(file.id)}
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
														onclick={() => fileTabs.newTab()}
													>
														New file
													</Button>
													<Button
														variant="link"
														disabled
														class="text-brand-primary flex justify-between"
														onclick={() => fileTabs.newTab()}
													>
														Open file
													</Button>
													<Button
														disabled
														variant="link"
														class="text-brand-primary flex justify-between"
														onclick={() => fileTabs.newTab()}
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
										{#if mounted}
											<Tabs.Root bind:value={workbenchTabSide.current} class="h-full grow gap-0">
												<Tabs.List
													variant="line"
													class="*:after:bg-brand-primary w-full justify-start border-b"
												>
													<Tabs.Trigger value="Agents">Agents</Tabs.Trigger>
													<Tabs.Trigger value="Inspector">Inspector</Tabs.Trigger>
													<Tabs.Trigger value="Groups">Groups</Tabs.Trigger>
													<Tabs.Trigger value="Tools">Tools</Tabs.Trigger>
													<Tabs.Trigger value="Session">Session</Tabs.Trigger>
												</Tabs.List>
												<Tabs.Content
													value="Agents"
													class="flex min-h-0 grow flex-col overflow-y-auto "
												>
													<MarketPane source="marketplace" />
												</Tabs.Content>
												<Tabs.Content
													value="Local"
													class="flex min-h-0 grow flex-col overflow-y-auto "
												>
													<MarketPane source="local" />
												</Tabs.Content>
												<Tabs.Content
													value="Inspector"
													class="flex min-h-0 grow flex-col overflow-y-auto"
												>
													<svelte:boundary onerror={(e) => console.error('Inspector crashed:', e)}>
														<Inspector />
														{#snippet failed(error)}
															<p class="text-muted-foreground p-4">
																Inspector failed to load — try switching panels.
															</p>
														{/snippet}
													</svelte:boundary>
												</Tabs.Content>
												<Tabs.Content
													value="Tools"
													class="flex min-h-0 grow flex-col overflow-y-auto"
												>
													<ToolsPane />
												</Tabs.Content>
												<Tabs.Content
													value="Groups"
													class="flex min-h-0 grow flex-col overflow-y-auto"
												>
													<GroupsPane />
												</Tabs.Content>
												<Tabs.Content
													value="Session"
													class="flex min-h-0 grow flex-col overflow-y-auto"
												>
													<SessionSettings />
												</Tabs.Content>
												<Tabs.Content value="Errors">
													{#each Object.entries(activeFile.current?.errors ?? {}) as error}
														{JSON.stringify(error)}
													{/each}
												</Tabs.Content>
											</Tabs.Root>
										{/if}
									</Resizable.Pane>
									<Resizable.Handle />
									<Resizable.Pane
										defaultSize={4}
										minSize={2}
										maxSize={5}
										class="flex min-w-0 items-center justify-end gap-2 px-2 align-middle"
									>
										<NamespaceSwitcher />
										<Button
											variant="secondary"
											disabled={activeFile.current
												? !filesMeta.current[activeFile.current.id]?.edited
												: false}
											onclick={saveFile}
										>
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
											disabled={sendingRequest || activeFile.current?.agents.length === 0}
										>
											{#if sendingRequest}
												<Spinner />
											{/if}
											Create session</Button
										>
										{#if activeFile.current?.errors}
											<Tooltip.Root>
												<Tooltip.Trigger>!</Tooltip.Trigger>
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
