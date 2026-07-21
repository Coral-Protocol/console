<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { updateFileDataFromDelta } from '$lib/fileStorage.svelte';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		mode,
		name,
		id,
		closeFile,
		deleteFile
	}: {
		open: boolean;
		mode: 'unsaved' | 'delete';
		name: string | undefined;
		id: string | null;
		closeFile?: (id: string | null, force: boolean) => void;
		deleteFile?: (id: string | null) => void | Promise<void>;
	} = $props();

	let saving = $state(false);
	let deleting = $state(false);

	async function handleSave() {
		if (!id) return;
		saving = true;
		try {
			await updateFileDataFromDelta(id);
			closeFile?.(id, true);
			open = false;
		} catch (err) {
			toast.error(err as string);
		} finally {
			saving = false;
		}
	}

	function handleDontSave() {
		closeFile?.(id, true);
		open = false;
	}

	async function handleDelete() {
		deleting = true;
		try {
			await deleteFile?.(id);
			open = false;
		} catch (err) {
			toast.error(err as string);
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="z-51">
		{#if mode === 'unsaved'}
			<Dialog.Header>
				<Dialog.Title>Do you want to save your changes?</Dialog.Title>
				<Dialog.Description>
					{name
						? `Unsaved changes to "${name}" will be lost if not saved.`
						: 'Unsaved changes will be lost if not saved.'}
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button onclick={handleSave} disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</Button>
				<Button variant="outline" onclick={handleDontSave}>Don't save</Button>
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
			</Dialog.Footer>
		{:else}
			<Dialog.Header>
				<Dialog.Title>Delete {name ? `"${name}"` : 'this file'}?</Dialog.Title>
				<Dialog.Description>This action cannot be undone.</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="destructive" onclick={handleDelete} disabled={deleting}>
					{deleting ? 'Deleting…' : 'Delete'}
				</Button>
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Cancel</Dialog.Close>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
