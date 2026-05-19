<script lang="ts">
	import { socketCtx, UserInput } from '$lib/socket.svelte';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { appContext, type AppContext } from '$lib/context';
	import { CoralServer } from '$lib/CoralServer.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { Session } from '$lib/session.svelte';
	import { parseSessionJsonl } from '$lib/session-io';
	import { isSharedMode } from '$lib/sharedMode';
	import { toast } from 'svelte-sonner';

	import TourOverlay from '$lib/components/tour/TourOverlay.svelte';
	import { tour } from '$lib/components/tour/tourLib.svelte';

	let { children } = $props();

	let ctx: AppContext = $state({
		server: new CoralServer(),
		connection: null,
		session: null,
		sessions: null,
		registry: null,
		logs: null
	});
	appContext.set(ctx);

	onMount(async () => {
		if (isSharedMode) {
			// Shared/offline build: never reach out to a Coral server. Instead,
			// load the session.jsonl bundled next to the static site and hydrate
			// a read-only `Session` from it.
			try {
				const res = await fetch(`${base}/session.jsonl`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const text = await res.text();
				const snapshot = parseSessionJsonl(text);
				ctx.session = new Session({ imported: snapshot });
				if (page.url.pathname !== `${base}/session`) {
					goto(`${base}/session`, { replaceState: true });
				}
			} catch (e) {
				toast.error(`Failed to load shared session: ${e}`);
			}
			return;
		}

		await ctx.server.fetchAll();

		const sessionId = page.url.searchParams.get('sessionId');
		if (sessionId) {
			const sessionData = ctx.server.sessions[sessionId];
			if (sessionData) {
				ctx.session = new Session({
					server: ctx.server,
					namespace: ctx.server.namespace,
					sessionId: sessionId
				});
			}
		}
	});

	let socket = $state({
		userInput: new UserInput()
	});

	socketCtx.set(socket);
</script>

{#if tour.currentTarget}
	<TourOverlay items={tour.steps} />
{/if}

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
