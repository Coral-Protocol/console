<script lang="ts">
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';
	import SessionBudget from './SessionBudget.svelte';
	import SessionRuntime from './SessionRuntime.svelte';
	import SessionAnnotations from './SessionAnnotations.svelte';
</script>

<section class="flex flex-col gap-4 p-2">
	<SessionBudget />
	<Separator />
	<SessionRuntime />
	<Separator />

	<SessionAnnotations />
</section>
