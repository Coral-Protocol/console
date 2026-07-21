<script lang="ts">
	import { Toaster } from '@coral-os/component-library/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import { TooltipProvider } from '@coral-os/component-library/components/ui/tooltip/index.js';

	let { children } = $props();
</script>

<svelte:head>
	<title>Coral Console</title>
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
