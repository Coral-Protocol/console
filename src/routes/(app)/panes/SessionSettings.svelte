<script lang="ts">
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';
	import SessionBudget from './SessionBudget.svelte';
	import SessionRuntime from './SessionRuntime.svelte';
	import SessionAnnotations from './SessionAnnotations.svelte';
	import { activeFile } from '$lib/activeFile.svelte';
</script>

<section class="flex h-full grow flex-col gap-4 p-2">
	{#if activeFile.current}
		<SessionBudget />
		<Separator />
		<SessionRuntime />
		<Separator />
		<SessionAnnotations />
	{:else}
		<p class="text-muted-foreground h-full w-full grow content-center text-center text-sm">
			Open or create a new file to edit session settings.
		</p>
	{/if}
</section>
