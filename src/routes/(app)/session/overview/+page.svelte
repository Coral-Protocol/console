<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Header from '$lib/components/header.svelte';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as UnderlineTabs from '@coral-os/component-library/ui/underline-tabs/index.js';
	import { Underline } from '@lucide/svelte';
	import { appContext } from '$lib/context';
	import * as Table from '@coral-os/component-library/ui/table/index.js';
	import { TooltipLabel } from '@coral-os/component-library';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { formatDistanceToNow, format } from 'date-fns';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import Graph from '$lib/components/Graph/Graph.svelte';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import { onMount } from 'svelte';
	import SessionSwitcher from '$lib/components/SessionSwitcher.svelte';
	import { Skeleton } from '@coral-os/component-library/components/ui/skeleton/index.js';
	import { cn, fmtMicrocents } from '$lib/utils';

	let ctx = appContext.get();

	let sessions = $derived(Object.values(ctx.server.sessions));

	let session = $derived(ctx.session);
	let agents = $derived(Object.values(session?.agents ?? {}));
	let threads = $derived(Object.values(session?.threads ?? {}));

	let tick = $state(false);
	onMount(() => {
		const timer = setInterval(() => {
			tick = !tick;
		}, 1000);
		return () => {
			clearInterval(timer);
		};
	});
</script>

<Header />

{#if session}
	<main class="flex h-full w-full flex-col gap-4 p-6 pt-2">
		<header class="flex items-center justify-between gap-4">
			<section class="">
				<h1 class="text-2xl font-semibold">Session Overview</h1>
				<p class="text-muted-foreground text-sm">Here's what's happening in your session.</p>
			</section>

			<section class="mt-4 flex grow flex-col">
				<h2 class="text-sm font-semibold">Current Session</h2>
				<SessionSwitcher class="my-0" />
			</section>
			<!-- <div class="flex gap-2">
			<Button class="btn">Connect Server</Button>
			<Button class="btn btn-primary">Create Session</Button>
			<Button class="btn">Register Agent</Button>
			<Button class="btn">Start Thread</Button>
		</div> -->
		</header>

		<section class="grid grid-cols-4 gap-4">
			<Card.Root
				class="grid h-full grid-rows-[max-content_max-content_auto] justify-between gap-1 p-6"
			>
				<p class="text-sm font-semibold">Agents</p>
				<p class="text-2xl font-semibold">{agents.length}</p>
				<p class="text-muted-foreground text-xs">
					{agents.filter(
						(a) => a.status.type === 'running' && a.status.connectionStatus.type === 'connected'
					).length} running, {agents.filter((a) => a.status.type === 'waiting').length} waiting, {agents.filter(
						(a) => a.status.type === 'stopped'
					).length}
					stopped
				</p>
			</Card.Root>

			<Card.Root
				class="grid h-full grid-rows-[max-content_max-content_auto] justify-between gap-1 p-6"
			>
				<p class="text-sm font-semibold">Threads</p>
				<p class="text-2xl font-semibold">{sessions.length}</p>
			</Card.Root>

			<Card.Root
				class="grid h-full grid-rows-[max-content_max-content_auto] justify-between gap-1 p-6"
			>
				<p class="text-sm font-semibold">Messages</p>
				<p class="text-2xl font-semibold">
					{threads.reduce((acc, t) => acc + t.messages.length, 0)}
				</p>
				<p class="text-muted-foreground text-xs">total over all threads</p>
			</Card.Root>

			<Card.Root class="flex h-full flex-col justify-between gap-1 p-6">
				<p class="text-sm font-semibold">Session Budget</p>
				{#if session.extended}
					{@const budget = session.extended.runningBudget}
					<p class="text-2xl font-semibold">
						<span class={cn(budget.overclaim > 0 && 'text-destructive')}
							>{fmtMicrocents(budget.startBudget - budget.remaining + budget.overclaim)}</span
						>
						/ {fmtMicrocents(budget.startBudget)}
					</p>
				{:else}
					<Skeleton class="h-4" />
				{/if}
				<p class="text-muted-foreground text-xs">current usage / session budget</p>
			</Card.Root>
		</section>

		<section class="grid grow grid-cols-2 gap-4">
			<Card.Root class="col-span-1 row-span-2 h-full gap-2 pb-0.5">
				<Card.Header>
					<Card.Title>Threads</Card.Title>
				</Card.Header>
				<Card.Content class="grow overflow-x-auto p-0 [&>*]:overflow-x-visible">
					<Table.Root class="h-full border-b">
						<Table.Header>
							<Table.Row class="*:text-muted-foreground text-sm *:font-normal">
								<Table.Head class="w-[100px]">Thread</Table.Head>
								<Table.Head class="text-center">Status</Table.Head>
								<Table.Head>Created</Table.Head>
								<Table.Head>Closed</Table.Head>
								<Table.Head class="text-end">Messages</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="text-sm">
							{#each threads as thread}
								<Table.Row>
									<Table.Cell class="max-w-5 truncate font-medium">
										<Tooltip.Root>
											<Tooltip.Trigger class="w-full truncate text-start"
												>{thread.name}</Tooltip.Trigger
											><Tooltip.Content>{thread.name}</Tooltip.Content></Tooltip.Root
										></Table.Cell
									>
									<Table.Cell>
										<Tooltip.Root>
											<Tooltip.Trigger class="w-full cursor-help"
												><Badge
													class="w-full"
													variant={thread.state.state === 'closed' ? 'outline' : 'default'}
													>{thread.state.state}</Badge
												></Tooltip.Trigger
											>
											<Tooltip.Content class="w-fit">
												{#if thread.state.state === 'closed'}
													"{thread.state.summary}"
												{:else}
													Thread is open - when closed, the close summary will show here.
												{/if}
											</Tooltip.Content>
										</Tooltip.Root>
									</Table.Cell>
									<Table.Cell>
										<Tooltip.Root>
											<Tooltip.Trigger class="cursor-help"
												>{(tick || true) &&
													formatDistanceToNow(thread.timestamp, {
														addSuffix: true
													})}</Tooltip.Trigger
											>
											<Tooltip.Content class="w-fit">
												{format(thread.timestamp, 'PPPppp')}</Tooltip.Content
											>
										</Tooltip.Root></Table.Cell
									>
									<Table.Cell>
										{#if thread.state.state === 'closed'}
											<Tooltip.Root>
												<Tooltip.Trigger class="cursor-help"
													>{(tick || true) &&
														formatDistanceToNow(thread.state.timestamp, {
															addSuffix: true
														})}</Tooltip.Trigger
												>
												<Tooltip.Content class="w-fit">
													{format(thread.timestamp, 'PPPppp')}</Tooltip.Content
												>
											</Tooltip.Root>
										{:else}
											<span class="text-muted-foreground select-none">&mdash;</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-end">{thread.messages.length}</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={4} class="text-center text-sm text-muted-foreground">
										No threads in this session.
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>

			<Card.Root class="gap-2 pb-2">
				<Card.Header>
					<Card.Title>Agent Graph</Card.Title>
				</Card.Header>
				<Card.Content class="size-full px-2">
					<SvelteFlowProvider>
						<Graph {agents} groups={[agents.map((a) => a.name)]} class="size-full" controls />
					</SvelteFlowProvider>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Messages (last hour)</Card.Title>
				</Card.Header>
				<Card.Content>
					<div
						class="bg-muted text-muted-foreground flex h-32 w-full items-center justify-center rounded-md text-xs"
					>
						Chart placeholder
					</div>
				</Card.Content>
			</Card.Root>
		</section>
	</main>
{/if}
