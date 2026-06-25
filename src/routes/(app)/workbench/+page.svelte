<script lang="ts">
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import Header from '$lib/components/header.svelte';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import IconPlusRegular from 'phosphor-icons-svelte/IconPlusRegular.svelte';

	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import SidebarTab from './SidebarTab.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { PersistedState } from 'runed';

	import IconWrenchRegular from 'phosphor-icons-svelte/IconWrenchRegular.svelte';
	import IconUsersThreeRegular from 'phosphor-icons-svelte/IconUsersThreeRegular.svelte';
	import IconRobotRegular from '$lib/icons/robot.svelte';
	import IconCaretDown from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconTrashRegular from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconStorefront from 'phosphor-icons-svelte/IconStorefrontRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';

	import { SvelteFlowProvider } from '@xyflow/svelte';
	import Graph from '$lib/components/Graph/Graph.svelte';

	const isMobile = new IsMobile();

	type Tab = { id: string; dirty: boolean };
	type File = { name: string; description: string; id: string; data: object };

	const files = new PersistedState<File[]>('files', [
		{ name: 'Untitled', description: 'no description', id: crypto.randomUUID(), data: {} }
	]);

	const openTabs = new PersistedState<Tab[]>('openTabs', []);

	const activeTab = new PersistedState<string | null>('activeTab', '', {
		storage: 'session'
	});

	if (openTabs.current.length === 0 && files.current[0]) {
		const { id } = files.current[0];
		openTabs.current.push({ id, dirty: false });
	}

	if (!activeTab.current && openTabs.current[0]) {
		activeTab.current = openTabs.current[0].id;
	}

	function newTab() {
		const id = crypto.randomUUID();
		files.current.push({ name: 'Untitled', description: 'no description', id, data: {} });
		openTabs.current.push({ id, dirty: true });
		activeTab.current = id;
	}

	function closeTab(id: string) {
		const tabIndex = openTabs.current.findIndex((tab) => tab.id === id);
		if (tabIndex === -1) return;

		openTabs.current.splice(tabIndex, 1);

		if (activeTab.current === id) {
			activeTab.current = openTabs.current[tabIndex - 1]?.id ?? null;
		}
	}

	let activeFile = $derived(files.current.find((file) => file.id === activeTab.current) ?? null);
	let filesById = $derived(new Map(files.current.map((f) => [f.id, f])));
</script>

<Header />

<section class=" flex h-full flex-col p-2 pt-0">
	<header class="bg-card">
		<Menubar.Root class="border-input bg-background/80 border-b-0">
			<Menubar.Menu>
				<IconCircuity class="size-6" />
				<Menubar.Trigger>File</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item>
						New Tab
						<Menubar.Shortcut>⌘T</Menubar.Shortcut>
					</Menubar.Item>
					<Menubar.Item>New Window</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item>Share</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item>Print</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Edit</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item>New Tab</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Selection</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item>New Tab</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>View</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item>New Tab</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
		</Menubar.Root>
	</header>

	<Card.Root class="h-full grow border-0 bg-transparent p-0">
		<Tabs.Root bind:value={activeTab.current} class="grow">
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
											><span class="truncate {tab.dirty ? 'italic' : ''}"
												>{filesById.get(tab.id)?.name ?? 'Untitled'}
											</span></Tabs.Trigger
										>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{filesById.get(tab.id)?.name} {tab.dirty ? '(unsaved)' : ''}</p>
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
			<Card.Content class="bg-card h-full border border-t-0 p-0 ">
				<Resizable.PaneGroup direction="horizontal" class="h-full min-h-0 w-full grow rounded-lg ">
					<Resizable.Pane defaultSize={75}>
						<header class="flex w-full border-b p-4">
							<section class="grow">
								{#if activeFile}
									<form>
										<input
											type="text"
											value={activeFile.name}
											onblur={(v) => (activeFile.name = v.currentTarget.value)}
											class="w-fit text-xl"
										/>
									</form>
									<form>
										<input
											type="text"
											value={activeFile.description}
											onblur={(v) => (activeFile.description = v.currentTarget.value)}
											class="text-foreground/80"
										/>
									</form>
								{/if}
							</section>
							<section>
								<Button variant="outline">Diagram</Button>
								<Button variant="ghost">Outline</Button>
							</section>
							<section>zoom controls</section>
						</header>
						<SvelteFlowProvider>
							{#key activeFile?.id}
								<Graph
									agents={activeFile?.data.agents ?? []}
									groups={activeFile?.data.groups ?? []}
									controls
									fitDefault={false}
									enableContext
								/>
							{/key}
						</SvelteFlowProvider>
					</Resizable.Pane>
					<Resizable.Handle />
					<Resizable.Pane defaultSize={25}>
						<Resizable.PaneGroup direction="vertical">
							<Resizable.Pane defaultSize={25}>
								<div class="flex h-full items-center justify-center p-6">
									<span class="font-semibold">Two</span>
								</div>
							</Resizable.Pane>
							<Resizable.Handle />
							<Resizable.Pane defaultSize={75}>
								<div class="flex h-full items-center justify-center p-6">
									<span class="font-semibold">Three</span>
								</div>
							</Resizable.Pane>
						</Resizable.PaneGroup>
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</Card.Content>
		</Tabs.Root>
	</Card.Root>
</section>
