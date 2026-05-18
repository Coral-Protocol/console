<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { CodeBlock } from '@coral-os/component-library';

	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import SlidersIcon from '@lucide/svelte/icons/sliders-horizontal';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	import type { SessionEvent, SessionEventEntry } from '$lib/session.svelte';

	type DetailedRequest = Extract<SessionEvent, { type: 'detailed_llm_proxy_request' }>;
	type DetailedResponse = Extract<SessionEvent, { type: 'detailed_llm_proxy_response' }>;

	interface NormalizedToolCall {
		id?: string;
		name: string;
		arguments: unknown;
		rawArguments?: string;
	}

	interface NormalizedMessage {
		role: string;
		name?: string;
		content?: unknown;
		toolCalls?: NormalizedToolCall[];
		toolCallId?: string;
	}

	interface NormalizedTool {
		name: string;
		description?: string;
		parameters?: unknown;
	}

	interface Props {
		entry: SessionEventEntry | null;
		onOpenChange: (open: boolean) => void;
	}

	let { entry, onOpenChange }: Props = $props();

	let event = $derived(entry?.event ?? null);
	let isRequest = $derived(event?.type === 'detailed_llm_proxy_request');
	let isResponse = $derived(event?.type === 'detailed_llm_proxy_response');

	// Request body (openai | openrouter | raw)
	let requestBody = $derived(isRequest && event ? (event as DetailedRequest).body : null);

	// Underlying chat-completion-ish payload. For openai/openrouter this is `body.request`.
	// For raw we look at `body.body` which is the upstream JSON sent to the provider.
	let payload = $derived.by<Record<string, unknown> | null>(() => {
		if (!requestBody) return null;
		if (requestBody.format === 'openai' || requestBody.format === 'openrouter') {
			return (requestBody as { request: Record<string, unknown> }).request ?? null;
		}
		if (requestBody.format === 'raw') {
			const raw = (requestBody as { body: unknown }).body;
			return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
		}
		return null;
	});

	function tryParseJson(input: string): unknown {
		try {
			return JSON.parse(input);
		} catch {
			return input;
		}
	}

	function normalizeToolCall(tc: unknown): NormalizedToolCall | null {
		if (!tc || typeof tc !== 'object') return null;
		const obj = tc as Record<string, unknown>;
		// OpenAI snake_case shape: { id, type, function: { name, arguments } }
		const fn = (obj.function ?? obj.fn) as Record<string, unknown> | undefined;
		let name: string | undefined;
		let args: unknown;
		let rawArgs: string | undefined;
		if (fn && typeof fn === 'object') {
			name = typeof fn.name === 'string' ? fn.name : undefined;
			const a = fn.arguments;
			if (typeof a === 'string') {
				rawArgs = a;
				args = tryParseJson(a);
			} else {
				args = a;
			}
		} else {
			// Already flat shape { name, arguments }
			name = typeof obj.name === 'string' ? obj.name : undefined;
			const a = obj.arguments;
			if (typeof a === 'string') {
				rawArgs = a;
				args = tryParseJson(a);
			} else {
				args = a;
			}
		}
		return {
			id: typeof obj.id === 'string' ? obj.id : undefined,
			name: name ?? '(unknown)',
			arguments: args,
			rawArguments: rawArgs
		};
	}

	function normalizeMessage(m: unknown): NormalizedMessage | null {
		if (!m || typeof m !== 'object') return null;
		const obj = m as Record<string, unknown>;
		const role = typeof obj.role === 'string' ? obj.role : 'unknown';
		const name = typeof obj.name === 'string' ? obj.name : undefined;
		const toolCallId =
			typeof obj.tool_call_id === 'string'
				? obj.tool_call_id
				: typeof obj.toolCallId === 'string'
					? obj.toolCallId
					: undefined;
		const rawTCs = (obj.tool_calls ?? obj.toolCalls) as unknown;
		const toolCalls = Array.isArray(rawTCs)
			? (rawTCs.map(normalizeToolCall).filter((x): x is NormalizedToolCall => x !== null) ?? [])
			: undefined;
		return {
			role,
			name,
			content: obj.content,
			toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
			toolCallId
		};
	}

	function normalizeTool(t: unknown): NormalizedTool | null {
		if (!t || typeof t !== 'object') return null;
		const obj = t as Record<string, unknown>;
		const fn = (obj.function ?? obj) as Record<string, unknown>;
		const name = typeof fn.name === 'string' ? fn.name : undefined;
		if (!name) return null;
		return {
			name,
			description: typeof fn.description === 'string' ? fn.description : undefined,
			parameters: fn.parameters
		};
	}

	let messages = $derived.by<NormalizedMessage[]>(() => {
		const raw = payload?.messages;
		if (!Array.isArray(raw)) return [];
		return raw.map(normalizeMessage).filter((m): m is NormalizedMessage => m !== null);
	});

	let tools = $derived.by<NormalizedTool[]>(() => {
		const raw = payload?.tools;
		if (!Array.isArray(raw)) return [];
		return raw.map(normalizeTool).filter((t): t is NormalizedTool => t !== null);
	});

	// Hyperparameters: everything in the payload except messages/tools.
	let hyperparameters = $derived.by(() => {
		if (!payload) return null;
		const rest: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(payload)) {
			if (k === 'messages' || k === 'tools') continue;
			rest[k] = v;
		}
		return rest;
	});

	let responseBody = $derived(isResponse && event ? (event as DetailedResponse).body : null);

	let hasMessages = $derived(isRequest && messages.length > 0);
	let hasTools = $derived(isRequest && tools.length > 0);
	let hasHyperparameters = $derived(
		isRequest && hyperparameters !== null && Object.keys(hyperparameters).length > 0
	);

	let defaultTab = $derived(hasMessages ? 'messages' : 'overview');

	const roleStyles: Record<string, string> = {
		system: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
		developer: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
		user: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
		assistant: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
		tool: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
	};

	function roleClass(role: string): string {
		return roleStyles[role] ?? 'bg-muted text-foreground';
	}

	function contentToString(c: unknown): string | null {
		if (typeof c === 'string') return c;
		if (Array.isArray(c)) {
			// OpenAI multi-part content: array of { type: 'text', text } or similar.
			const parts: string[] = [];
			let allText = true;
			for (const p of c) {
				if (p && typeof p === 'object') {
					const obj = p as Record<string, unknown>;
					if (typeof obj.text === 'string') {
						parts.push(obj.text);
						continue;
					}
				}
				allText = false;
				break;
			}
			if (allText && parts.length > 0) return parts.join('\n');
		}
		return null;
	}
</script>

<Dialog.Root open={entry !== null} {onOpenChange}>
	<Dialog.Content
		class="mx-auto flex h-[80%] max-h-[80%] w-full max-w-2xl min-w-[80%] flex-col overflow-hidden"
	>
		{#if event && (isRequest || isResponse)}
			<Tabs.Root value={defaultTab} class="flex h-full min-h-0 flex-col gap-4">
				<Dialog.Header class="flex flex-col gap-2 pr-8">
					<Dialog.Title class="flex items-center gap-2 font-[400]">
						{#if isRequest}
							<ArrowUp class="size-5 text-violet-500" />
							LLM Request
						{:else}
							<ArrowDown class="size-5 text-violet-500" />
							LLM Response
						{/if}
					</Dialog.Title>
					<span class="text-muted-foreground text-sm">
						<span class="font-mono">#{entry?.seq}</span>
						{#if 'agentName' in event}
							· <span class="font-mono">{event.agentName}</span>
						{/if}
						{#if isRequest && 'modelName' in event}
							· <span class="font-mono">{event.modelName}</span>
						{/if}
						{#if 'providerRequestName' in event}
							· {event.providerRequestName}
						{/if}
						{#if isRequest && requestBody}
							· <span class="font-mono">{requestBody.format}</span>
						{/if}
						{#if isResponse && 'statusCode' in event}
							· <span class="font-mono">HTTP {event.statusCode}</span>
						{/if}
					</span>
					<Tabs.List>
						{#if hasMessages}
							<Tabs.Trigger value="messages">
								<MessagesSquare class="size-4" /> Messages
								<span class="text-muted-foreground ml-1 text-xs">{messages.length}</span>
							</Tabs.Trigger>
						{/if}
						{#if hasTools}
							<Tabs.Trigger value="tools">
								<WrenchIcon class="size-4" /> Tools
								<span class="text-muted-foreground ml-1 text-xs">{tools.length}</span>
							</Tabs.Trigger>
						{/if}
						{#if hasHyperparameters}
							<Tabs.Trigger value="hyperparameters">
								<SlidersIcon class="size-4" /> Hyperparameters
							</Tabs.Trigger>
						{/if}
						<Tabs.Trigger value="overview">
							<GlobeIcon class="size-4" /> Overview
						</Tabs.Trigger>
						<Tabs.Trigger value="raw">
							<FileTextIcon class="size-4" /> Raw
						</Tabs.Trigger>
					</Tabs.List>
				</Dialog.Header>

				<ScrollArea class="min-h-0 flex-1 rounded-md">
					{#if hasMessages}
						<Tabs.Content value="messages" class="flex flex-col gap-3 p-2">
							{#each messages as message, i (i)}
								{@const text = contentToString(message.content)}
								<Card.Root>
									<Card.Header>
										<Card.Title class="flex flex-wrap items-center gap-2 text-sm">
											<span
												class={`rounded px-2 py-0.5 font-mono text-xs uppercase ${roleClass(message.role)}`}
											>
												{message.role}
											</span>
											{#if message.name}
												<span class="text-muted-foreground font-mono text-xs">{message.name}</span>
											{/if}
											{#if message.toolCallId}
												<span class="text-muted-foreground font-mono text-xs">
													↳ {message.toolCallId}
												</span>
											{/if}
										</Card.Title>
									</Card.Header>
									<Card.Content class="flex flex-col gap-2">
										{#if message.content !== undefined && message.content !== null && message.content !== ''}
											{#if text !== null}
												<p class="text-sm whitespace-pre-wrap">{text}</p>
											{:else}
												<CodeBlock
													text={JSON.stringify(message.content, null, 2)}
													class="overflow-auto whitespace-pre-wrap"
													language="json"
												/>
											{/if}
										{/if}
										{#if message.toolCalls && message.toolCalls.length > 0}
											{#if message.content !== undefined && message.content !== null && message.content !== ''}
												<Separator />
											{/if}
											<span class="text-muted-foreground text-xs">
												Tool calls ({message.toolCalls.length})
											</span>
											<div class="flex flex-col gap-2">
												{#each message.toolCalls as tc, j (j)}
													<div class="bg-muted/40 rounded-md border p-2">
														<div class="flex flex-wrap items-center gap-2 text-xs">
															<WrenchIcon class="size-3.5 text-violet-500" />
															<span class="font-mono font-semibold">{tc.name}</span>
															{#if tc.id}
																<span class="text-muted-foreground font-mono">{tc.id}</span>
															{/if}
														</div>
														{#if tc.arguments !== undefined && tc.arguments !== null && tc.arguments !== ''}
															<div class="mt-2">
																{#if typeof tc.arguments === 'string'}
																	<p class="text-xs whitespace-pre-wrap">{tc.arguments}</p>
																{:else}
																	<CodeBlock
																		text={JSON.stringify(tc.arguments, null, 2)}
																		class="overflow-auto whitespace-pre-wrap"
																		language="json"
																	/>
																{/if}
															</div>
														{/if}
													</div>
												{/each}
											</div>
										{/if}
									</Card.Content>
								</Card.Root>
							{/each}
						</Tabs.Content>
					{/if}

					{#if hasTools}
						<Tabs.Content value="tools" class="flex flex-col gap-3 p-2">
							{#each tools as tool, i (i)}
								<Card.Root>
									<Card.Header>
										<Card.Title class="flex items-center gap-2 text-sm">
											<WrenchIcon class="size-4 text-violet-500" />
											<span class="font-mono">{tool.name}</span>
										</Card.Title>
									</Card.Header>
									<Card.Content class="flex flex-col gap-2">
										{#if tool.description}
											<p class="text-sm whitespace-pre-wrap">{tool.description}</p>
										{/if}
										{#if tool.parameters !== undefined && tool.parameters !== null}
											<Accordion.Root type="single">
												<Accordion.Item value="params">
													<Accordion.Trigger>
														<span class="text-muted-foreground text-xs">Parameters schema</span>
													</Accordion.Trigger>
													<Accordion.Content>
														<CodeBlock
															text={JSON.stringify(tool.parameters, null, 2)}
															class="overflow-auto whitespace-pre-wrap"
															language="json"
														/>
													</Accordion.Content>
												</Accordion.Item>
											</Accordion.Root>
										{/if}
									</Card.Content>
								</Card.Root>
							{/each}
						</Tabs.Content>
					{/if}

					{#if hasHyperparameters}
						<Tabs.Content value="hyperparameters" class="p-2">
							<Card.Root>
								<Card.Header>
									<Card.Title>Request parameters</Card.Title>
								</Card.Header>
								<Card.Content>
									<CodeBlock
										text={JSON.stringify(hyperparameters, null, 2)}
										class="overflow-auto whitespace-pre-wrap"
										language="json"
									/>
								</Card.Content>
							</Card.Root>
						</Tabs.Content>
					{/if}

					<Tabs.Content value="overview" class="flex flex-col gap-3 p-2">
						<Card.Root>
							<Card.Header>
								<Card.Title>Identifiers</Card.Title>
							</Card.Header>
							<Card.Content>
								<dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
									{#if 'requestId' in event}
										<dt class="text-muted-foreground">requestId</dt>
										<dd class="font-mono">{event.requestId}</dd>
									{/if}
									{#if 'agentName' in event}
										<dt class="text-muted-foreground">agent</dt>
										<dd class="font-mono">{event.agentName}</dd>
									{/if}
									{#if isRequest}
										{#if 'configurationName' in event}
											<dt class="text-muted-foreground">configuration</dt>
											<dd class="font-mono">{event.configurationName}</dd>
										{/if}
										{#if 'modelName' in event}
											<dt class="text-muted-foreground">model</dt>
											<dd class="font-mono">{event.modelName}</dd>
										{/if}
										{#if 'upstreamUrl' in event}
											<dt class="text-muted-foreground">upstream</dt>
											<dd class="font-mono break-all">{event.method} {event.upstreamUrl}</dd>
										{/if}
										{#if 'streaming' in event}
											<dt class="text-muted-foreground">streaming</dt>
											<dd class="font-mono">{event.streaming}</dd>
										{/if}
										{#if requestBody}
											<dt class="text-muted-foreground">body format</dt>
											<dd class="font-mono">{requestBody.format}</dd>
										{/if}
									{/if}
									{#if isResponse}
										{#if 'statusCode' in event}
											<dt class="text-muted-foreground">status</dt>
											<dd class="font-mono">{event.statusCode}</dd>
										{/if}
										{#if 'usage' in event && event.usage}
											<dt class="text-muted-foreground">tokens in</dt>
											<dd class="font-mono">{event.usage.inputTokens ?? '—'}</dd>
											<dt class="text-muted-foreground">tokens out</dt>
											<dd class="font-mono">{event.usage.outputTokens ?? '—'}</dd>
										{/if}
									{/if}
									<dt class="text-muted-foreground">timestamp</dt>
									<dd class="font-mono">{new Date(entry?.time ?? 0).toISOString()}</dd>
								</dl>
							</Card.Content>
						</Card.Root>

						{#if 'headers' in event}
							<Card.Root>
								<Accordion.Root type="single">
									<Accordion.Item value="headers">
										<Card.Header>
											<Accordion.Trigger>
												<Card.Title>Headers</Card.Title>
											</Accordion.Trigger>
										</Card.Header>
										<Accordion.Content>
											<Card.Content>
												<CodeBlock
													text={JSON.stringify(event.headers, null, 2)}
													class="overflow-auto whitespace-pre-wrap"
													language="json"
												/>
											</Card.Content>
										</Accordion.Content>
									</Accordion.Item>
								</Accordion.Root>
							</Card.Root>
						{/if}
					</Tabs.Content>

					<Tabs.Content value="raw" class="p-2">
						<Card.Root>
							<Card.Header>
								<Card.Title>
									{#if isRequest}Request body{:else}Response body{/if}
								</Card.Title>
							</Card.Header>
							<Card.Content>
								<CodeBlock
									text={JSON.stringify(isRequest ? requestBody : responseBody, null, 2)}
									class="overflow-auto whitespace-pre-wrap"
									language="json"
								/>
							</Card.Content>
						</Card.Root>
						<Separator class="my-3" />
						<Card.Root>
							<Accordion.Root type="single">
								<Accordion.Item value="event">
									<Card.Header>
										<Accordion.Trigger>
											<Card.Title>Raw event payload</Card.Title>
										</Accordion.Trigger>
									</Card.Header>
									<Accordion.Content>
										<Card.Content>
											<CodeBlock
												text={JSON.stringify(event, null, 2)}
												class="overflow-auto whitespace-pre-wrap"
												language="json"
											/>
										</Card.Content>
									</Accordion.Content>
								</Accordion.Item>
							</Accordion.Root>
						</Card.Root>
					</Tabs.Content>
				</ScrollArea>
			</Tabs.Root>
		{/if}
	</Dialog.Content>
</Dialog.Root>
