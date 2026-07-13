<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { updateFileDataFromDelta, type FileMeta } from '$lib/fileStorage.svelte';

	let {
		showDeleteConfirmation = $bindable(false),
		name,
		id,
		closeFile
	}: {
		showDeleteConfirmation: boolean;
		name: string | undefined;
		id: string | null;
		closeFile: Function;
	} = $props();
</script>

<Dialog.Root bind:open={showDeleteConfirmation}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Do you want to save your changes?</Dialog.Title>
			<Dialog.Description>Unsaved changes will be lost if not saved.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button
				onclick={async () => {
					if (id) {
						try {
							await updateFileDataFromDelta(id);
							closeFile(id, true);
						} catch (err) {}
					}
				}}>Save</Button
			>
			<Button variant="outline" onclick={() => closeFile(id, true)}>Don't save</Button>
			<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
