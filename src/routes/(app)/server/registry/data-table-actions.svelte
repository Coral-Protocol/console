<script lang="ts">
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import { base } from '$app/paths';

	let {
		id,
		name,
		developer,
		version,
		source
	}: { id: string; name: string; developer: string; version: string; source: string } = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props }: { props: any })}
			<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
				<span class="sr-only">Open menu</span>
				<EllipsisIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		<DropdownMenu.Group>
			<DropdownMenu.Label>Actions</DropdownMenu.Label>
			<!-- <DropdownMenu.Item onclick={() => navigator.clipboard.writeText(id)}>
				Copy entry ID
			</DropdownMenu.Item> -->
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		{#if source == 'marketplace'}
			<DropdownMenu.Item
				onclick={() =>
					window.open(`https://marketplace.coralprotocol.ai/agents/${developer}/${name}`, '_blank')}
			>
				View on CoralOS Marketplace
			</DropdownMenu.Item>
		{/if}
		<DropdownMenu.Item
			onclick={() => window.open(`${base}/?agents=${source}:${name}@${version}`, '_blank')}
		>
			Add to new session
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
