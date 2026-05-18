<script lang="ts">
	import * as HoverCard from '@coral-os/component-library/ui/hover-card/index.js';

	import type { SessionEvent, SessionEventEntry } from '../session.svelte';
	import { agentNameForEvent } from '../session.svelte';
	import { chipBadges, chipPrimaryText, metaFor } from './event-meta';
	import { colorClasses } from './event-color';
	import { extractUsage, formatCostUsd, formatTokens } from './llm-usage';

	interface Props {
		entry: SessionEventEntry;
		/** Click handler opens the detail dialog. */
		onclick: (entry: SessionEventEntry) => void;
		/**
		 * Side of the chip relative to the viewport center. Used as a hint
		 * for the hover card to choose a side that won't overflow.
		 */
		anchorSide?: 'left' | 'right';
	}

	let { entry, onclick, anchorSide = 'right' }: Props = $props();

	let meta = $derived(metaFor(entry.event));
	let agent = $derived(agentNameForEvent(entry.event));
	let primary = $derived(chipPrimaryText(entry.event));
	let badges = $derived(chipBadges(entry.event));
	let colors = $derived(colorClasses(meta.color));
	let ts = $derived(new Date(entry.time).toLocaleTimeString(undefined, { hour12: false }));

	/**
	 * Produce a short, human-readable description for the hover card. We
	 * deliberately keep this terse — the modal carries the full payload.
	 */
	function summary(event: SessionEvent): string {
		switch (event.type) {
			case 'thread_message_sent': {
				const m = event.message;
				const mentions = m.mentionNames.length
					? `mentions ${m.mentionNames.join(', ')}`
					: 'no mentions';
				return `${m.senderName} → thread ${m.threadId.slice(0, 8)} (${mentions})`;
			}
			case 'thread_created':
				return `Thread "${event.thread.name}" (${event.thread.participants.length} participants)`;
			case 'thread_closed':
				return `Thread ${event.threadId.slice(0, 8)} closed${event.summary ? `: ${event.summary}` : ''}`;
			case 'thread_participant_added':
				return `${event.name} joined ${event.threadId.slice(0, 8)}`;
			case 'thread_participant_removed':
				return `${event.name} left ${event.threadId.slice(0, 8)}`;
			case 'agent_connected':
				return `${event.name} connected`;
			case 'agent_sleep_start':
				return `${event.name} started sleeping`;
			case 'agent_sleep_stop':
				return `${event.name} woke up`;
			case 'agent_wait_start':
				return `${event.name} waiting`;
			case 'agent_wait_stop':
				return `${event.name} resumed`;
			case 'runtime_started':
				return `${event.name} runtime started`;
			case 'runtime_stopped':
				return `${event.name} runtime stopped`;
			case 'llm_proxy_call':
				return `${event.agentName} → ${event.modelName} (${event.statusCode})`;
			case 'detailed_llm_proxy_request':
				return `${event.agentName} → ${event.modelName} request`;
			case 'detailed_llm_proxy_response':
				return `${event.agentName} ← response (${event.statusCode})`;
			case 'docker_container_created':
				return `Container ${event.containerId.slice(0, 12)} created`;
			case 'docker_container_removed':
				return `Container ${event.containerId.slice(0, 12)} removed`;
			default:
				return '';
		}
	}

	let summaryText = $derived(summary(entry.event));
	let usage = $derived(extractUsage(entry.event));
	// Width of the prompt segment in the input/output ratio bar. We fall
	// back to a 50/50 split when we know there's usage data but neither
	// side is computable, just so the bar still renders meaningfully.
	let promptPct = $derived(
		usage && usage.promptRatio !== null ? Math.round(usage.promptRatio * 100) : 50
	);
</script>

<HoverCard.Root openDelay={120} closeDelay={80}>
	<HoverCard.Trigger>
		<button
			type="button"
			class="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 {colors.chip}"
			onclick={() => onclick(entry)}
			aria-label={`${meta.label}${agent ? ` from ${agent}` : ''} at ${ts}`}
		>
			<meta.icon class="size-3.5 shrink-0 {colors.icon}" aria-hidden="true" />
			{#if primary}
				<span class="max-w-[10rem] truncate">{primary}</span>
			{/if}
			{#each badges as badge (badge.title)}
				<span title={badge.title} class="opacity-70">
					<badge.icon class="size-3" aria-hidden="true" />
				</span>
			{/each}
		</button>
	</HoverCard.Trigger>
	<HoverCard.Content
		side={anchorSide === 'right' ? 'left' : 'right'}
		align="start"
		class="w-80 text-xs"
	>
		<div class="flex items-center gap-2">
			<meta.icon class="size-4 {colors.icon}" />
			<span class="font-semibold">{meta.label}</span>
			<span class="text-muted-foreground ml-auto">{ts}</span>
		</div>
		{#if agent}
			<div class="text-muted-foreground mt-1">
				agent: <span class="text-foreground font-mono">{agent}</span>
			</div>
		{/if}
		{#if summaryText}
			<div class="mt-2 text-sm">{summaryText}</div>
		{/if}
		{#if usage}
			<div class="mt-3 flex flex-col gap-1">
				<div class="flex items-center justify-between text-[10px]">
					<span class="text-sky-600 dark:text-sky-400">
						↑ <span class="font-mono">{formatTokens(usage.prompt)}</span> in
					</span>
					<span class="text-violet-600 dark:text-violet-400">
						<span class="font-mono">{formatTokens(usage.completion)}</span> out ↓
					</span>
				</div>
				<!--
				  Input/output ratio bar. Sky = prompt, violet = completion;
				  the cached prompt subset is drawn as a darker overlay on
				  the prompt side to show how much was reused.
				-->
				<div
					class="bg-muted relative h-1.5 w-full overflow-hidden rounded-full"
					title={`prompt ${usage.prompt ?? '—'} / completion ${usage.completion ?? '—'}`}
				>
					<div
						class="absolute inset-y-0 left-0 bg-sky-500/70"
						style="width: {promptPct}%;"
					></div>
					{#if usage.cachedRatio !== null && usage.prompt !== null}
						<div
							class="absolute inset-y-0 left-0 bg-sky-700/80"
							style="width: {(promptPct * usage.cachedRatio).toFixed(2)}%;"
							title={`cached ${usage.cachedPrompt} / ${usage.prompt}`}
						></div>
					{/if}
					<div
						class="absolute inset-y-0 right-0 bg-violet-500/70"
						style="width: {100 - promptPct}%;"
					></div>
				</div>
				<div class="text-muted-foreground flex flex-wrap items-center justify-between text-[10px]">
					{#if usage.cachedRatio !== null}
						<span>
							cached <span class="font-mono">{Math.round(usage.cachedRatio * 100)}%</span>
							of input
						</span>
					{:else}
						<span></span>
					{/if}
					{#if usage.total !== null}
						<span>
							total <span class="font-mono">{formatTokens(usage.total)}</span>
							{#if usage.costUsd !== null}
								· <span class="font-mono">{formatCostUsd(usage.costUsd)}</span>
							{/if}
						</span>
					{:else if usage.costUsd !== null}
						<span class="font-mono">{formatCostUsd(usage.costUsd)}</span>
					{/if}
				</div>
			</div>
		{/if}
		<div class="text-muted-foreground mt-2 text-[10px] italic">Click for full details</div>
	</HoverCard.Content>
</HoverCard.Root>
