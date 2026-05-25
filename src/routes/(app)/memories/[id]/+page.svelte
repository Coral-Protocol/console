<script lang="ts">
	/**
	 * Saved Memory editor.
	 *
	 * Five-tab layout (Messages / Tools / Hyperparameters / Raw / Response),
	 * with a floating Save bar that surfaces only when the editor is dirty,
	 * and a sticky "Make Request" bar at the bottom.
	 *
	 * The editor mutates a local `working` copy of the memory; an explicit
	 * save flushes it to IDB. This deliberately decouples in-progress edits
	 * from the persistent store so users can experiment without churn.
	 */
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { fade } from 'svelte/transition';

	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Select from '@coral-os/component-library/ui/select/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';
	import { Checkbox } from '@coral-os/component-library/ui/checkbox/index.js';

	import CodeMirror from 'svelte-codemirror-editor';
	import { json as cmJson } from '@codemirror/lang-json';
	import { atomone } from '@uiw/codemirror-theme-atomone';
	import { quietlight } from '@uiw/codemirror-theme-quietlight';
	import { mode } from 'mode-watcher';

	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import SlidersIcon from '@lucide/svelte/icons/sliders-horizontal';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PlayIcon from '@lucide/svelte/icons/play';
	import SaveIcon from '@lucide/svelte/icons/save';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RotateIcon from '@lucide/svelte/icons/rotate-ccw';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	import { savedMemories } from '$lib/saved-memories/store.svelte';
	import {
		memoryToRequestBody,
		mergeRawIntoMemory,
		newId
	} from '$lib/saved-memories/convert';
	import type {
		SavedMemory,
		SavedMessage,
		SavedTool,
		DetailedLlmProxyRequestBody
	} from '$lib/saved-memories/types';
	import {
		fetchProviders,
		fetchAgentBindings,
		replayMemory,
		responseToMessage,
		type LlmProxyProviderInfo,
		type AgentLlmProxyBinding
	} from '$lib/saved-memories/replay';
	import { appContext } from '$lib/context';

	import MessageCard from '$lib/saved-memories/components/MessageCard.svelte';

	const ctx = appContext.get();

	let memoryId = $derived(page.params.id);
	let stored = $derived(memoryId ? savedMemories.get(memoryId) : undefined);

	// Working copy — `null` until the store has hydrated for the requested id.
	let working = $state<SavedMemory | null>(null);
	let dirty = $state(false);
	let lastLoadedId = $state<string | null>(null);

	// Sync working copy whenever the underlying stored record changes
	// identity (i.e. user navigated to a different memory). We deliberately
	// don't overwrite on every save — `dirty` is reset by `save()`.
	$effect(() => {
		if (stored && stored.id !== lastLoadedId) {
			working = JSON.parse(JSON.stringify(stored));
			dirty = false;
			lastLoadedId = stored.id;
		}
	});

	function markDirty() {
		dirty = true;
	}

	async function save() {
		if (!working) return;
		try {
			await savedMemories.save($state.snapshot(working) as SavedMemory);
			dirty = false;
			toast.success('Saved');
		} catch (e) {
			toast.error(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	function discard() {
		if (!stored) return;
		working = JSON.parse(JSON.stringify(stored));
		dirty = false;
	}

	let theme = $derived(mode.current === 'light' ? quietlight : atomone);

	// ── Messages ───────────────────────────────────────────────────────
	function addMessage(role: SavedMessage['role'] = 'user') {
		if (!working) return;
		working.messages.push({
			id: newId('msg'),
			included: true,
			role,
			content: ''
		});
		markDirty();
	}
	function duplicateMessage(i: number) {
		if (!working) return;
		const src = working.messages[i];
		if (!src) return;
		const clone: SavedMessage = JSON.parse(JSON.stringify(src));
		clone.id = newId('msg');
		working.messages.splice(i + 1, 0, clone);
		markDirty();
	}
	function deleteMessage(i: number) {
		if (!working) return;
		working.messages.splice(i, 1);
		markDirty();
	}
	function moveMessage(i: number, delta: number) {
		if (!working) return;
		const j = i + delta;
		if (j < 0 || j >= working.messages.length) return;
		const a = working.messages[i];
		const b = working.messages[j];
		if (!a || !b) return;
		working.messages[i] = b;
		working.messages[j] = a;
		markDirty();
	}

	// ── Tools ──────────────────────────────────────────────────────────
	let toolDrafts = $state<Record<string, string>>({});
	function toolJsonText(t: SavedTool): string {
		return toolDrafts[t.id] ?? JSON.stringify(t.raw, null, 2);
	}
	function updateToolJson(t: SavedTool, text: string) {
		toolDrafts[t.id] = text;
		try {
			const parsed = JSON.parse(text);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				t.raw = parsed as Record<string, unknown>;
				markDirty();
			}
		} catch {
			// keep the draft until it parses; UI shows a soft warning
		}
	}
	function isToolJsonValid(t: SavedTool): boolean {
		const draft = toolDrafts[t.id];
		if (draft === undefined) return true;
		try {
			JSON.parse(draft);
			return true;
		} catch {
			return false;
		}
	}
	function addTool() {
		if (!working) return;
		const empty = {
			type: 'function',
			function: { name: 'new_tool', description: '', parameters: { type: 'object', properties: {} } }
		};
		working.tools.push({ id: newId('tool'), included: true, raw: empty });
		markDirty();
	}
	function deleteTool(i: number) {
		if (!working) return;
		const t = working.tools[i];
		if (t) delete toolDrafts[t.id];
		working.tools.splice(i, 1);
		markDirty();
	}

	// ── Hyperparameters ────────────────────────────────────────────────
	function setHyperNumber(key: string, raw: string) {
		if (!working) return;
		const v = raw.trim();
		const hp = working.hyperparameters as unknown as Record<string, unknown>;
		if (v === '') delete hp[key];
		else {
			const n = Number(v);
			if (!Number.isNaN(n)) hp[key] = n;
		}
		markDirty();
	}
	function setHyperString(key: string, raw: string) {
		if (!working) return;
		const hp = working.hyperparameters as unknown as Record<string, unknown>;
		if (raw === '') delete hp[key];
		else hp[key] = raw;
		markDirty();
	}
	function setHyperBool(key: string, v: boolean) {
		if (!working) return;
		(working.hyperparameters as unknown as Record<string, unknown>)[key] = v;
		markDirty();
	}

	/** tool_choice convenience — auto | none | required | { type:'function', function:{name} } */
	let toolChoiceMode = $derived.by<'auto' | 'none' | 'required' | 'specific' | 'unset'>(() => {
		const v = working?.hyperparameters.tool_choice;
		if (v === undefined || v === null) return 'unset';
		if (v === 'auto') return 'auto';
		if (v === 'none') return 'none';
		if (v === 'required') return 'required';
		if (typeof v === 'object') return 'specific';
		return 'unset';
	});
	let toolChoiceSpecific = $derived.by(() => {
		const v = working?.hyperparameters.tool_choice;
		if (v && typeof v === 'object') {
			const fn = (v as Record<string, unknown>).function;
			if (fn && typeof fn === 'object') {
				const n = (fn as Record<string, unknown>).name;
				if (typeof n === 'string') return n;
			}
		}
		return '';
	});
	function setToolChoiceMode(m: 'auto' | 'none' | 'required' | 'specific' | 'unset') {
		if (!working) return;
		if (m === 'unset') delete working.hyperparameters.tool_choice;
		else if (m === 'specific')
			working.hyperparameters.tool_choice = {
				type: 'function',
				function: {
					name:
						toolChoiceSpecific ||
						((working.tools[0]?.raw?.function as Record<string, unknown> | undefined)?.[
							'name'
						] as string | undefined) ||
						''
				}
			};
		else working.hyperparameters.tool_choice = m;
		markDirty();
	}
	function setToolChoiceSpecific(name: string) {
		if (!working) return;
		working.hyperparameters.tool_choice = { type: 'function', function: { name } };
		markDirty();
	}

	// ── Raw tab ────────────────────────────────────────────────────────
	let rawDraft = $state('');
	let rawDirty = $state(false);
	let rawError = $state<string | null>(null);

	function syncRawDraftFromWorking() {
		if (!working) return;
		rawDraft = JSON.stringify(memoryToRequestBody(working), null, 2);
		rawDirty = false;
		rawError = null;
	}
	$effect(() => {
		// Reset the raw view when we switch memories.
		if (lastLoadedId) syncRawDraftFromWorking();
	});

	function applyRaw() {
		if (!working) return;
		try {
			const parsed = JSON.parse(rawDraft) as DetailedLlmProxyRequestBody;
			mergeRawIntoMemory(working, parsed);
			rawDirty = false;
			rawError = null;
			markDirty();
			toast.success('Raw applied to UI');
		} catch (e) {
			rawError = e instanceof Error ? e.message : String(e);
		}
	}

	// ── Make Request ───────────────────────────────────────────────────
	let providers = $state<LlmProxyProviderInfo[]>([]);
	let bindings = $state<AgentLlmProxyBinding[]>([]);
	let running = $state(false);

	$effect(() => {
		if (!ctx.server) return;
		void fetchProviders(ctx.server).then((p) => (providers = p)).catch(() => (providers = []));
	});

	$effect(() => {
		const o = working?.origin;
		if (!o || !ctx.server) {
			bindings = [];
			return;
		}
		void fetchAgentBindings(ctx.server, o.namespace, o.sessionId, o.agentName)
			.then((b) => (bindings = b))
			.catch(() => (bindings = []));
	});

	async function makeRequest() {
		if (!working || !ctx.server) return;
		if (!working.origin) {
			toast.error('This memory has no origin session — can\u2019t replay.');
			return;
		}
		running = true;
		try {
			const body = memoryToRequestBody(working);
			const result = await replayMemory({
				server: ctx.server,
				memory: working,
				body,
				editOf: working.origin.originalEventId
			});
			const asMsg = responseToMessage(result.response);
			working.messages.push(asMsg);
			working.lastResponseAt = Date.now();
			markDirty();
			await save();
			toast.success('Response received');
		} catch (e) {
			toast.error(`Replay failed: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			running = false;
		}
	}

	// Available models from the currently-selected proxy config
	let currentBinding = $derived(
		bindings.find((b) => b.proxyRequestName === working?.origin?.providerRequestName)
	);
	let availableModels = $derived.by<string[]>(() => {
		const cfg = currentBinding?.configurationName;
		if (!cfg) return [];
		const prov = providers.find((p) => p.name === cfg);
		return prov ? [...prov.models] : [];
	});
</script>

{#if !working}
	<div class="text-muted-foreground flex h-full items-center justify-center text-sm">
		{savedMemories.loaded ? 'Memory not found.' : 'Loading…'}
	</div>
{:else}
	<div class="flex h-full min-h-0 flex-col">
		<!-- ─── Top bar ──────────────────────────────────────────────── -->
		<header class="flex flex-wrap items-center gap-2 border-b px-4 py-2">
			<Button variant="ghost" size="icon" class="size-8" onclick={() => goto(`${base}/memories`)}>
				<ArrowLeftIcon class="size-4" />
			</Button>
			<Input
				bind:value={working.name}
				oninput={markDirty}
				class="h-8 max-w-md flex-1 text-sm font-medium"
			/>
			<span class="text-muted-foreground font-mono text-xs">{working.format}</span>
			{#if working.origin}
				<span class="text-muted-foreground text-xs">
					from <span class="font-mono">{working.origin.agentName}</span> ·
					<span class="font-mono">{working.origin.providerRequestName}</span>
				</span>
			{/if}
			<div class="ml-auto flex items-center gap-2">
				{#if dirty}
					<span transition:fade={{ duration: 80 }} class="text-amber-600 text-xs">unsaved</span>
				{/if}
				<Button variant="ghost" size="sm" disabled={!dirty} onclick={discard}>
					<RotateIcon class="size-3.5" /> Discard
				</Button>
				<Button size="sm" disabled={!dirty} onclick={save}>
					<SaveIcon class="size-3.5" /> Save
				</Button>
			</div>
		</header>

		<!-- ─── Tabs ──────────────────────────────────────────────────── -->
		<Tabs.Root value="messages" class="flex min-h-0 flex-1 flex-col">
			<Tabs.List class="mx-3 mt-2 w-fit">
				<Tabs.Trigger value="messages">
					<MessagesSquare class="size-4" /> Messages
					<span class="text-muted-foreground ml-1 text-xs">{working.messages.length}</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="tools">
					<WrenchIcon class="size-4" /> Tools
					<span class="text-muted-foreground ml-1 text-xs">{working.tools.length}</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="hyperparameters">
					<SlidersIcon class="size-4" /> Hyperparameters
				</Tabs.Trigger>
				<Tabs.Trigger value="raw">
					<FileTextIcon class="size-4" /> Raw
				</Tabs.Trigger>
			</Tabs.List>

			<ScrollArea class="min-h-0 flex-1">
				<!-- ─── Messages tab ─────────────────────────────────── -->
				<Tabs.Content value="messages" class="flex flex-col gap-3 p-4">
					{#each working.messages as message, i (message.id)}
						{#if working.messages[i]}
							<MessageCard
								bind:message={working.messages[i]!}
								index={i}
								total={working.messages.length}
								onChange={markDirty}
								onDuplicate={duplicateMessage}
								onDelete={deleteMessage}
								onMove={moveMessage}
							/>
						{/if}
					{/each}
					<div class="flex flex-wrap gap-2 pt-2">
						<Button size="sm" variant="outline" onclick={() => addMessage('system')}>
							<PlusIcon class="size-3.5" /> system
						</Button>
						<Button size="sm" variant="outline" onclick={() => addMessage('user')}>
							<PlusIcon class="size-3.5" /> user
						</Button>
						<Button size="sm" variant="outline" onclick={() => addMessage('assistant')}>
							<PlusIcon class="size-3.5" /> assistant
						</Button>
						<Button size="sm" variant="outline" onclick={() => addMessage('tool')}>
							<PlusIcon class="size-3.5" /> tool
						</Button>
					</div>
				</Tabs.Content>

				<!-- ─── Tools tab ────────────────────────────────────── -->
				<Tabs.Content value="tools" class="flex flex-col gap-3 p-4">
					{#each working.tools as tool, i (tool.id)}
						{@const name = (tool.raw?.function as Record<string, unknown> | undefined)?.['name'] ?? tool.raw['name'] ?? '(unnamed)'}
						<Card.Root class={tool.included ? '' : 'border-dashed opacity-60'}>
							<Card.Header class="flex-row items-center gap-2 space-y-0 pb-2">
								<WrenchIcon class="size-4 text-violet-500" />
								<span class="font-mono text-sm">{name}</span>
								<span class="text-muted-foreground ml-auto text-xs">#{i + 1}</span>
								<Button
									variant="ghost"
									size="icon"
									class="size-7"
									onclick={() => {
										tool.included = !tool.included;
										markDirty();
									}}
								>
									{#if tool.included}<EyeIcon class="size-3.5" />{:else}<EyeOffIcon
											class="size-3.5"
										/>{/if}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive size-7"
									onclick={() => deleteTool(i)}
								>
									<TrashIcon class="size-3.5" />
								</Button>
							</Card.Header>
							<Card.Content>
								{#if !isToolJsonValid(tool)}
									<div class="text-destructive mb-1 text-xs">Invalid JSON — fix to apply.</div>
								{/if}
								<CodeMirror
									value={toolJsonText(tool)}
									onchange={(v) => updateToolJson(tool, v)}
									lang={cmJson()}
									tabSize={2}
									{theme}
									lineWrapping
									class="rounded border [&_.cm-content]:p-2!"
								/>
							</Card.Content>
						</Card.Root>
					{/each}
					<Button size="sm" variant="outline" onclick={addTool} class="self-start">
						<PlusIcon class="size-3.5" /> Add tool
					</Button>

					<Separator class="my-2" />

					<!-- tool_choice control -->
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm">Tool choice</Card.Title>
						</Card.Header>
						<Card.Content class="flex flex-col gap-2">
							<div class="flex flex-wrap gap-1">
								{#each ['unset', 'auto', 'none', 'required', 'specific'] as m (m)}
									<button
										type="button"
										class="hover:bg-accent rounded border px-2 py-1 text-xs {toolChoiceMode === m
											? 'bg-accent'
											: 'text-muted-foreground'}"
										onclick={() => setToolChoiceMode(m as 'auto')}
									>
										{m}
									</button>
								{/each}
							</div>
							{#if toolChoiceMode === 'specific'}
								<label class="flex items-center gap-2 text-xs">
									Force tool
									<Select.Root
										type="single"
										value={toolChoiceSpecific}
										onValueChange={(v) => v && setToolChoiceSpecific(v)}
									>
										<Select.Trigger class="h-7 w-64 text-xs">
											{toolChoiceSpecific || 'Pick a tool…'}
										</Select.Trigger>
										<Select.Content>
											{#each working.tools as t (t.id)}
												{@const nm = ((t.raw.function as Record<string, unknown> | undefined)?.['name'] ?? t.raw['name']) as string | undefined}
												{#if nm}
													<Select.Item value={nm}>{nm}</Select.Item>
												{/if}
											{/each}
										</Select.Content>
									</Select.Root>
								</label>
							{/if}
							<label class="flex items-center gap-2 text-xs">
								<Checkbox
									checked={!!working.hyperparameters.parallel_tool_calls}
									onCheckedChange={(v) => setHyperBool('parallel_tool_calls', !!v)}
								/>
								Allow parallel tool calls
							</label>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<!-- ─── Hyperparameters tab ──────────────────────────── -->
				<Tabs.Content value="hyperparameters" class="flex flex-col gap-3 p-4">
					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm">Sampling</Card.Title>
						</Card.Header>
						<Card.Content class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each [
								{ key: 'temperature', label: 'temperature', step: '0.01' },
								{ key: 'top_p', label: 'top_p', step: '0.01' },
								{ key: 'max_tokens', label: 'max_tokens', step: '1' },
								{ key: 'frequency_penalty', label: 'frequency_penalty', step: '0.01' },
								{ key: 'presence_penalty', label: 'presence_penalty', step: '0.01' },
								{ key: 'seed', label: 'seed', step: '1' }
							] as field (field.key)}
								<label class="flex flex-col gap-1 text-xs">
									<span class="text-muted-foreground font-mono">{field.label}</span>
									<Input
										type="number"
										step={field.step}
 									value={(working.hyperparameters as unknown as Record<string, unknown>)[field.key] ?? ''}
										oninput={(e) =>
											setHyperNumber(field.key, (e.currentTarget as HTMLInputElement).value)}
										class="h-7 text-xs"
									/>
								</label>
							{/each}
							<label class="col-span-2 flex flex-col gap-1 text-xs md:col-span-3">
								<span class="text-muted-foreground font-mono">stop (JSON)</span>
								<Input
									value={working.hyperparameters.stop !== undefined
										? JSON.stringify(working.hyperparameters.stop)
										: ''}
									oninput={(e) => {
										const v = (e.currentTarget as HTMLInputElement).value.trim();
										if (v === '') {
											delete working!.hyperparameters.stop;
										} else {
											try {
												working!.hyperparameters.stop = JSON.parse(v);
											} catch {
												working!.hyperparameters.stop = v;
											}
										}
										markDirty();
									}}
									class="h-7 font-mono text-xs"
									placeholder='"\n" or ["a","b"]'
								/>
							</label>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm">Logprobs</Card.Title>
						</Card.Header>
						<Card.Content class="flex flex-wrap items-center gap-4">
							<label class="flex items-center gap-2 text-xs">
								<Checkbox
									checked={!!working.hyperparameters.logprobs}
									onCheckedChange={(v) => setHyperBool('logprobs', !!v)}
								/>
								Request logprobs
							</label>
							<label class="flex items-center gap-2 text-xs">
								<span class="text-muted-foreground font-mono">top_logprobs</span>
								<Input
									type="number"
									min="0"
									max="20"
									value={working.hyperparameters.top_logprobs ?? ''}
									oninput={(e) =>
										setHyperNumber('top_logprobs', (e.currentTarget as HTMLInputElement).value)}
									class="h-7 w-20 text-xs"
								/>
							</label>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header class="pb-2">
							<Card.Title class="text-sm">Notes</Card.Title>
						</Card.Header>
						<Card.Content>
							<Textarea
								value={working.notes ?? ''}
								oninput={(e) => {
									const v = (e.currentTarget as HTMLTextAreaElement).value;
									working!.notes = v === '' ? undefined : v;
									markDirty();
								}}
								class="min-h-20 text-sm"
								placeholder="Notes about this memory…"
							/>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<!-- ─── Raw tab ──────────────────────────────────────── -->
				<Tabs.Content value="raw" class="flex flex-col gap-2 p-4">
					<div class="flex flex-wrap items-center gap-2 text-xs">
						<span class="text-muted-foreground">
							Edit the upstream payload directly. UI fields update on Apply; structured-only
							information (disabled messages, message ids) is preserved.
						</span>
						<div class="ml-auto flex gap-2">
							<Button
								size="sm"
								variant="ghost"
								onclick={() => {
									syncRawDraftFromWorking();
								}}
							>
								<RotateIcon class="size-3.5" /> From UI
							</Button>
							<Button size="sm" disabled={!rawDirty} onclick={applyRaw}>
								<SaveIcon class="size-3.5" /> Apply to UI
							</Button>
						</div>
					</div>
					{#if rawError}
						<div class="text-destructive text-xs">{rawError}</div>
					{/if}
					<CodeMirror
						bind:value={rawDraft}
						onchange={() => {
							rawDirty = true;
						}}
						lang={cmJson()}
						tabSize={2}
						{theme}
						lineWrapping
						class="min-h-[50vh] rounded border [&_.cm-content]:p-2!"
					/>
				</Tabs.Content>
			</ScrollArea>
		</Tabs.Root>

		<!-- ─── Make Request bar ─────────────────────────────────────── -->
		<footer class="bg-background flex flex-wrap items-center gap-2 border-t px-4 py-2">
			<label class="flex items-center gap-1 text-xs">
				<span class="text-muted-foreground font-mono">model</span>
				{#if availableModels.length > 0}
					<Select.Root
						type="single"
						value={working.hyperparameters.model ?? ''}
						onValueChange={(v) => setHyperString('model', v ?? '')}
					>
						<Select.Trigger class="h-7 w-48 text-xs">
							{working.hyperparameters.model || 'Pick a model…'}
						</Select.Trigger>
						<Select.Content>
							{#each availableModels as m (m)}
								<Select.Item value={m}>{m}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{:else}
					<Input
						value={working.hyperparameters.model ?? ''}
						oninput={(e) =>
							setHyperString('model', (e.currentTarget as HTMLInputElement).value)}
						class="h-7 w-48 text-xs"
						placeholder="model id"
					/>
				{/if}
			</label>

			{#if bindings.length > 0}
				<label class="flex items-center gap-1 text-xs">
					<span class="text-muted-foreground font-mono">proxy</span>
					<Select.Root
						type="single"
						value={working.origin?.providerRequestName ?? ''}
						onValueChange={(v) => {
							if (working?.origin && v) {
								working.origin.providerRequestName = v;
								markDirty();
							}
						}}
					>
						<Select.Trigger class="h-7 w-48 text-xs">
							{working.origin?.providerRequestName || 'Pick a proxy…'}
						</Select.Trigger>
						<Select.Content>
							{#each bindings as b (b.proxyRequestName)}
								<Select.Item value={b.proxyRequestName}>
									{b.proxyRequestName} · {b.configurationName}/{b.modelName}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</label>
			{/if}

			<div class="ml-auto flex items-center gap-2">
				{#if !working.origin}
					<span class="text-muted-foreground text-xs">
						No origin session — save from a session telemetry to enable replay.
					</span>
				{/if}
				<Button
					size="sm"
					disabled={running || !working.origin}
					onclick={makeRequest}
					class="gap-1.5"
				>
					<PlayIcon class="size-3.5" />
					{running ? 'Running…' : 'Make request'}
				</Button>
			</div>
		</footer>
	</div>
{/if}
