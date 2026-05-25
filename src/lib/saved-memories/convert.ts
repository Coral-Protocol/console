/**
 * Conversion between `DetailedLlmProxyRequestBody` (what the proxy event
 * carries / what the replay endpoint expects) and `SavedMemory` (the
 * UI-friendly editable shape).
 *
 * Design goals:
 *  - Lossless round-trip: any provider-specific keys we don't model are kept
 *    in `extras` on the relevant entity and re-emitted on serialise.
 *  - Stable ids: ids are generated once on import and preserved through
 *    edits so Svelte's keyed each blocks animate sensibly.
 *  - Format-aware: openai/openrouter give us a typed `request`; `raw` hands
 *    us the upstream JSON directly — we treat both uniformly.
 */
import type {
	DetailedLlmProxyRequestBody,
	RequestFormat,
	SavedHyperparameters,
	SavedMemory,
	SavedMessage,
	SavedTool
} from './types';

/** Tiny stable id generator — good enough for in-browser collections. */
let _seq = 0;
export function newId(prefix = 'm'): string {
	_seq += 1;
	const rand = Math.random().toString(36).slice(2, 8);
	return `${prefix}_${Date.now().toString(36)}_${_seq}_${rand}`;
}

/** Keys we lift out of the chat-completion payload into structured editors. */
const KNOWN_HYPER_KEYS = new Set<keyof SavedHyperparameters | string>([
	'model',
	'temperature',
	'top_p',
	'max_tokens',
	'frequency_penalty',
	'presence_penalty',
	'stop',
	'seed',
	'logprobs',
	'top_logprobs',
	'stream',
	'tool_choice',
	'parallel_tool_calls',
	'suffix'
]);

function isObject(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Read the upstream JSON-ish payload out of a request body, regardless of
 * its `format`. Returns null when the body is malformed. */
export function payloadOf(body: DetailedLlmProxyRequestBody): Record<string, unknown> | null {
	if (body.format === 'openai' || body.format === 'openrouter') {
		const req = (body as { request: unknown }).request;
		return isObject(req) ? req : null;
	}
	if (body.format === 'raw') {
		const raw = (body as { body: unknown }).body;
		return isObject(raw) ? raw : null;
	}
	return null;
}

/** Build a fresh empty memory shell for a given format. */
export function emptyMemory(format: RequestFormat = 'openai'): SavedMemory {
	const now = Date.now();
	return {
		id: newId('mem'),
		name: 'Untitled memory',
		createdAt: now,
		updatedAt: now,
		format,
		messages: [],
		tools: [],
		hyperparameters: { extras: {} },
		extras: {}
	};
}

/** Convert a `DetailedLlmProxyRequestBody` into a fresh `SavedMemory`. */
export function memoryFromRequestBody(
	body: DetailedLlmProxyRequestBody,
	opts: {
		name?: string;
		origin?: SavedMemory['origin'];
	} = {}
): SavedMemory {
	const now = Date.now();
	const payload = payloadOf(body) ?? {};
	const messages: SavedMessage[] = [];
	const tools: SavedTool[] = [];
	const hyper: SavedHyperparameters = { extras: {} };
	const extras: Record<string, unknown> = {};

	const rawMessages = payload.messages;
	if (Array.isArray(rawMessages)) {
		for (const m of rawMessages) {
			const parsed = messageFromRaw(m);
			if (parsed) messages.push(parsed);
		}
	}

	const rawTools = payload.tools;
	if (Array.isArray(rawTools)) {
		for (const t of rawTools) {
			if (isObject(t)) {
				tools.push({ id: newId('tool'), included: true, raw: t });
			}
		}
	}

	for (const [k, v] of Object.entries(payload)) {
		if (k === 'messages' || k === 'tools') continue;
		if (KNOWN_HYPER_KEYS.has(k)) {
			// We narrow at the property-set level; trust the upstream shape.
			(hyper as unknown as Record<string, unknown>)[k] = v;
		} else {
			extras[k] = v;
		}
	}

	return {
		id: newId('mem'),
		name: opts.name ?? defaultMemoryName(messages, hyper),
		createdAt: now,
		updatedAt: now,
		origin: opts.origin,
		format: body.format,
		messages,
		tools,
		hyperparameters: hyper,
		extras
	};
}

function defaultMemoryName(messages: SavedMessage[], hyper: SavedHyperparameters): string {
	const firstUser = messages.find((m) => m.role === 'user' || m.role === 'system');
	if (firstUser) {
		const txt = contentPreview(firstUser.content);
		if (txt) return txt.slice(0, 60);
	}
	if (hyper.model) return `Request · ${hyper.model}`;
	return 'Untitled memory';
}

function contentPreview(c: unknown): string | null {
	if (typeof c === 'string') return c.trim();
	if (Array.isArray(c)) {
		for (const p of c) {
			if (isObject(p) && typeof p.text === 'string') return p.text.trim();
		}
	}
	return null;
}

/** Parse a single raw message payload into our editable shape. */
export function messageFromRaw(m: unknown): SavedMessage | null {
	if (!isObject(m)) return null;
	const role = typeof m.role === 'string' ? m.role : 'user';
	const name = typeof m.name === 'string' ? m.name : undefined;
	const toolCallId =
		typeof m.tool_call_id === 'string'
			? m.tool_call_id
			: typeof m.toolCallId === 'string'
				? m.toolCallId
				: undefined;
	const rawTCs = m.tool_calls ?? m.toolCalls;
	const toolCalls = Array.isArray(rawTCs) ? (rawTCs as unknown[]) : undefined;

	const extras: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(m)) {
		if (k === 'role' || k === 'name' || k === 'content') continue;
		if (k === 'tool_call_id' || k === 'toolCallId') continue;
		if (k === 'tool_calls' || k === 'toolCalls') continue;
		extras[k] = v;
	}

	return {
		id: newId('msg'),
		included: true,
		role,
		name,
		content: m.content,
		toolCalls,
		toolCallId,
		extras: Object.keys(extras).length > 0 ? extras : undefined
	};
}

/** Serialise a `SavedMessage` back into the wire shape expected by the
 * chat-completion payload (snake_case tool fields). `included=false`
 * messages are excluded by the caller. */
export function messageToRaw(m: SavedMessage): Record<string, unknown> {
	const out: Record<string, unknown> = { ...(m.extras ?? {}) };
	out.role = m.role;
	if (m.name !== undefined) out.name = m.name;
	if (m.content !== undefined) out.content = m.content;
	if (m.toolCalls && m.toolCalls.length > 0) out.tool_calls = m.toolCalls;
	if (m.toolCallId !== undefined) out.tool_call_id = m.toolCallId;
	return out;
}

/** Serialise a saved memory back into a `DetailedLlmProxyRequestBody`. */
export function memoryToRequestBody(mem: SavedMemory): DetailedLlmProxyRequestBody {
	const payload: Record<string, unknown> = { ...mem.extras };

	const messages = mem.messages.filter((m) => m.included).map(messageToRaw);
	payload.messages = messages;

	const tools = mem.tools.filter((t) => t.included).map((t) => t.raw);
	if (tools.length > 0) payload.tools = tools;
	else delete payload.tools;

	const hyper = mem.hyperparameters;
	for (const k of KNOWN_HYPER_KEYS) {
		const v = (hyper as unknown as Record<string, unknown>)[k as string];
		if (v !== undefined && v !== null && v !== '') payload[k as string] = v;
		else delete payload[k as string];
	}
	for (const [k, v] of Object.entries(hyper.extras ?? {})) payload[k] = v;

	if (mem.format === 'raw') {
		return { format: 'raw', body: payload } as DetailedLlmProxyRequestBody;
	}
	return { format: mem.format, request: payload } as DetailedLlmProxyRequestBody;
}

/**
 * Apply a raw-JSON edit back onto a memory in-place, **preserving** any
 * information present in the structured memory that is *not* surfaced in
 * the raw payload. This lets the user edit the raw view freely without
 * losing UI-only state (e.g. message ids, `included=false` markers).
 *
 * Strategy:
 *  - Re-parse messages: match incoming raw messages to existing SavedMessages
 *    by index for `included=true` slots. Newly appended messages get new
 *    ids. Excluded messages (`included=false`) are kept in their original
 *    positions and not affected by the edit.
 *  - Tools: same index-match-then-append strategy, restricted to
 *    `included=true` entries.
 *  - Hyperparameters/extras: replaced wholesale from the new payload.
 */
export function mergeRawIntoMemory(mem: SavedMemory, rawBody: DetailedLlmProxyRequestBody): void {
	mem.format = rawBody.format;
	const payload = payloadOf(rawBody);
	if (!payload) return;

	// Messages — preserve excluded ones in place.
	const incoming = Array.isArray(payload.messages) ? (payload.messages as unknown[]) : [];
	const oldMessages = mem.messages.slice();
	const newMessages: SavedMessage[] = [];
	let incomingIdx = 0;
	for (const old of oldMessages) {
		if (!old.included) {
			newMessages.push(old);
			continue;
		}
		const next = incoming[incomingIdx++];
		if (next === undefined) {
			// Raw edit removed this slot — drop it.
			continue;
		}
		const parsed = messageFromRaw(next);
		if (parsed) {
			parsed.id = old.id; // preserve identity for animations
			parsed.included = true;
			newMessages.push(parsed);
		}
	}
	for (; incomingIdx < incoming.length; incomingIdx++) {
		const parsed = messageFromRaw(incoming[incomingIdx]);
		if (parsed) newMessages.push(parsed);
	}
	mem.messages = newMessages;

	// Tools — same idea.
	const incomingTools = Array.isArray(payload.tools) ? (payload.tools as unknown[]) : [];
	const oldTools = mem.tools.slice();
	const newTools: SavedTool[] = [];
	let ti = 0;
	for (const old of oldTools) {
		if (!old.included) {
			newTools.push(old);
			continue;
		}
		const next = incomingTools[ti++];
		if (next === undefined) continue;
		if (isObject(next)) newTools.push({ ...old, raw: next });
	}
	for (; ti < incomingTools.length; ti++) {
		const t = incomingTools[ti];
		if (isObject(t)) newTools.push({ id: newId('tool'), included: true, raw: t });
	}
	mem.tools = newTools;

	// Hyperparameters + extras — replaced wholesale.
	const hyper: SavedHyperparameters = { extras: {} };
	const extras: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(payload)) {
		if (k === 'messages' || k === 'tools') continue;
		if (KNOWN_HYPER_KEYS.has(k)) {
			(hyper as unknown as Record<string, unknown>)[k] = v;
		} else {
			extras[k] = v;
		}
	}
	mem.hyperparameters = hyper;
	mem.extras = extras;
}
