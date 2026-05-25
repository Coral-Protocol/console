<script lang="ts">
	/**
	 * Editable card for a single `SavedMessage`.
	 *
	 * Affords:
	 *   - role pick (free-form text input + common-role quick chips)
	 *   - name / tool_call_id (when relevant)
	 *   - content edit (textarea for strings, raw JSON editor for structured)
	 *   - duplicate / move up / move down / delete
	 *   - toggle inclusion ("comment out") — kept visually muted when off
	 *
	 * For response-meta messages (the assistant message captured from a
	 * "Make Request"), we surface usage and logprobs inline through the
	 * `<LogprobsView />` panel.
	 */
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { CodeBlock } from '@coral-os/component-library';

	import CopyIcon from '@lucide/svelte/icons/copy';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	import type { SavedMessage } from '../types';
	import LogprobsView from './LogprobsView.svelte';

	interface Props {
		message: SavedMessage;
		index: number;
		total: number;
		onChange: () => void;
		onDuplicate: (index: number) => void;
		onDelete: (index: number) => void;
		onMove: (index: number, delta: number) => void;
	}

	let { message = $bindable(), index, total, onChange, onDuplicate, onDelete, onMove }: Props =
		$props();

	const COMMON_ROLES = ['system', 'developer', 'user', 'assistant', 'tool'] as const;
	const ROLE_STYLES: Record<string, string> = {
		system: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
		developer: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
		user: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
		assistant: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
		tool: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
	};
	function roleClass(role: string) {
		return ROLE_STYLES[role] ?? 'bg-muted text-foreground';
	}

	/** Content is `unknown` — render appropriately. We expose a text-mode for
	 * string content and a read-only JSON view for structured content. Editing
	 * structured content is supported via the parent's Raw tab. */
	let isStringContent = $derived(typeof message.content === 'string');
	let textContent = $derived(isStringContent ? (message.content as string) : '');

	function updateText(v: string) {
		message.content = v;
		onChange();
	}

	function setRole(r: string) {
		message.role = r;
		onChange();
	}

	function toggleIncluded() {
		message.included = !message.included;
		onChange();
	}
</script>

<Card.Root class={message.included ? '' : 'border-dashed opacity-60'}>
	<Card.Header class="flex-row items-center gap-2 space-y-0 pb-2">
		<!-- Role chip + dropdown -->
		<span
			class={`shrink-0 rounded px-2 py-0.5 font-mono text-xs uppercase ${roleClass(message.role)}`}
		>
			{message.role || '?'}
		</span>
		<Input
			value={message.role}
			oninput={(e) => setRole((e.currentTarget as HTMLInputElement).value)}
			class="h-7 w-28 text-xs"
			placeholder="role"
		/>
		<div class="flex shrink-0 gap-0.5">
			{#each COMMON_ROLES as r (r)}
				<button
					type="button"
					class="hover:bg-accent rounded px-1.5 py-0.5 text-[10px] {message.role === r
						? 'bg-accent'
						: 'text-muted-foreground'}"
					onclick={() => setRole(r)}
				>
					{r}
				</button>
			{/each}
		</div>
		<span class="text-muted-foreground ml-auto text-xs">#{index + 1}</span>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						aria-label={message.included ? 'Exclude from request' : 'Include in request'}
						class="hover:bg-accent inline-flex size-7 items-center justify-center rounded-md"
						onclick={toggleIncluded}
					>
						{#if message.included}
							<EyeIcon class="size-3.5" />
						{:else}
							<EyeOffIcon class="size-3.5" />
						{/if}
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				{message.included ? 'Exclude from request' : 'Include in request'}
			</Tooltip.Content>
		</Tooltip.Root>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={index === 0}
			onclick={() => onMove(index, -1)}
		>
			<ArrowUpIcon class="size-3.5" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={index === total - 1}
			onclick={() => onMove(index, 1)}
		>
			<ArrowDownIcon class="size-3.5" />
		</Button>
		<Button variant="ghost" size="icon" class="size-7" onclick={() => onDuplicate(index)}>
			<CopyIcon class="size-3.5" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="text-destructive size-7"
			onclick={() => onDelete(index)}
		>
			<TrashIcon class="size-3.5" />
		</Button>
	</Card.Header>

	<Card.Content class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center gap-2">
			<label class="text-muted-foreground flex items-center gap-1 text-xs">
				name
				<Input
					value={message.name ?? ''}
					oninput={(e) => {
						const v = (e.currentTarget as HTMLInputElement).value;
						message.name = v === '' ? undefined : v;
						onChange();
					}}
					class="h-6 w-32 text-xs"
					placeholder="(optional)"
				/>
			</label>
			{#if message.role === 'tool'}
				<label class="text-muted-foreground flex items-center gap-1 text-xs">
					tool_call_id
					<Input
						value={message.toolCallId ?? ''}
						oninput={(e) => {
							const v = (e.currentTarget as HTMLInputElement).value;
							message.toolCallId = v === '' ? undefined : v;
							onChange();
						}}
						class="h-6 w-48 font-mono text-xs"
					/>
				</label>
			{/if}
		</div>

		{#if isStringContent}
			<Textarea
				value={textContent}
				oninput={(e) => updateText((e.currentTarget as HTMLTextAreaElement).value)}
				class="min-h-24 text-sm"
				placeholder="(empty content)"
			/>
		{:else if message.content !== undefined && message.content !== null}
			<div class="flex flex-col gap-1">
				<span class="text-muted-foreground text-xs">
					structured content (edit via Raw tab to preserve shape)
				</span>
				<CodeBlock
					text={JSON.stringify(message.content, null, 2)}
					class="overflow-auto whitespace-pre-wrap"
					language="json"
				/>
			</div>
		{:else}
			<span class="text-muted-foreground text-xs italic">no content</span>
		{/if}

		{#if message.toolCalls && message.toolCalls.length > 0}
			<Separator />
			<div class="flex items-center gap-2 text-xs">
				<WrenchIcon class="size-3.5 text-violet-500" />
				<span class="text-muted-foreground">Tool calls ({message.toolCalls.length})</span>
			</div>
			<CodeBlock
				text={JSON.stringify(message.toolCalls, null, 2)}
				class="overflow-auto whitespace-pre-wrap"
				language="json"
			/>
		{/if}

		{#if message.responseMeta}
			<Separator />
			<LogprobsView meta={message.responseMeta} />
		{/if}
	</Card.Content>
</Card.Root>
