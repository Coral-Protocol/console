<script lang="ts">
	import User from 'phosphor-svelte/lib/UserIcon';
	import Robot from 'phosphor-svelte/lib/RobotIcon';
	import Wrench from 'phosphor-svelte/lib/WrenchIcon';
	import { CodeBlock } from '@coral-os/component-library';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';

	let {
		message,
		filter
	}: {
		message: any;
		filter: any;
	} = $props();

	const roleMap = {
		user: {
			borderClass: 'border-telemetry-user/20',
			textClass: 'text-telemetry-user',
			icon: User,
			label: 'User input'
		},
		assistant: {
			borderClass: 'border-telemetry-assistant/20',
			textClass: 'text-telemetry-assistant',
			icon: Robot,
			label: 'Assistant'
		},
		tool: {
			borderClass: 'border-telemetry-tool/20',
			textClass: 'text-telemetry-tool',
			icon: Wrench,
			label: 'Tool response'
		}
	};

	const defaultRole = {
		borderClass: 'border-transparent',
		textClass: 'text-muted-foreground',
		icon: null,
		label: 'Unrecognised role'
	};

	type Role = keyof typeof roleMap;

	let roleKey = message.role;

	if (!(roleKey in roleMap)) {
		roleKey = 'user';
	}

	let roleData = $state(roleMap[message.role as Role] || defaultRole);
	const Icon = $derived(roleData.icon || null);
</script>

<!-- accordian code is here if we need it, but currently there isnt really anything to put in it -->

{#if filter[message.role]}
	<!-- <Accordion.Root class="relative" type="single">
		<Accordion.Item value="item-1"> -->
	<li
		class={`bg-card  flex flex-col gap-4 rounded-lg border-2 p-4 py-6 text-sm ${roleData.borderClass}`}
	>
		<div class="flex gap-4">
			<div
				class={`relative h-6 w-6 self-center rounded-lg bg-[#e5f0ff] p-5 *:absolute *:inset-0 *:m-auto *:h-6 *:w-6 dark:bg-[#1f2937]`}
			>
				{#if roleData.icon != null}
					<Icon class={roleData.textClass} />
				{:else}
					<span class="text-muted-foreground">?</span>
				{/if}
			</div>
			<section class="text-muted-foreground flex w-full flex-col gap-2">
				<!-- <Accordion.Trigger class="absolute top-5 right-5 h-12 w-12 cursor-pointer"
						></Accordion.Trigger> -->

				{#if message.content && message.content.length > 0}
					<span class="text-foreground font-bold">{roleData.label}</span>
					{#each message.content as part}
						{#if message.role != 'user'}
							<CodeBlock
								text={part.text}
								class=" max-w-full  whitespace-break-spaces "
								language="json"
							/>
						{:else}
							<p class="whitespace-pre-wrap">{part.text}</p>
						{/if}
					{/each}
				{:else if message.tool_calls}
					<span class="text-foreground font-bold">Agent invoked tools</span>
					<ul>
						{#each message.tool_calls as toolCall}
							<li>
								<span class="font-bold">{toolCall.function.name}</span>
								<CodeBlock text={toolCall.function.arguments} class="max-w-max" language="json" />
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-gray-400 italic">No content</p>
				{/if}
			</section>
		</div>
		<!-- <Accordion.Content class="flex flex-col gap-2">
					<Separator />
					
				</Accordion.Content> -->
	</li>
	<!-- </Accordion.Item>
	</Accordion.Root> -->

	<Separator orientation="vertical" class="separator ml-6 h-6 max-h-6 min-h-6" />
{/if}
