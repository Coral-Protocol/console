<script lang="ts">
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import Header from '$lib/components/header.svelte';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import SidebarTab from './SidebarTab.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';

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
		<Tabs.Root value="account" class="grow">
			<Tabs.List
				variant="seamless"
				class="bg-card *:not-data-active:bg-background/80! *:not-data-active:hover:bg-card! no-scrollbar flex h-10  gap-0 overflow-x-auto overflow-y-hidden border-x *:relative *:border-t-0 *:border-l-0! "
			>
				{#each { length: 5 } as item, i}
					<div
						class=" group relative flex h-full w-fit max-w-64 min-w-24 truncate overflow-hidden *:border-l-0!"
					>
						<Tooltip.Provider delayDuration={700}>
							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child({ props }: any)}
										<Tabs.Trigger
											{...props}
											value={i.toString()}
											class="not-data-active:bg-background/80! not-data-active:hover:bg-card! peer data-active:border-t-brand-primary! w-full grow justify-start overflow-hidden pr-8"
											><span class="truncate"
												>a{#each { length: 8 * i }}a{/each}</span
											></Tabs.Trigger
										>
									{/snippet}
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>full name</p>
								</Tooltip.Content>
							</Tooltip.Root>

							<Tooltip.Root>
								<Tooltip.Trigger class="">
									{#snippet child({ props }: any)}
										<Button
											{...props}
											variant="ghost"
											class="group-hover:text-foreground peer-data-active:text-foreground hover:bg-card-foreground/20! absolute top-0 right-1.5 bottom-0 my-auto aspect-auto size-6 -translate-0 text-transparent "
											><IconXRegular class="size-4" /></Button
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

				<Tabs.Trigger value="" class="pointer-events-none min-w-0 flex-1 border-t! border-r-0! p-0"
				></Tabs.Trigger>
			</Tabs.List>
			<Card.Content class="bg-card h-full border border-t-0 p-0 ">
				<Tabs.Content value="1" class="h-full min-h-0 grow">
					<Resizable.PaneGroup direction="horizontal" class="w-full grow rounded-lg ">
						<Resizable.Pane defaultSize={75}>
							<header class="flex w-full border-b p-4">
								<section class="grow">
									<h1 class="text-xl">Title of file</h1>
									<p class="text-foreground/80">description of file</p>
								</section>
								<section>
									<Button variant="outline">Diagram</Button>
									<Button variant="ghost">Outline</Button>
								</section>
								<section>zoom controls</section>
							</header>
							<SvelteFlowProvider>
								<Graph agents={[]} groups={[]} controls fitDefault={false} enableContext />
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
				</Tabs.Content>
			</Card.Content>
		</Tabs.Root>
	</Card.Root>
</section>
