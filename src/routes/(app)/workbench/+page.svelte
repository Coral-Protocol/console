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
	import SidebarTab from './SidebarTab.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { PersistedState } from 'runed';

	import IconWrenchRegular from 'phosphor-icons-svelte/IconWrenchRegular.svelte';
	import IconUsersThreeRegular from 'phosphor-icons-svelte/IconUsersThreeRegular.svelte';
	import IconCodeRegular from 'phosphor-icons-svelte/IconCodeRegular.svelte';
	import IconTableRegular from 'phosphor-icons-svelte/IconTableRegular.svelte';
	import IconGraphRegular from 'phosphor-icons-svelte/IconGraphRegular.svelte';
	import IconEditRegular from 'phosphor-icons-svelte/IconPencilSimpleLineRegular.svelte';

	import IconRobotRegular from '$lib/icons/robot.svelte';
	import IconCaretDown from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconTrashRegular from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconStorefront from 'phosphor-icons-svelte/IconStorefrontRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';

	import { SvelteFlowProvider } from '@xyflow/svelte';
	import Graph from '$lib/components/Graph/Graph.svelte';
	import CodePane from './panes/CodePane.svelte';
	import { Input } from '@coral-os/component-library/ui/input/index.js';

	const isMobile = new IsMobile();

	type Tab = { id: string; dirty: boolean };
	type File = {
		name: string;
		description: string;
		id: string;
		created: EpochTimeStamp;
		data: object;
	};

	const files = new PersistedState<File[]>('files', [
		{
			name: 'Untitled',
			description: 'no description',
			id: crypto.randomUUID(),
			created: Date.now(),
			data: {}
		}
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
		files.current.push({
			name: 'Untitled',
			description: 'no description',
			id,
			created: Date.now(),
			data: {}
		});
		openTabs.current.push({ id, dirty: true });
		activeTab.current = id;
	}

	function closeTab(id: string) {
		const tabIndex = openTabs.current.findIndex((tab) => tab.id === id);
		if (tabIndex === -1) return;

		openTabs.current.splice(tabIndex, 1);

		if (activeTab.current === id) {
			activeTab.current =
				(tabIndex > 0 ? openTabs.current[tabIndex - 1] : openTabs.current[0])?.id ?? '';
		}
	}

	function deleteFile(id: string) {
		const fileIndex = files.current.findIndex((file) => file.id === id);
		files.current.splice(fileIndex, 1);
		closeTab(id);
	}

	let activeFile = $derived(files.current.find((file) => file.id === activeTab.current) ?? null);
	let filesById = $derived(new Map(files.current.map((f) => [f.id, f])));

	let draftName = $derived(activeFile.name);
</script>

<Header />

<section class=" flex h-full flex-col p-2 pt-0">
	<header class="bg-card">
		<Menubar.Root class="border-input bg-background/80 border-b-0">
			<Menubar.Menu>
				<IconCircuity class="size-6" />
				<Menubar.Trigger>File</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Sub>
						<Menubar.SubTrigger>Open file...</Menubar.SubTrigger>
						<Menubar.SubContent class="max-h-1/3 overflow-y-auto">
							{#each files.current as file}
								<Menubar.Item
									onclick={() => (
										openTabs.current.push({ id: file.id, dirty: false }),
										(activeTab.current = file.id)
									)}>{file.name}</Menubar.Item
								>
							{/each}
						</Menubar.SubContent>
					</Menubar.Sub>
					<Menubar.Item onclick={newTab}>New File</Menubar.Item>

					<Menubar.Item
						onclick={() => {
							if (activeFile) {
								deleteFile(activeFile.id);
							}
						}}>Delete file</Menubar.Item
					>
					<Menubar.Separator />
					<Menubar.Item>Share</Menubar.Item>
					<Menubar.Separator />
					<Menubar.Item>Print</Menubar.Item>
				</Menubar.Content>
			</Menubar.Menu>
			<Menubar.Menu>
				<Menubar.Trigger>Edit</Menubar.Trigger>
				<Menubar.Content>
					<Menubar.Item onclick={newTab}>New File</Menubar.Item>
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
												>{filesById.get(tab.id)?.name ?? 'Untitled'}{tab.dirty ? '*' : ''}
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
						<Tabs.Root value="diagram" class="h-full grow gap-0">
							<header class="flex w-full items-center gap-4 border-b p-4">
								<section class="flex min-w-0 flex-1 flex-col">
									{#if activeFile}
										<form class="relative inline-flex w-max max-w-full min-w-0 items-center gap-1">
											<input
												type="text"
												maxlength="45"
												value={draftName}
												oninput={(e) => (draftName = e.currentTarget.value)}
												onblur={() => (activeFile.name = draftName)}
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
												value={activeFile.description}
												onblur={(v) => (activeFile.description = v.currentTarget.value)}
												class="text-foreground/80 outline-0!"
											/>
										</form>
									{/if}
								</section>
								<Tabs.List class="shrink-0 gap-2 bg-transparent pr-4">
									<Tabs.Trigger value="diagram"><IconGraphRegular /> Diagram</Tabs.Trigger>
									<Tabs.Trigger value="outline"><IconTableRegular /> Outline</Tabs.Trigger>
									<Tabs.Trigger value="raw"><IconCodeRegular /> Raw</Tabs.Trigger>
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
							<Tabs.Content value="diagram" class="p-0">
								<SvelteFlowProvider>
									{#key activeFile?.id}
										<Graph agents={[]} groups={[]} controls fitDefault={false} enableContext />
									{/key}
								</SvelteFlowProvider>
							</Tabs.Content>
							<Tabs.Content value="outline">outline...!</Tabs.Content>

							<Tabs.Content value="raw">raw code</Tabs.Content>
						</Tabs.Root>
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
