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

	let ctx = appContext.get();

	let namespaces = $derived(ctx.server.namespaces);
	let sessions = $derived(Object.values(ctx.server.sessions));

	let activeNamespace: string = $state('default');
</script>

<Header override="Home" />

<main class="flex h-full w-full flex-col gap-6 p-6">
	<section class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold">Welcome back</h1>
			<p class="text-muted-foreground text-sm">Here's what's happening within your Coral server.</p>
		</div>

		<!-- <div class="flex gap-2">
			<Button class="btn">Connect Server</Button>
			<Button class="btn btn-primary">Create Session</Button>
			<Button class="btn">Register Agent</Button>
			<Button class="btn">Start Thread</Button>
		</div> -->
	</section>

	<section class="grid grid-cols-5 gap-4">
		<Card.Root class="flex h-full flex-col justify-between gap-1 p-6">
			<p class="text-sm">Namespaces</p>
			<p class="text-2xl font-semibold">{namespaces.length}</p>
			<p class="text-muted-foreground text-xs">excluding default</p>
		</Card.Root>

		<Card.Root class="flex h-full flex-col justify-between gap-1 p-6">
			<p class="text-sm">Sessions</p>
			<p class="text-2xl font-semibold">{sessions.length}</p>
			<p class="text-muted-foreground text-xs">
				{sessions.filter((s) => s.status.type === 'executed').length} executed, {sessions.filter(
					(s) => s.status.type === 'pending_execution'
				).length} pending execution, {sessions.filter((s) => s.status.type === 'closing').length} closing
			</p>
		</Card.Root>

		<Card.Root class="flex h-full flex-col justify-between gap-1 p-6">
			<p class="text-sm">Threads</p>
			<p class="text-2xl font-semibold">{sessions.length}</p>
			<p class="text-muted-foreground text-xs">across all namespaces</p>
		</Card.Root>

		<Card.Root class="flex h-full flex-col justify-between gap-1 p-6">
			<p class="text-sm">Messages / min</p>
			<p class="text-2xl font-semibold">{sessions.length}</p>
			<p class="text-muted-foreground text-xs">over last x hours</p>
		</Card.Root>

		<!-- <Card.Root class="flex h-full flex-col justify-between gap-1 p-6">
			<p class="text-sm">Uptime</p>
			<p class="text-2xl font-semibold">{sessions.length}</p>
			<p class="text-muted-foreground text-xs">trending</p>
		</Card.Root> -->
	</section>

	<section class="grid grow grid-cols-2 gap-4">
		<div class="col-span-1">
			<Card.Root class="h-full py-0.5">
				<UnderlineTabs.Root bind:value={activeNamespace} class="gap-0">
					<UnderlineTabs.List>
						<span
							class="text-muted-foreground mr-2 cursor-default border-r px-2 text-sm font-medium"
							>Namespaces</span
						>

						{#each ctx.server.namespaces as namespace}
							<UnderlineTabs.Trigger value={namespace}
								>{namespace}
								<Badge variant="secondary"
									>{sessions.filter((s) => s.namespace === namespace).length}</Badge
								></UnderlineTabs.Trigger
							>
						{:else}
							<UnderlineTabs.Trigger value="default"
								>Default
								<Badge variant="secondary">0</Badge></UnderlineTabs.Trigger
							>
						{/each}
					</UnderlineTabs.List>

					<Card.Content class="p-0">
						<Table.Root>
							<Table.Header>
								<Table.Row class="*:text-muted-foreground text-sm *:font-normal">
									<Table.Head class="w-[100px]">Session</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Started</Table.Head>
									<Table.Head class="text-end">Amount</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each sessions.filter((s) => s.namespace === activeNamespace) as item}
									<Table.Row>
										<Table.Cell class="font-medium">{item.id}</Table.Cell>
										<Table.Cell>
											<Tooltip.Root>
												<Tooltip.Trigger class="cursor-help">{item.status.type}</Tooltip.Trigger>
												<Tooltip.Content class="flex w-fit max-w-64 flex-col gap-2 wrap-break-word">
													{item.status.type === 'executed'
														? "The session launched it's agents and is currently running."
														: item.status.type === 'pending_execution'
															? 'This session status is only achieved when creating sessions with deferred execution.'
															: item.status.type === 'closing'
																? 'The session is closing and will soon be removed from memory. There is no closed state for sessions, as closed sessions are deleted from memory.'
																: ''}
												</Tooltip.Content>
											</Tooltip.Root>
										</Table.Cell>
										<Table.Cell>
											<Tooltip.Root>
												<Tooltip.Trigger class="cursor-help"
													>{formatDistanceToNow(item.timestamp, {
														addSuffix: true
													})}</Tooltip.Trigger
												>
												<Tooltip.Content class="w-fit   ">
													{format(item.timestamp, 'PPPppp')}</Tooltip.Content
												>
											</Tooltip.Root></Table.Cell
										>
										<Table.Cell class="text-end">$0.00</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={4} class="text-center text-sm text-muted-foreground">
											No active sessions in this namespace.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</UnderlineTabs.Root>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Live Activity</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm">
				<p>Agent Writer registered</p>
				<p>Researcher sent message</p>
				<p>Thread Data Pipeline started</p>
				<p>Summarizer went offline</p>
			</Card.Content>
		</Card.Root>
	</section>

	<section class="grid grid-cols-2 gap-4">
		<Card.Root>
			<Card.Header>
				<Card.Title>Agents</Card.Title>
			</Card.Header>
			<Card.Content class="grid grid-cols-4 gap-3">
				<div class="bg-muted rounded-lg p-3">
					<p class="font-medium">Orchestrator</p>
					<p class="text-xs text-green-500">Online</p>
				</div>
				<div class="bg-muted rounded-lg p-3">
					<p class="font-medium">Researcher</p>
					<p class="text-xs text-green-500">Online</p>
				</div>
				<div class="bg-muted rounded-lg p-3">
					<p class="font-medium">Writer</p>
					<p class="text-xs text-green-500">Online</p>
				</div>
				<div class="bg-muted rounded-lg p-3">
					<p class="font-medium">Summarizer</p>
					<p class="text-xs text-red-500">Offline</p>
				</div>
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
