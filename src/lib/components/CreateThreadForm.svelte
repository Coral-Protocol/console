<script lang="ts">
	import { Label } from '@coral-os/component-library/components/ui/label/index.js';
	import { Input } from '@coral-os/component-library/components/ui/input/index.js';
	import { Combobox } from '@coral-os/component-library';

	import type { components } from '$generated/api';
	import type { Session } from '$lib/session.svelte';
	import { appContext } from '$lib/context';
	import { toast } from 'svelte-sonner';
	import { Button } from '@coral-os/component-library/components/ui/button/index.js';

	let {
		agent,
		session,
		onCreate
	}: {
		agent: components['schemas']['SessionAgentState'];
		session: Session;
		onCreate?: () => void;
	} = $props();

	let ctx = appContext.get();

	let otherAgents = $derived(
		Object.values(session.agents)
			.map((a) => a.name)
			.filter((name) => name !== agent.name)
	);

	let participants = $state<string[]>([]);
	let threadName = $state('');

	const createThread = async () => {
		try {
			await ctx.server.createThread(session.sessionId, agent.name, {
				threadName: threadName,
				participantNames: participants
			});

			participants = [];
			threadName = '';

			toast.success('Thread created');
		} catch (e) {
			toast.error(`Failed to create thread: ${e}`);
		}
	};
</script>

<form
	class="flex flex-col gap-2"
	onsubmit={async (e) => {
		e.preventDefault();
		await createThread();
		onCreate?.();
	}}
>
	<!-- <h4 class="leading-none font-medium">Dimensions</h4> -->
	<p class="text-muted-foreground text-sm">Create a new thread as '{agent.name}'</p>
	<Input bind:value={threadName} placeholder="Thread name" class="h-8" required minlength={1} />
	<Label class="flex flex-col items-stretch gap-1">
		Participants
		<Combobox
			type="multiple"
			class="h-8 w-full"
			bind:selected={participants}
			searchPlaceholder="Search agents..."
			selectPlaceholder="Select other agents..."
			options={[{ items: otherAgents }]}
		></Combobox>
	</Label>
	<Button type="submit" variant="secondary" class="self-end">Create</Button>
</form>
