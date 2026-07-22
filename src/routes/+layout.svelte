<script lang="ts">
	import { browser } from '$app/environment';
	import { Toaster } from '@coral-os/component-library/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import { TooltipProvider } from '@coral-os/component-library/components/ui/tooltip/index.js';

	let { children } = $props();
	let title = $state('Coral Console');

	if (browser && window.location.hostname === 'localhost') {
		// svelte-ignore state_referenced_locally
		title = `[LOCAL] ${title}`;
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<ModeWatcher />
<Toaster
	position="bottom-left"
	toastOptions={{
		classes: {
			toast: '!rounded-none !w-[270px]',
			description: 'text-foreground/80! text-xs'
		}
	}}
/>

<TooltipProvider>
	{@render children()}
</TooltipProvider>
