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
<Toaster />

<TooltipProvider>
	{@render children()}
</TooltipProvider>
