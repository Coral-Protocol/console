/**
 * "Make Request" plumbing for saved memories.
 *
 * The server's replay endpoint is fire-and-forget: it does not return the
 * upstream response body in its HTTP response. Instead it emits a
 * `detailed_llm_proxy_request` (with `editOf` set to the original event id)
 * and a `detailed_llm_proxy_response` over the session-scoped websocket.
 *
 * To keep the Saved Memories page self-contained (and to avoid needing to
 * pin a live `Session` instance), we open an ephemeral session-events
 * websocket, fire the replay, await the matching response, then close.
 */
import type { CoralServer } from '$lib/CoralServer.svelte';
import { config } from '$lib/config';
import { browser } from '$app/environment';
import type { components } from '$generated/api';
import type { DetailedLlmProxyRequestBody, SavedMemory, SavedMessage } from './types';
import { newId } from './convert';

type SessionEvent = components['schemas']['SessionEvent'];
type DetailedRequest = Extract<SessionEvent, { type: 'detailed_llm_proxy_request' }>;
type DetailedResponse = Extract<SessionEvent, { type: 'detailed_llm_proxy_response' }>;

export type LlmProxyProviderInfo = components['schemas']['LlmProxyProviderInfo'];
export type AgentLlmProxyBinding = components['schemas']['AgentLlmProxyBinding'];

export async function fetchProviders(server: CoralServer): Promise<LlmProxyProviderInfo[]> {
	const res = await server.api.GET('/api/v1/llm-proxy/providers');
	return (res.data ?? []) as LlmProxyProviderInfo[];
}

export async function fetchAgentBindings(
	server: CoralServer,
	namespace: string,
	sessionId: string,
	agentName: string
): Promise<AgentLlmProxyBinding[]> {
	const res = await server.api.GET(
		'/api/v1/llm-proxy/session/{namespace}/{sessionId}/{agentName}/proxies',
		{ params: { path: { namespace, sessionId, agentName } } }
	);
	return (res.data ?? []) as AgentLlmProxyBinding[];
}

/** What "Make Request" returns to the caller. */
export interface ReplayResult {
	/** The full response event observed over the session websocket. */
	response: DetailedResponse;
	/** The replayed-request event the server emitted (carries `editOf`). */
	request: DetailedRequest;
}

interface ReplayOptions {
	server: CoralServer;
	memory: SavedMemory;
	body: DetailedLlmProxyRequestBody;
	upstreamUrl?: string;
	editOf?: string;
	/** ms — abort the wait for the response event if nothing arrives. */
	timeoutMs?: number;
}

/**
 * Issue a replay and await the matching response event.
 *
 * Match strategy: the first `detailed_llm_proxy_response` for the same
 * `agentName` + `providerRequestName` that arrives after the replay HTTP
 * call returns. This is racy in theory if multiple replays are issued
 * concurrently, but in practice this UI fires one at a time per memory.
 */
export async function replayMemory(opts: ReplayOptions): Promise<ReplayResult> {
	const { server, memory, body, upstreamUrl, editOf, timeoutMs = 120_000 } = opts;
	if (!browser) throw new Error('replayMemory requires the browser');
	const origin = memory.origin;
	if (!origin) {
		throw new Error('Memory has no origin — cannot replay without a target session');
	}

	const wsUrl = wsUrlFor(`/ws/v1/events/session/${origin.namespace}/${origin.sessionId}`);
	const ws = new WebSocket(wsUrl);

	const waitForResponse = new Promise<ReplayResult>((resolve, reject) => {
		let replayRequest: DetailedRequest | null = null;
		const timer = setTimeout(() => {
			reject(new Error('Timed out waiting for replay response'));
			ws.close();
		}, timeoutMs);

		ws.onmessage = (ev) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(ev.data);
			} catch {
				return;
			}
			if (!parsed || typeof parsed !== 'object') return;
			const e = parsed as SessionEvent;
			if (
				e.type === 'detailed_llm_proxy_request' &&
				e.agentName === origin.agentName &&
				e.providerRequestName === origin.providerRequestName &&
				e.editOf !== undefined
			) {
				replayRequest = e;
				return;
			}
			if (
				e.type === 'detailed_llm_proxy_response' &&
				e.agentName === origin.agentName &&
				e.providerRequestName === origin.providerRequestName &&
				replayRequest !== null
			) {
				clearTimeout(timer);
				ws.close();
				resolve({ response: e, request: replayRequest });
			}
		};
		ws.onerror = () => {
			clearTimeout(timer);
			reject(new Error('Session websocket error'));
		};
	});

	await new Promise<void>((resolve, reject) => {
		ws.onopen = () => resolve();
		ws.onclose = () => reject(new Error('Session websocket closed before open'));
	});

	const replayRes = await server.api.POST(
		'/api/v1/llm-proxy/session/{namespace}/{sessionId}/{agentName}/{proxyRequestName}/replay',
		{
			params: {
				path: {
					namespace: origin.namespace,
					sessionId: origin.sessionId,
					agentName: origin.agentName,
					proxyRequestName: origin.providerRequestName
				}
			},
			body: { body, upstreamUrl, editOf }
		}
	);
	if (replayRes.error) {
		ws.close();
		const err = replayRes.error as { message?: string };
		throw new Error(err.message ?? 'Replay request failed');
	}

	return waitForResponse;
}

function wsUrlFor(path: string): string {
	let url = config.PUBLIC_API_PATH;
	if (url[0] === '/') {
		url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${url.replace(/\/$/, '')}`;
	} else if (url[0] === 'h') {
		url = url.replace(/^http/, 'ws').replace(/\/$/, '');
	}
	return url + path;
}

/**
 * Extract a freshly captured assistant message from a `detailed_llm_proxy_response`
 * body. We try the common shapes (OpenAI chat-completions / OpenRouter /
 * Anthropic-style) and fall back to surfacing the entire body as raw
 * content so the user still has something to look at.
 *
 * The response message keeps:
 *  - its `content` (text or content array) and any `tool_calls`,
 *  - `responseMeta` carrying usage, logprobs, finish reason, and the raw
 *    response body for power users.
 */
export function responseToMessage(res: DetailedResponse): SavedMessage {
	const body = res.body as unknown;
	const meta: SavedMessage['responseMeta'] = {
		usage: res.usage,
		statusCode: res.statusCode,
		raw: body
	};

	let content: unknown;
	let toolCalls: unknown[] | undefined;
	let finishReason: string | undefined;
	let logprobs: unknown;

	if (body && typeof body === 'object') {
		const b = body as Record<string, unknown>;
		// OpenAI chat completion: { choices: [{ message: {...}, finish_reason, logprobs }] }
		const choices = b.choices;
		if (Array.isArray(choices) && choices.length > 0) {
			const c0 = choices[0];
			if (c0 && typeof c0 === 'object') {
				const co = c0 as Record<string, unknown>;
				if (typeof co.finish_reason === 'string') finishReason = co.finish_reason;
				if (co.logprobs !== undefined) logprobs = co.logprobs;
				const msg = co.message;
				if (msg && typeof msg === 'object') {
					const m = msg as Record<string, unknown>;
					content = m.content;
					if (Array.isArray(m.tool_calls)) toolCalls = m.tool_calls as unknown[];
				}
			}
		}
		// Anthropic-style: { content: [...] }
		if (content === undefined && Array.isArray(b.content)) content = b.content;
	}

	if (content === undefined) {
		// Last resort: stringify the entire body so the user can at least see it.
		content = typeof body === 'string' ? body : JSON.stringify(body);
	}

	if (finishReason) meta.finishReason = finishReason;
	if (logprobs !== undefined) meta.logprobs = logprobs;

	return {
		id: newId('msg'),
		included: true,
		role: 'assistant',
		content,
		toolCalls,
		responseMeta: meta
	};
}
