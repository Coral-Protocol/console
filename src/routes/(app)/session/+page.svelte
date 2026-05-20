<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import { toast } from 'svelte-sonner';
	import IconDownload from 'phosphor-icons-svelte/IconDownloadSimpleRegular.svelte';
	import IconCaretDown from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';
	import IconFileArchive from 'phosphor-icons-svelte/IconFileArchiveRegular.svelte';
	import { appContext } from '$lib/context';
	import Waterfall from '$lib/waterfall/Waterfall.svelte';
	import SessionGraph from '$lib/components/SessionGraph.svelte';
	import { downloadSessionExport, downloadSessionBundle } from '$lib/session-io';
	import { isSharedMode } from '$lib/sharedMode';

	let ctx = appContext.get();
	let conn = $derived(ctx.session);

	function handleExportJsonl() {
		if (!conn) return;
		try {
			downloadSessionExport(conn);
			toast.success('Session exported as JSONL.');
		} catch (e) {
			toast.error(`Failed to export session: ${e}`);
		}
	}

	function handleExportZip() {
		if (!conn) return;
		try {
			downloadSessionBundle(conn);
			toast.success('Session bundle exported.');
		} catch (e) {
			toast.error(`Failed to export bundle: ${e}`);
		}
	}
</script>

<!--
  The right-side padding leaves room for the global floating toolbar
  (search + help + theme toggle, rendered by app-sidebar.svelte) so the
  Export button never sits underneath it.
-->
<header
	class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 pr-[22rem]"
>
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Page>
					{conn?.imported ? 'Imported Session' : 'Current Session'}
				</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
	{#if conn?.imported}
		<Badge variant="secondary">read-only</Badge>
	{/if}
	{#if conn && !isSharedMode}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm">
						<IconDownload class="size-4" />
						Export
						<IconCaretDown class="size-3 opacity-70" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-56">
				<DropdownMenu.Item onSelect={handleExportJsonl}>
					<IconFileText class="size-4" />
					Export as JSONL
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={handleExportZip}>
					<IconFileArchive class="size-4" />
					Export as shareable ZIP
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</header>

<main class="flex h-full min-h-0 flex-col p-4">
	{#if conn}
		<Tabs.Root value="overview" class="flex h-full min-h-0 flex-col">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="graph">Graph</Tabs.Trigger>
				<Tabs.Trigger value="waterfall">Waterfall</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="overview" class="min-h-0 flex-1">
				<h1 class="text-3xl font-bold">Session: {conn.sessionId}</h1>
				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="rounded-lg border p-4">
						<h2 class="text-xl font-semibold">Status</h2>
						<p class="mt-2">
							Connected: <span class={conn.connected ? 'text-green-500' : 'text-red-500'}>
								{conn.connected ? 'Yes' : 'No'}
							</span>
						</p>
						<p>Namespace: {conn.namespace}</p>
					</div>
					<div class="rounded-lg border p-4">
						<h2 class="text-xl font-semibold">Resources</h2>
						<p class="mt-2">Agents: {Object.keys(conn.agents).length}</p>
						<p>Threads: {Object.keys(conn.threads).length}</p>
					</div>
				</div>
			</Tabs.Content>
			<Tabs.Content value="graph" class="min-h-0 flex-1 basis-0 overflow-hidden">
				<!--
				  Live force-directed view of the session's agents, threads,
				  group memberships, and message flow. Hover for tooltips;
				  click any node for full details.
				-->
				<div class="h-full overflow-hidden rounded-lg border">
					<SessionGraph session={conn} />
				</div>
			</Tabs.Content>
			<Tabs.Content value="waterfall" class="min-h-0 flex-1 basis-0 overflow-hidden">
				<!--
				  The waterfall is a dense, time-aligned view of the session's
				  event stream. It owns its own scroll container, so we just
				  hand it the full available height.
				-->
				<div class="h-full overflow-hidden rounded-lg border">
					<Waterfall session={conn} />
				</div>
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		<p class="text-muted-foreground mt-4 text-center text-sm">No active session.</p>
	{/if}
</main>
