<script lang="ts">
	import { page } from '$app/state';

	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';

	import LogsComponent from '$lib/components/logs.svelte';
	import RemoteControl from '$lib/components/remote-control.svelte';

	import CaretRight from 'phosphor-icons-svelte/IconCaretRightRegular.svelte';
	import ExternalLink from 'phosphor-icons-svelte/IconArrowsOutRegular.svelte';
	import { appContext } from '$lib/context';
	import { cn } from '$lib/utils';
	import { base } from '$app/paths';
	import { Logs } from '$lib/logs.svelte';
	import { humanReadableMap, resolveStateMap } from '$lib';

	let ctx = appContext.get();
	let conn = $derived(ctx.session);

	let threads = $derived(conn?.threads ?? {});
	let agents = $derived(conn?.agents ?? {});

	let agentName = $derived(page.url.hash.substring(1));
	let agent = $derived(agentName ? agents[agentName] : undefined);

	let memberThreads = $derived(
		Object.values(threads).filter((thread) => thread.participants.has(agentName))
	);

	let logs = $derived(agent && conn && new Logs({ session: conn.sessionId }, agent.name));

	const ts_fmt = (d: Date) =>
		`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="{base}/session">Current Session</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link>Agents</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{agentName ?? ''} {agent?.name ?? ''}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>
{#if agent !== undefined}
	<main class="h-full p-4">
		<Tabs.Root value="main" class="h-full">
			<Tabs.List>
				<Tabs.Trigger value="main">Overview</Tabs.Trigger>
				<Tabs.Trigger value="logs">Logs</Tabs.Trigger>
				<Tabs.Trigger value="rcon">Remote control</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="main">
				<h1 class="text-3xl font-bold">{agentName}</h1>
				<p>{resolveStateMap(agent.status, humanReadableMap)}</p>
				<p class={cn(agent.description && 'text-muted-foreground')}>
					{agent.description || 'No description.'}
				</p>
				<Accordion.Root type="single" class="w-full sm:max-w-[70%]" value="threads">
					<Accordion.Item value="threads">
						<Accordion.Trigger>Threads</Accordion.Trigger>
						<Accordion.Content class="flex flex-col gap-4 text-balance">
							<ul class="pl-4">
								{#if memberThreads.length === 0}
									<li class="text-muted-foreground text-sm">Not a member of any threads.</li>
								{/if}
								{#each memberThreads as thread (thread.id)}
									<li class="flex items-center">
										<CaretRight class="size-4" />
										<Button variant="link" href={`${base}/thread/#${thread.id}`} class="font-bold">
											{thread.name}<ExternalLink class="size-3" />
										</Button>
										<span>
											with:
											{#each thread.participants as part}
												{#if part !== agentName}
													<Button variant="link" href={`${base}/agent/#${part}`} class="m-0 px-2"
														>{part}</Button
													>
												{/if}
											{/each}
										</span>
									</li>
								{/each}
							</ul>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</Tabs.Content>
			<Tabs.Content value="logs" class="h-full min-h-0 basis-0">
				<LogsComponent {logs} class="h-full max-h-full" />
			</Tabs.Content>
			{#if conn !== null}
				<Tabs.Content value="rcon" class="h-full min-h-0 basis-0">
					<RemoteControl {agent} session={conn} />
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	</main>
{:else}
	<p class="text-muted-foreground mt-4 text-center text-sm">Agent not found.</p>
{/if}
