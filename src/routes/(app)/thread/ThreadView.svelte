<script lang="ts">
	import { appContext } from '$lib/context';
	import type { Message as AgentMessage } from '$lib/threads';
	import Message from './Message.svelte';
	import { cn } from '$lib/utils';
	import { stringToColor } from '$lib/color';
	import type { Session } from '$lib/session.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import VList from '$lib/components/VList.svelte';

	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';

	import IconPaperPlaneRight from 'phosphor-icons-svelte/IconPaperPlaneRightRegular.svelte';
	import { Combobox } from '@coral-os/component-library';
	import { watch } from 'runed';
	import type { VirtualizerHandle } from 'virtua/svelte';

	let ctx = appContext.get();

	let {
		thread = $bindable(),
		messages,
		memberListOpen = $bindable(true)
	}: {
		thread: Session['threads'][string];
		messages: AgentMessage[];
		memberListOpen?: boolean;
	} = $props();

	let messagesSet = $derived(
		messages.map((msg) => ({ message: msg, mentions: new Set(msg.mentionNames) }))
	);

	let message = $state('');

	const agentFilters: SvelteSet<string> = new SvelteSet();

	let filteredMessages = $derived(
		agentFilters.size > 0
			? messagesSet
					.filter(
						(m) =>
							agentFilters.has(m.message.senderName) || !m.mentions.isDisjointFrom(agentFilters)
					)
					.map((m) => m.message)
			: messages
	);

	let others = $derived(
		(thread &&
			ctx.session?.possessed &&
			Array.from(thread.participants.keys().filter((p) => p !== ctx.session?.possessed))) ||
			[]
	);
	$inspect(others);
	$inspect(ctx.session?.possessed);

	let mentions: string[] = $state([]);
	watch(
		() => others,
		() => {
			if (mentions.length === 0) mentions = others;
			else mentions = mentions.filter((m) => others.indexOf(m) !== -1);
		}
	);
	let canTalk = $derived(
		!!ctx.session?.possessed && thread.participants.has(ctx.session.possessed)
	);

	let vlist: VirtualizerHandle | undefined = $state(undefined);
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane class="flex h-full">
		<main class="relative flex flex-grow flex-col gap-0 overflow-scroll">
			<VList
				bind:this={vlist}
				data={filteredMessages}
				class="flex-grow p-4"
				viewportClass="flex flex-grow flex-col gap-0"
			>
				{#snippet children(message, i)}
					<div
						class={cn(
							'border-t border-transparent py-1',
							i == (messages?.length ?? 0) - thread.unread && 'border-red-400'
						)}
					>
						<Message
							session={ctx.session}
							{message}
							agentFilters={agentFilters.size > 0 ? agentFilters : undefined}
						/>
					</div>
				{/snippet}
			</VList>
			<footer class="p-2">
				<form
					class="contents"
					onsubmit={async (e) => {
						e.preventDefault();
						const agent = ctx.session?.possessed;
						if (!ctx.session || !agent || !thread.participants.has(agent)) return;
						const msg = message.trim();
						if (msg.length === 0) return;
						await ctx.server.sendMessage(ctx.session.sessionId, agent, {
							threadId: thread.id,
							content: msg,
							mentions
						});
						thread.unread = 0;
						vlist?.scrollToIndex(messages.length);
						message = '';
					}}
				>
					<Tooltip.Root>
						<Tooltip.Trigger disabled={canTalk} class="size-full">
							{#snippet child({ props })}
								<InputGroup.Root {...props}>
									<InputGroup.Input
										bind:value={message}
										disabled={!canTalk}
										placeholder={ctx.session?.possessed
											? `send a message as '${ctx.session?.possessed}'`
											: 'send a message'}
									/>
									<InputGroup.Addon align="inline-end">
										<Combobox
											type="multiple"
											disabled={!canTalk}
											bind:selected={mentions}
											options={[{ items: others }]}
											emptyLabel="No agents found."
											searchPlaceholder="Search agents..."
										>
											{#snippet trigger({ props })}
												<InputGroup.Button
													{...props}
													variant="ghost"
													class="!pe-1.5 text-xs"
													role="combobox"
												>
													Mentions {mentions.length === 0
														? 'nobody'
														: mentions.length > 1 && mentions.length === others.length
															? 'everyone'
															: mentions.join(', ')}
												</InputGroup.Button>
											{/snippet}
										</Combobox>
									</InputGroup.Addon>
									<InputGroup.Addon align="inline-end">
										<InputGroup.Button
											type="submit"
											variant="default"
											size="icon-xs"
											disabled={!ctx.session?.possessed ||
												!thread.participants.has(ctx.session.possessed)}
										>
											<IconPaperPlaneRight />
											<span class="sr-only">Send</span>
										</InputGroup.Button>
									</InputGroup.Addon>
								</InputGroup.Root>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							You must be possessing an agent that is a participant of this thread.
						</Tooltip.Content>
					</Tooltip.Root>
				</form>
			</footer>
		</main>
	</Resizable.Pane>
	{#if memberListOpen}
		<Resizable.Handle withHandle />
		<Resizable.Pane maxSize={60} minSize={5} defaultSize={20} class="flex flex-col gap-2 p-2">
			{#each thread.participants as member}
				{@const memberColor = stringToColor(member)}
				<Toggle
					class="justify-start"
					onPressedChange={(pressed) => {
						pressed ? agentFilters.add(member) : agentFilters.delete(member);
					}}
				>
					<span
						class="size-3 shrink-0 rounded-full"
						style={`background-color: ${memberColor}; border-color: ${memberColor}55;`}
					></span>
					<span class="min-w-0 truncate">{member}</span>
				</Toggle>
			{/each}
		</Resizable.Pane>
	{/if}
</Resizable.PaneGroup>
