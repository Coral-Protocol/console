<script lang="ts">
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as HoverCard from '@coral-os/component-library/ui/hover-card/index.js';
	import type { CoralServer } from '$lib/CoralServer.svelte';
	import type { components } from '$generated/api';
	import { onMount } from 'svelte';

	import {
		normalizeTemplate,
		fetchTemplatesFromStorage,
		safeJSONParse
	} from './templates/TemplateLib';

	let templates = $state<string[]>([]);

	onMount(() => {
		templates = fetchTemplatesFromStorage();
	});

	let {
		server,
		onSelect
	}: {
		server: CoralServer;
		onSelect?: (template: string) => void;
	} = $props();
</script>

<Command.Root>
	<Command.Input placeholder="Search templates..." />
	<Command.List>
		<Command.Empty>No templates found.</Command.Empty>
		{#if templates.length > 0}
			<Command.Group heading="Templates">
				{#each templates as template, i}
					{@const templateData = normalizeTemplate(
						safeJSONParse(localStorage.getItem(`template_${template}`), {})
					)}
					<HoverCard.Root>
						<HoverCard.Trigger class="m-0">
							<Command.Item
								class="w-full cursor-pointer border-b px-4 py-2"
								onSelect={() => onSelect?.(template)}
							>
								<span class="grow">{templateData.name}</span>
							</Command.Item>
						</HoverCard.Trigger>

						<HoverCard.Content side="right" class="max-w-1/2 min-w-full whitespace-pre-wrap">
							{templateData.description != ''
								? templateData.description
								: 'no description for template'}
						</HoverCard.Content>
					</HoverCard.Root>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Root>
