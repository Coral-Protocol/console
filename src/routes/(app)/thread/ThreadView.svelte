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

	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';
	import { Input } from '@coral-os/component-library/components/ui/input/index.js';

	let ctx = appContext.get();

	let {
		thread,
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
</script>

<Resizable.PaneGroup direction="horizontal">
	<Resizable.Pane class="flex h-full">
		<main class="relative flex flex-grow flex-col gap-0 overflow-scroll">
			<VList
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
						await ctx.server.sendMessage(ctx.session.sessionId, agent, {
							threadId: thread.id,
							content: message,
							mentions: Array.from(thread.participants.keys().filter((p) => p !== agent))
						});
						thread.unread = 0;
						message = '';
					}}
				>
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger
								disabled={!!ctx.session?.possessed &&
									thread.participants.has(ctx.session.possessed)}
								class="size-full"
							>
								<Input
									bind:value={message}
									disabled={!ctx.session?.possessed ||
										!thread.participants.has(ctx.session.possessed)}
									placeholder={ctx.session?.possessed
										? `send a message as '${ctx.session?.possessed}'`
										: 'send a message'}
								/>
							</Tooltip.Trigger>
							<Tooltip.Content>
								You must be possessing an agent that is a participant of this thread.
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
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
