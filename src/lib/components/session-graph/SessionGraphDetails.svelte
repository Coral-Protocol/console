<script lang="ts">
	/**
	 * Details dialog for a node selected in the SessionGraph. Mirrors the
	 * Waterfall's EventDialog UX: opens on click, closes on backdrop
	 * dismiss, shows summary stats up top and a JSON dump of the raw
	 * underlying state at the bottom for power users.
	 */
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import type { Session } from '$lib/session.svelte';
	import type { AgentStats, ThreadStats } from './data';

	interface Props {
		session: Session;
		selectedId: string | null;
		onClose: () => void;
		agentStats: Record<string, AgentStats>;
		threadStats: Record<string, ThreadStats>;
	}
	let { session, selectedId, onClose, agentStats, threadStats }: Props = $props();

	let parsed = $derived.by(() => {
		if (!selectedId) return null as null | { kind: 'agent' | 'thread'; key: string };
		if (selectedId.startsWith('a:')) return { kind: 'agent' as const, key: selectedId.slice(2) };
		if (selectedId.startsWith('t:')) return { kind: 'thread' as const, key: selectedId.slice(2) };
		return null;
	});

	let payload = $derived.by(() => {
		if (!parsed) return null;
		if (parsed.kind === 'agent') return session.agents[parsed.key] ?? null;
		const t = session.threads[parsed.key];
		if (!t) return null;
		// Strip the SvelteSet so JSON.stringify doesn't choke.
		return { ...t, participants: Array.from(t.participants) };
	});
</script>

<Dialog.Root
	open={selectedId !== null}
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
>
	<Dialog.Content class="max-w-2xl">
		{#if parsed}
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					{#if parsed.kind === 'agent'}
						<span
							class="inline-block size-3 rounded-full border-2 border-emerald-500"
							aria-hidden="true"
						></span>
						<span>Agent</span>
					{:else}
						<span
							class="inline-block size-3 rounded-sm border-2 border-teal-500"
							aria-hidden="true"
						></span>
						<span>Thread</span>
					{/if}
					<span class="font-mono">{parsed.key}</span>
				</Dialog.Title>
				<Dialog.Description>
					{#if parsed.kind === 'agent'}
						{@const s = agentStats[parsed.key]}
						{#if s}
							LLM calls <span class="font-mono">{s.llmCalls}</span> ·
							messages sent <span class="font-mono">{s.messagesSent}</span> ·
							threads <span class="font-mono">{s.threads}</span>
						{/if}
					{:else}
						{@const s = threadStats[parsed.key]}
						{#if s}
							{s.state} · messages <span class="font-mono">{s.messages}</span> ·
							participants <span class="font-mono">{s.participants}</span>
						{/if}
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if payload}
				<pre
					class="bg-muted text-foreground/90 max-h-[60vh] overflow-auto rounded-md p-3 text-xs leading-relaxed">{JSON.stringify(
						payload,
						null,
						2
					)}</pre>
			{:else}
				<div class="text-muted-foreground text-sm">No state captured for this node.</div>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
