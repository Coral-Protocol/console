<script lang="ts">
	import { socketCtx, UserInput } from '$lib/socket.svelte';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { appContext, type AppContext } from '$lib/context';
	import { CoralServer } from '$lib/CoralServer.svelte';
	import { onMount } from 'svelte';

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

	onMount(() => {
		ctx.server.fetchAll();
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
