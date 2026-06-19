<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';

	import CaretUpDown from 'phosphor-icons-svelte/IconCaretUpDownRegular.svelte';

	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';

	import { Session } from '$lib/session.svelte';
	import { tick } from 'svelte';
	import { appContext } from '$lib/context';
	import { cn } from '$lib/utils';

	let ctx = appContext.get();

	let { class: className }: { class?: string } = $props();

	let sessionSearcherOpen = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	let value = $state('');

	function closeAndFocusTrigger() {
		sessionSearcherOpen = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}
</script>

<Popover.Root bind:open={sessionSearcherOpen}>
	<section class={cn('my-2 flex w-full gap-2', className)}>
		<Popover.Trigger
			class="bg-sidebar border-offset-background dark:aria-invalid:border-destructive/40 aria-invalid:border-destructive relative  w-full flex-1 grow justify-between truncate border-1 "
			aria-invalid={ctx.session !== null && !ctx.session.connected}
		>
			{#snippet child({ props }: { props: any })}
				<Button
					variant="outline"
					{...props}
					role="combobox"
					aria-expanded={sessionSearcherOpen}
					bind:ref={triggerRef}
				>
					{#if ctx.session}
						<span
							class={cn(
								'size-2 rounded-full',
								ctx.session.connected ? 'bg-green-400' : 'animate-pulse bg-orange-400'
							)}
						></span>
					{/if}
					<span class="w-4/5 grow truncate overflow-hidden text-left">
						{ctx.session?.sessionId
							? (ctx.session?.annotations?.name ?? ctx.session.sessionId)
							: 'Select a session'}
					</span>
					<CaretUpDown />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content align="start" class="p-1">
			<Command.Root>
				<Command.Input placeholder="Search" />
				<Command.List>
					{#if Object.values(ctx.server.sessions).length === 0 && !ctx.session}
						<Command.Empty>No sessions found</Command.Empty>
					{:else}
						<Command.Group>
							{#each Object.values(ctx.server.sessions) as basicSession (basicSession.id)}
								<Command.Item
									class="text-wrap break-all"
									onSelect={() => {
										value = basicSession.id;
										closeAndFocusTrigger();
										ctx.session = new Session({
											sessionId: basicSession.id,
											namespace: ctx.server.namespace,
											server: ctx.server
										});
									}}
								>
									{basicSession?.annotations?.name ?? basicSession.id}
								</Command.Item>
							{/each}

							{#if ctx.session && !(ctx.session.sessionId in ctx.server.sessions)}
								<!-- Show current session even if it's not in ctx.server.sessions -->
								<Command.Item
									class="font-bold text-wrap break-all"
									onSelect={() => {
										if (ctx.session) {
											value = ctx.session.sessionId;
											closeAndFocusTrigger();
										}
									}}
								>
									{ctx.session.sessionId} (current)
								</Command.Item>
							{/if}
						</Command.Group>
					{/if}
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</section>
</Popover.Root>
