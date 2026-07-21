<script module>
	export type SecretEntry = {
		id: string;
		name: string;
		secret: string;
		saved: boolean;
	};

	export const savedSecrets = new PersistedState<SecretEntry[]>('coral:saved-secrets', []);

	export const sessionSecrets = new PersistedState<SecretEntry[]>('coral:unsaved-secrets', [], {
		storage: 'session'
	});

	export function getSecretFromId(id: string) {
		return (
			savedSecrets.current.find((s) => s.id === id) ||
			sessionSecrets.current.find((s) => s.id === id)
		);
	}
</script>

<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Label } from '@coral-os/component-library/ui/label/index.js';
	import { Checkbox } from '@coral-os/component-library/ui/checkbox/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconWarningRegular from 'phosphor-icons-svelte/IconWarningRegular.svelte';
	import { PersistedState } from 'runed';

	let { open = $bindable(false) } = $props();

	let secrets = $derived([...savedSecrets.current, ...sessionSecrets.current]);

	let nameInput = $state('');
	let secretInput = $state('');

	function addSecret() {
		if (!nameInput.trim() || !secretInput.trim()) return;

		sessionSecrets.current = [
			...sessionSecrets.current,
			{
				id: crypto.randomUUID(),
				name: nameInput.trim(),
				secret: secretInput,
				saved: false
			}
		];

		nameInput = '';
		secretInput = '';
	}

	function removeSecret(id: string) {
		savedSecrets.current = savedSecrets.current.filter((s) => s.id !== id);
		sessionSecrets.current = sessionSecrets.current.filter((s) => s.id !== id);
	}

	function toggleSaved(id: string, value: boolean) {
		if (value) {
			const entry = sessionSecrets.current.find((s) => s.id === id);
			if (!entry) return;

			sessionSecrets.current = sessionSecrets.current.filter((s) => s.id !== id);

			savedSecrets.current = [
				...savedSecrets.current,
				{
					...entry,
					saved: true
				}
			];
		} else {
			const entry = savedSecrets.current.find((s) => s.id === id);
			if (!entry) return;

			savedSecrets.current = savedSecrets.current.filter((s) => s.id !== id);

			sessionSecrets.current = [
				...sessionSecrets.current,
				{
					...entry,
					saved: false
				}
			];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addSecret();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="mx-auto flex h-fit w-4xl max-w-full! flex-col overflow-hidden sm:max-w-fit!"
	>
		<Dialog.Header>
			<Dialog.Title class="text-xl font-semibold">Secret manager</Dialog.Title>
			<Dialog.Description class="flex flex-col gap-4"
				>Secrets are represented by unique IDs in the UI to avoid accidentally compromising them,
				these are converted to their real value during submission to the server. Closing Coral
				Console will remove any unsaved IDs from the memory.

				<span class="flex items-center gap-2 font-bold">
					<IconWarningRegular class="size-4" /> Saved IDs will persist as plaintext in your browsers
					local storage.
				</span>
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-3 px-1">
			<div class="grid grid-cols-2 gap-2">
				<div class="flex flex-col gap-1">
					<Label for="secret-name" class="text-xs">Name</Label>
					<Input
						id="secret-name"
						placeholder="e.g. OpenAI API Key"
						bind:value={nameInput}
						onkeydown={handleKeydown}
					/>
				</div>

				<div class="flex flex-col gap-1">
					<Label for="secret-value" class="text-xs">Secret</Label>
					<Input
						id="secret-value"
						type="password"
						placeholder="Paste secret value"
						bind:value={secretInput}
						onkeydown={handleKeydown}
					/>
				</div>
			</div>

			<Button
				size="sm"
				class="w-fit"
				disabled={!nameInput.trim() || !secretInput.trim()}
				onclick={addSecret}
			>
				Add secret
			</Button>
		</div>

		<ScrollArea class="mt-2 max-h-80 px-1">
			{#if secrets.length === 0}
				<p class="text-muted-foreground py-6 text-center text-sm italic">No secrets added yet.</p>
			{:else}
				<ul class="flex flex-col gap-2 pb-2">
					{#each secrets as entry (entry.id)}
						<li class="bg-muted/50 flex items-center justify-between gap-2 rounded-md p-2">
							<div class="flex min-w-0 flex-col">
								<span class="truncate text-sm font-medium">{entry.name}</span>
								<span class="text-muted-foreground truncate font-mono text-xs">
									{entry.id}
								</span>
							</div>

							<div class="flex shrink-0 items-center gap-3">
								<label class="text-muted-foreground flex items-center gap-1.5 text-xs">
									<Checkbox
										checked={entry.saved}
										onCheckedChange={(value: boolean) => toggleSaved(entry.id, !!value)}
									/>
									Save
								</label>

								<Button
									size="icon"
									variant="outline"
									class="h-7 w-7"
									onclick={() => removeSecret(entry.id)}
								>
									<IconTrash />
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</ScrollArea>

		<Dialog.Footer>
			<Dialog.Close class="text-muted-foreground text-xs">Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
