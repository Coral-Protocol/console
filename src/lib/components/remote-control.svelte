<script lang="ts">
	import type { components } from '$generated/api';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import type { Session } from '$lib/session.svelte';
	import ManageThreadParticipant from './remote-control/manage-thread-participant.svelte';
	import CloseThread from './remote-control/close-thread.svelte';
	import CreateThread from './remote-control/create-thread.svelte';
	import KillAgent from './remote-control/kill-agent.svelte';
	import SendMessage from './remote-control/send-message.svelte';

	const {
		agent,
		session
	}: {
		agent: components['schemas']['SessionAgentState'];
		session: Session;
	} = $props();
</script>

<Accordion.Root type="single" class="w-full sm:max-w-[70%]" value="sendMessage">
	<Accordion.Item value="sendMessage">
		<Accordion.Trigger  class="p-4">Send message in thread</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-4 p-4 text-balance">
			<SendMessage {agent} {session} />
		</Accordion.Content>
	</Accordion.Item>

	<Accordion.Item value="createThread">
		<Accordion.Trigger  class="p-4">Create thread</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-4 p-4 text-balance">
			<CreateThread {agent} {session} />
		</Accordion.Content>
	</Accordion.Item>

	<Accordion.Item value="closeThread">
		<Accordion.Trigger  class="p-4">Close thread</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-4 p-4 text-balance">
			<CloseThread {agent} {session} />
		</Accordion.Content>
	</Accordion.Item>

	<Accordion.Item value="addThreadParticipant">
		<Accordion.Trigger  class="p-4">Add thread participant</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-4 p-4 text-balance">
			<ManageThreadParticipant {agent} {session} remove={false} />
		</Accordion.Content>
	</Accordion.Item>

	<Accordion.Item value="removeThreadParticipant">
		<Accordion.Trigger  class="p-4">Remove thread participant</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-4 p-4 text-balance">
			<ManageThreadParticipant {agent} {session} remove={true} />
		</Accordion.Content>
	</Accordion.Item>

	<Accordion.Item value="killAgent">
		<Accordion.Trigger  class="p-4">Kill agent</Accordion.Trigger>
		<Accordion.Content class="flex flex-col gap-4 p-4 text-balance">
			<KillAgent {agent} {session} />
		</Accordion.Content>
	</Accordion.Item>
</Accordion.Root>
