<script lang="ts">
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';
	import SessionBudget from './SessionBudget.svelte';
	import SessionRuntime from './SessionRuntime.svelte';
</script>

<section class="p-2 flex flex-col gap-2">
	<SessionBudget />
	<Separator/>
	<SessionRuntime />
</section>
