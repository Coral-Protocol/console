<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Label } from '@coral-os/component-library/ui/label/index.js';
	import { activeFile } from '$lib/activeFile.svelte';

	type Props = { id: string };
	let { id }: Props = $props();

	let tool = $derived(activeFile.current?.tools.find((t) => t.clientId === id));
	let errors = $derived(activeFile.current?.errors?.tool?.[id] ?? {});
</script>

{#if tool && id}
	<div class="flex flex-col gap-1">
		<Label for="tool-name-{id}">Name</Label>
		<Input id="tool-name-{id}" bind:value={tool.name} />
		<p class="text-muted-foreground text-xs">
			The name of the tool. This is NOT shown to the agents themselves.
		</p>
		{#if errors['name']}
			<span class="text-destructive text-xs">{errors['name'].message}</span>
		{/if}
	</div>
	<div class="flex flex-col gap-1">
		<Label for="tool-url-{id}">URL</Label>
		<Input
			id="tool-url-{id}"
			bind:value={tool.transport.url}
			placeholder="http://my-app.com/api/custom-tools/my-tool"
		/>
		<p class="text-muted-foreground text-xs">
			The URL the server sends a POST request to, to get a response for the MCP tool call.
		</p>
		{#if errors['transport.url']}
			<span class="text-destructive text-xs">{errors['transport.url'].message}</span>
		{/if}
	</div>
{/if}
