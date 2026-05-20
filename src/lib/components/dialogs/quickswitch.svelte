<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import type { AppContext } from '$lib/context';
	import { Session } from '$lib/session.svelte';
	import IconChats from 'phosphor-icons-svelte/IconChatsRegular.svelte';
	import IconRobot from '$lib/icons/robot.svelte';

	let {
		ctx,
		open = $bindable(),
		debugMenu = $bindable()
	}: { ctx: AppContext; open: boolean; debugMenu: boolean } = $props();

	let agents = $derived(
		ctx.session &&
			Object.entries(ctx.session.agents).map(([title, agent]) => ({
				title,
				url: `${base}/agent/#${title}`,
				state: agent.status.type
			}))
	);

	let threads = $derived(
		ctx.session &&
			Object.values(ctx.session.threads).map((thread) => ({
				id: thread.id,
				title: thread.name,
				url: `${base}/thread/#${thread.id}`,
				badge: thread.unread
			}))
	);

	let sessions = $derived(Object.values(ctx.server.sessions));

	let value = $state('');
</script>

<Command.Dialog bind:open>
	<Command.Input placeholder="Type a command or search..." bind:value />
	<Command.List>
		<Command.Empty>No results found.</Command.Empty>
		<Command.Group heading="Quick Actions">
			<Command.Item keywords={['new']}
				>Create session
				<Command.Shortcut>SHIFT N</Command.Shortcut>
			</Command.Item>
			<Command.Item>Add server</Command.Item>
			<Command.Item
				>Refresh agent config
				<Command.Shortcut>SHIFT R</Command.Shortcut>
			</Command.Item>
			<Command.Item
				onSelect={() => {
					(debugMenu = true), (open = false);
				}}
				>Debug tools
				<Command.Shortcut>SHIFT D</Command.Shortcut></Command.Item
			>
		</Command.Group>
		<Command.Group heading="Pages">
			<Command.LinkItem href="{base}/tools/user-input">User input</Command.LinkItem>
			<Command.LinkItem href="{base}/registry">Agent registry</Command.LinkItem>
			<Command.LinkItem href="{base}/logs">Logs</Command.LinkItem>
			<Command.LinkItem href="{base}/statistics">Statistics</Command.LinkItem>
		</Command.Group>
		<Command.Group heading="Threads">
			{#each threads ?? [] as thread}
				<Command.Item onSelect={() => (goto(thread.url), (open = false))}>
					<IconChats />
					<span class="truncate">{thread.title}</span>
				</Command.Item>
			{/each}
		</Command.Group>
		<Command.Group heading="Agents">
			{#each agents ?? [] as agent}
				<Command.Item onSelect={() => (goto(agent.url), (open = false))}>
					<IconRobot />
					<span class="truncate">{agent.title}</span>
					<span class="ml-2 text-xs opacity-60">({agent.state})</span>
				</Command.Item>
			{/each}
		</Command.Group>
		<Command.Group heading="Sessions">
			{#if sessions.length > 0}
				<!--TODO: Ensure no undefined sessionIds also to prevent duplicated keys-->
				{#each sessions as basicSession (basicSession.id)}
					<Command.Item
						onSelect={() => {
							ctx.session = new Session({
								sessionId: basicSession.id,
								namespace: ctx.server.namespace,
								server: ctx.server
							});
							open = false;
						}}
					>
						<span class="truncate">{basicSession}</span>
					</Command.Item>
				{/each}
			{/if}
		</Command.Group>
	</Command.List>
</Command.Dialog>
