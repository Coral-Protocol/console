<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import type { FileMeta } from '$lib/fileStorage.svelte';

	let {
		showDeleteConfirmation = $bindable(false),
		name,
		id,
		save,
		closeTab
	}: {
		showDeleteConfirmation: boolean;
		name: string | undefined;
		id: string | null;
		save: Function;
		closeTab: Function;
	} = $props();
</script>

<Dialog.Root bind:open={showDeleteConfirmation}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title
				>Do you want to save your changes to <span class="italic">{name ?? 'this file'}?</span
				></Dialog.Title
			>
			<Dialog.Description>Unsaved changes will be lost forever if not saved.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button>Save</Button>
			<Button variant="outline" onclick={() => closeTab(id, true)}>Don't save</Button>
			<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
