<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';

	import type { SessionEventEntry } from '../session.svelte';
	import { agentNameForEvent } from '../session.svelte';
	import { metaFor } from './event-meta';
	import { colorClasses } from './event-color';

	interface Props {
		entry: SessionEventEntry | null;
		onOpenChange: (open: boolean) => void;
	}

	let { entry, onOpenChange }: Props = $props();

	let meta = $derived(entry ? metaFor(entry.event) : null);
	let colors = $derived(meta ? colorClasses(meta.color) : null);
	let agent = $derived(entry ? agentNameForEvent(entry.event) : null);
	let ts = $derived(entry ? new Date(entry.time).toISOString() : '');

	// Stringify lazily; modal opens are infrequent enough that we don't need
	// to memoize across non-null entries.
	let payload = $derived(entry ? JSON.stringify(entry.event, null, 2) : '');
</script>

<Dialog.Root open={entry !== null} {onOpenChange}>
	<Dialog.Content class="max-w-3xl">
		{#if entry && meta && colors}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<meta.icon class="size-5 {colors.icon}" />
					<span>{meta.label}</span>
					<span class="text-muted-foreground ml-auto font-mono text-xs">#{entry.seq}</span>
				</Dialog.Title>
				<Dialog.Description>
					<span class="font-mono">{ts}</span>
					{#if agent}
						<span> · agent <span class="font-mono">{agent}</span></span>
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<!--
			  For the first iteration we render the raw event payload as JSON.
			  Per-type interactive modals (e.g. an LLM call inspector) will
			  branch off from here in follow-up work.
			-->
			<pre
				class="bg-muted text-foreground/90 max-h-[60vh] overflow-auto rounded-md p-3 text-xs leading-relaxed">{payload}</pre>
		{/if}
	</Dialog.Content>
</Dialog.Root>
