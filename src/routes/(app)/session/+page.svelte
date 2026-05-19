<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';
	import IconDownload from 'phosphor-icons-svelte/IconDownloadSimpleRegular.svelte';
	import { appContext } from '$lib/context';
	import Waterfall from '$lib/waterfall/Waterfall.svelte';
	import { downloadSessionExport } from '$lib/session-io';

	let ctx = appContext.get();
	let conn = $derived(ctx.session);

	function handleExport() {
		if (!conn) return;
		try {
			downloadSessionExport(conn);
			toast.success('Session exported.');
		} catch (e) {
			toast.error(`Failed to export session: ${e}`);
		}
	}
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
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
	{#if conn}
		<Button variant="outline" size="sm" onclick={handleExport}>
			<IconDownload class="size-4" />
			Export
		</Button>
	{/if}
</header>

<main class="flex h-full min-h-0 flex-col p-4">
	{#if conn}
		<Tabs.Root value="overview" class="flex h-full min-h-0 flex-col">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
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
