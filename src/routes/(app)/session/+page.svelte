<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { appContext } from '$lib/context';
	import { base } from '$app/paths';

	let ctx = appContext.get();
	let conn = $derived(ctx.session);
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Page>Current Session</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>

<main class="h-full p-4">
	{#if conn}
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
	{:else}
		<p class="text-muted-foreground mt-4 text-center text-sm">No active session.</p>
	{/if}
</main>
