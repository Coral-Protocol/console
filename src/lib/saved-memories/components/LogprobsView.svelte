<script lang="ts">
	/**
	 * Renders response metadata captured from a "Make Request" run:
	 *   - status + finish reason
	 *   - usage summary (tokens in/out)
	 *   - logprobs: per-token probability heatmap + top-k alternatives on hover
	 *
	 * We accept the raw OpenAI `logprobs.content` shape:
	 *   [{ token, logprob, top_logprobs: [{ token, logprob }] }, ...]
	 * Other providers may emit a slightly different shape — in that case we
	 * fall back to a raw JSON view so the user still gets the information.
	 */
	import * as HoverCard from '@coral-os/component-library/ui/hover-card/index.js';
	import { CodeBlock } from '@coral-os/component-library';
	import type { SavedMessage } from '../types';

	interface LogprobToken {
		token: string;
		logprob: number;
		top_logprobs?: { token: string; logprob: number }[];
	}

	interface Props {
		meta: NonNullable<SavedMessage['responseMeta']>;
	}

	let { meta }: Props = $props();

	let tokens = $derived.by<LogprobToken[] | null>(() => {
		const lp = meta.logprobs as unknown;
		if (lp && typeof lp === 'object') {
			const content = (lp as Record<string, unknown>).content;
			if (Array.isArray(content)) return content as LogprobToken[];
		}
		return null;
	});

	function probColor(logprob: number): string {
		// logprob is ≤ 0; exp() gives probability ∈ (0,1].
		const p = Math.exp(logprob);
		// Map p ∈ [0,1] onto a green↔red gradient (high prob = green).
		const hue = Math.round(p * 120); // 0=red, 120=green
		return `hsl(${hue} 70% 80% / 0.6)`;
	}

	function fmtProb(logprob: number): string {
		const p = Math.exp(logprob);
		return `${(p * 100).toFixed(2)}% (logp=${logprob.toFixed(3)})`;
	}
</script>

<section class="flex flex-col gap-2">
	<header class="flex flex-wrap items-center gap-2 text-xs">
		<span class="bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded px-2 py-0.5 font-mono uppercase">
			response
		</span>
		{#if meta.statusCode}
			<span class="text-muted-foreground font-mono">HTTP {meta.statusCode}</span>
		{/if}
		{#if meta.finishReason}
			<span class="text-muted-foreground">finish: <span class="font-mono">{meta.finishReason}</span></span>
		{/if}
		{#if meta.usage && typeof meta.usage === 'object'}
			{@const u = meta.usage as Record<string, unknown>}
			{#if typeof u.prompt_tokens === 'number'}
				<span class="text-muted-foreground">↑ <span class="font-mono">{u.prompt_tokens}</span></span>
			{/if}
			{#if typeof u.completion_tokens === 'number'}
				<span class="text-muted-foreground">↓ <span class="font-mono">{u.completion_tokens}</span></span>
			{/if}
		{/if}
	</header>

	{#if tokens && tokens.length > 0}
		<div class="border-border/60 flex flex-wrap gap-px rounded border p-2 font-mono text-[12px] leading-5">
			{#each tokens as tk, i (i)}
				<HoverCard.Root openDelay={120} closeDelay={60}>
					<HoverCard.Trigger>
						{#snippet child({ props })}
							<span
								{...props}
								class="cursor-default rounded px-0.5 hover:ring-1 hover:ring-violet-400"
								style="background-color: {probColor(tk.logprob)};"
							>
								{tk.token === '\n' ? '↵\n' : tk.token === '\t' ? '⇥' : tk.token}
							</span>
						{/snippet}
					</HoverCard.Trigger>
					<HoverCard.Content class="w-72 text-xs" side="top" align="start">
						<div class="mb-1 font-mono text-sm">
							{tk.token === '\n' ? '\\n' : tk.token}
						</div>
						<div class="text-muted-foreground mb-2">{fmtProb(tk.logprob)}</div>
						{#if tk.top_logprobs && tk.top_logprobs.length > 0}
							<div class="text-muted-foreground mb-1 text-[10px] uppercase tracking-wide">
								alternatives
							</div>
							<dl class="grid grid-cols-[1fr_max-content] gap-x-2 gap-y-0.5">
								{#each tk.top_logprobs as alt, j (j)}
									<dt class="truncate font-mono">{alt.token === '\n' ? '\\n' : alt.token}</dt>
									<dd class="text-muted-foreground text-right font-mono">{fmtProb(alt.logprob)}</dd>
								{/each}
							</dl>
						{/if}
					</HoverCard.Content>
				</HoverCard.Root>
			{/each}
		</div>
	{:else if meta.logprobs !== undefined && meta.logprobs !== null}
		<details class="text-xs">
			<summary class="text-muted-foreground cursor-pointer">Logprobs (raw)</summary>
			<CodeBlock
				text={JSON.stringify(meta.logprobs, null, 2)}
				class="overflow-auto whitespace-pre-wrap"
				language="json"
			/>
		</details>
	{/if}

	{#if meta.raw !== undefined}
		<details class="text-xs">
			<summary class="text-muted-foreground cursor-pointer">Raw response body</summary>
			<CodeBlock
				text={typeof meta.raw === 'string' ? meta.raw : JSON.stringify(meta.raw, null, 2)}
				class="overflow-auto whitespace-pre-wrap"
				language="json"
			/>
		</details>
	{/if}
</section>
