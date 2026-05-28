/**
 * Saved Memories — local data model.
 *
 * A "saved memory" is a snapshot of an LLM request the user has decided to
 * keep around for editing, iterating, and replaying. We deliberately use a
 * UI-friendly intermediate shape (rather than the raw provider payload) so
 * the editor can:
 *  - reorder / duplicate / disable individual messages and tools without
 *    losing information,
 *  - round-trip unknown provider-specific keys through `extras`,
 *  - and serialise/deserialise to the chat-completion payload shape on
 *    demand for the replay endpoint.
 *
 * The model intentionally keeps room for future AI-assisted edits — e.g.
 * Deepseek FIM (prompt+suffix completion) — by tagging each message with a
 * stable id and allowing tools/messages to be marked `included=false`
 * (commented out) while still being retained.
 */
import type { components } from '$generated/api';

export type DetailedLlmProxyRequestBody = Extract<
	components['schemas']['SessionEvent'],
	{ type: 'detailed_llm_proxy_request' }
>['body'];

export type RequestFormat = DetailedLlmProxyRequestBody['format'];

/** OpenAI-style tool entry: { type: 'function', function: { name, description?, parameters? } } */
export interface SavedTool {
	id: string;
	included: boolean;
	/** Raw OpenAI-shaped tool object. We keep it as JSON so it round-trips
	 * provider-specific fields (e.g. anthropic vs openai schema quirks). */
	raw: Record<string, unknown>;
}

/** A single conversation message — author + content + (optionally) tool calls. */
export interface SavedMessage {
	id: string;
	/** Toggle to exclude this message from the actual request payload while
	 * still keeping it around in the editor (the "comment out" feature). */
	included: boolean;
	/** Free-form role string — UI restricts the picker to common values but
	 * any non-empty string passes through. */
	role: string;
	/** Optional explicit name (OpenAI tool-result / participant name field). */
	name?: string;
	/**
	 * Content payload. Stored verbatim from the provider — for most messages
	 * a simple string; OpenAI multi-part content arrays are also valid here.
	 */
	content: unknown;
	/** OpenAI tool_calls array, raw passthrough. */
	toolCalls?: unknown[];
	/** OpenAI tool_call_id (for role=tool messages). */
	toolCallId?: string;
	/** Provider-specific fields we don't model explicitly; merged back on serialise. */
	extras?: Record<string, unknown>;
	/** Optional response metadata — populated when this message is the
	 * captured response of a "Make Request" run so we can surface usage and
	 * logprobs alongside the message. */
	responseMeta?: {
		usage?: unknown;
		logprobs?: unknown;
		finishReason?: string;
		statusCode?: number;
		raw?: unknown;
	};
	/**
	 * Alternate sibling messages occupying the same slot in the conversation.
	 *
	 * Populated when the user re-runs "Make Request" on a memory that already
	 * has a captured assistant response: instead of stacking responses at the
	 * end, the previous response is demoted into `alternates` of the new one.
	 * The "main" SavedMessage is the active alternate; switching simply
	 * promotes a sibling. Excluded from serialised payloads.
	 */
	alternates?: SavedMessage[];
}

/** Hyperparameters surfaced as first-class editable fields. Unknown keys live
 * in `extras` so they round-trip without loss. */
export interface SavedHyperparameters {
	model?: string;
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stop?: unknown;
	seed?: number;
	logprobs?: boolean;
	top_logprobs?: number;
	stream?: boolean;
	/** OpenAI tool_choice — 'auto' | 'none' | 'required' | { type:'function', function:{name} } */
	tool_choice?: unknown;
	parallel_tool_calls?: boolean;
	/** Future: Deepseek FIM uses a `suffix` field on /v1/completions. */
	suffix?: string;
	extras: Record<string, unknown>;
}

/** Origin coordinates — which session/agent/proxy-request this memory was
 * captured from. Carried forward so "Make Request" can target the replay
 * endpoint even after the originating event scrolled off the waterfall. */
export interface SavedMemoryOrigin {
	namespace: string;
	sessionId: string;
	agentName: string;
	providerRequestName: string;
	originalEventId?: string;
	upstreamUrl?: string;
}

export interface SavedMemory {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	notes?: string;
	origin?: SavedMemoryOrigin;
	/** The serialisation format expected by the replay endpoint. We keep the
	 * original format so editing an openai-shape memory replays as openai
	 * (and a raw one stays raw). */
	format: RequestFormat;
	messages: SavedMessage[];
	tools: SavedTool[];
	hyperparameters: SavedHyperparameters;
	/**
	 * For `format === 'raw'`: any top-level keys of the upstream JSON body
	 * that aren't `messages`/`tools`/known hyperparameters. Round-tripped
	 * back on serialise so editing the structured UI never silently drops
	 * provider-only fields.
	 */
	extras: Record<string, unknown>;
	/** Optional: the most recent response captured by Make Request. The
	 * conversation already carries this in `messages` (as an assistant
	 * message with `responseMeta`), this field is just a quick pointer. */
	lastResponseAt?: number;
}

/** Lightweight summary surfaced in the list view. */
export interface SavedMemorySummary {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	format: RequestFormat;
	messageCount: number;
	model?: string;
	originAgent?: string;
	originSession?: string;
}
