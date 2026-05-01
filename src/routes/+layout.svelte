<script lang="ts">
	import { Toaster } from '@coral-os/component-library/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	import { TooltipProvider } from '@coral-os/component-library/components/ui/tooltip/index.js';
	import { positionFixed } from '@unovis/ts/components/tooltip/style';

	let { children } = $props();
</script>

<svelte:head>
	<title>Coral Console</title>
</svelte:head>

<ModeWatcher />
<Toaster
	position="bottom-center"
	toastOptions={{
		classes: {
			toast: '!rounded-none'
		}
	}}
/>

<TooltipProvider>
	{@render children()}
</TooltipProvider>
