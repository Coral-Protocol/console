import type { SessionEvent } from '../session.svelte';

/**
 * Normalized view of the various token-usage shapes we encounter.
 *
 * The strongly typed `event.usage` carries only the high-level totals
 * (`inputTokens` / `outputTokens`), but the raw response body returned by
 * upstream providers (OpenAI / OpenRouter / Anthropic-via-OpenRouter) also
 * carries a richer breakdown — cached prompt tokens, reasoning tokens, and
 * sometimes cost. We surface whatever we can find.
 */
export interface NormalizedUsage {
	/** Tokens that went into the prompt (input). */
	prompt: number | null;
	/** Tokens produced by the model (output / completion). */
	completion: number | null;
	/** Total = prompt + completion when both are available. */
	total: number | null;
	/** Cached prompt tokens (subset of `prompt`). */
	cachedPrompt: number | null;
	/** Reasoning tokens (subset of `completion`, when reported). */
	reasoning: number | null;
	/** USD cost, when reported by the upstream (e.g. OpenRouter). */
	costUsd: number | null;
	/** Ratio of prompt to total, in [0,1]. `null` when we can't compute it. */
	promptRatio: number | null;
	/** Ratio of cached/prompt, in [0,1]. `null` when prompt is 0 or unknown. */
	cachedRatio: number | null;
}

function asNumber(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function pickNumber(obj: Record<string, unknown> | null | undefined, keys: string[]): number | null {
	if (!obj) return null;
	for (const k of keys) {
		const v = asNumber(obj[k]);
		if (v !== null) return v;
	}
	return null;
}

/**
 * Extract a normalized usage block from a `detailed_llm_proxy_response`
 * event. Returns `null` when no usage information is present anywhere.
 *
 * We accept both the typed top-level `usage` (Coral's LlmUsage) and the
 * raw upstream body, since the latter is much richer (cached / reasoning
 * tokens, cost). Field names are looked up in both snake_case and
 * camelCase to tolerate provider variation.
 */
export function extractUsage(event: SessionEvent | null | undefined): NormalizedUsage | null {
	if (!event || event.type !== 'detailed_llm_proxy_response') return null;

	const typed = (event as { usage?: { inputTokens?: number; outputTokens?: number } }).usage ?? null;

	const body = (event as { body?: { body?: unknown } }).body?.body;
	const rawUsage =
		body && typeof body === 'object'
			? ((body as Record<string, unknown>).usage as Record<string, unknown> | undefined) ?? null
			: null;

	const promptDetails =
		rawUsage &&
		typeof rawUsage === 'object' &&
		((rawUsage.prompt_tokens_details ?? rawUsage.promptTokensDetails) as
			| Record<string, unknown>
			| undefined);
	const completionDetails =
		rawUsage &&
		typeof rawUsage === 'object' &&
		((rawUsage.completion_tokens_details ?? rawUsage.completionTokensDetails) as
			| Record<string, unknown>
			| undefined);

	const prompt =
		pickNumber(rawUsage, ['prompt_tokens', 'promptTokens', 'input_tokens', 'inputTokens']) ??
		asNumber(typed?.inputTokens);
	const completion =
		pickNumber(rawUsage, [
			'completion_tokens',
			'completionTokens',
			'output_tokens',
			'outputTokens'
		]) ?? asNumber(typed?.outputTokens);
	let total = pickNumber(rawUsage, ['total_tokens', 'totalTokens']);
	if (total === null && prompt !== null && completion !== null) total = prompt + completion;

	const cachedPrompt =
		pickNumber(promptDetails || null, ['cached_tokens', 'cachedTokens']) ??
		pickNumber(rawUsage, ['cached_tokens', 'cachedTokens']);
	const reasoning =
		pickNumber(completionDetails || null, ['reasoning_tokens', 'reasoningTokens']) ??
		pickNumber(rawUsage, ['reasoning_tokens', 'reasoningTokens']);
	const costUsd = pickNumber(rawUsage, ['cost', 'total_cost', 'totalCost']);

	const anything =
		prompt !== null ||
		completion !== null ||
		total !== null ||
		cachedPrompt !== null ||
		reasoning !== null ||
		costUsd !== null;
	if (!anything) return null;

	const promptRatio =
		prompt !== null && completion !== null && prompt + completion > 0
			? prompt / (prompt + completion)
			: null;
	const cachedRatio =
		cachedPrompt !== null && prompt !== null && prompt > 0 ? cachedPrompt / prompt : null;

	return {
		prompt,
		completion,
		total,
		cachedPrompt,
		reasoning,
		costUsd,
		promptRatio,
		cachedRatio
	};
}

/**
 * Format a token count compactly — `1.2k` for >= 1000 — so it fits in tight
 * chrome like the hover card and modal header.
 */
export function formatTokens(n: number | null): string {
	if (n === null) return '—';
	if (n < 1000) return String(n);
	if (n < 10_000) return `${(n / 1000).toFixed(2)}k`;
	if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
	if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
	return `${(n / 1_000_000).toFixed(2)}M`;
}

/** Format a USD cost, picking enough precision to be useful for small calls. */
export function formatCostUsd(n: number | null): string {
	if (n === null) return '—';
	if (n === 0) return '$0';
	if (n < 0.0001) return `$${n.toExponential(2)}`;
	if (n < 0.01) return `$${n.toFixed(5)}`;
	if (n < 1) return `$${n.toFixed(4)}`;
	return `$${n.toFixed(3)}`;
}
