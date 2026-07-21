<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';
	import { cn } from '$lib/utils';

	import type { OptionProps } from '../OptionField.svelte';
	import { onMount, tick, type Component } from 'svelte';
	import * as Command from '@coral-os/component-library/components/ui/command/index.js';
	import {
		Button,
		buttonVariants
	} from '@coral-os/component-library/components/ui/button/index.js';
	import * as Popover from '@coral-os/component-library/components/ui/popover/index.js';
	import { useId } from 'bits-ui';
	import SecretManager, {
		sessionSecrets,
		savedSecrets
	} from '$lib/components/dialogs/secretManager.svelte';
	import type { SecretEntry } from '$lib/components/dialogs/secretManager.svelte';
	import type { PersistedState } from 'runed';

	type Props = OptionProps<'string'>;

	let readonly = $state(true);

	let { meta, value, name, errored }: Props = $props();

	let open = $state(false);

	const secrets = $derived<SecretEntry[]>(sessionSecrets.current.concat(savedSecrets.current));

	const selectedSecret = $derived(secrets.find((s) => s.id === $value));

	function closeAndFocusTrigger(triggerId: string) {
		open = false;
		tick().then(() => {
			document.getElementById(triggerId)?.focus();
		});
	}
	const triggerId = useId();

	let displayValue = $derived($value ?? meta.default);
	let secretManagerOpen = $state(false);
</script>

{#if !meta.secret}
	{#if meta.display?.multiline === true}
		<Textarea
			class={cn('relative m-0 resize-y', !!meta.default && 'h-30')}
			value={displayValue}
			aria-invalid={errored}
			onchange={(e: { currentTarget: HTMLTextAreaElement }) =>
				($value = (e.currentTarget as HTMLTextAreaElement).value)}
		/>
	{:else}
		<Input
			type="text"
			value={displayValue}
			class="m-0 w-full"
			aria-invalid={errored}
			autocomplete={meta.secret ? `section-${name} one-time-code` : undefined}
			data-1p-ignore={meta.secret ? 'true' : undefined}
			spellcheck={meta.secret ? 'false' : undefined}
			{readonly}
			onfocus={() => (readonly = false)}
			onblur={() => (readonly = true)}
			onchange={(e: { currentTarget: HTMLInputElement }) =>
				($value = (e.currentTarget as HTMLInputElement).value)}
		/>
	{/if}
{:else}
	<SecretManager bind:open={secretManagerOpen} />
	<div class="flex items-center justify-between gap-2">
		<Popover.Root bind:open>
			<Popover.Trigger
				id={triggerId}
				aria-invalid={errored}
				class="{buttonVariants({
					variant: 'outline',
					size: 'sm',
					class: 'w-[150px] justify-start'
				})} aria-invalid:border-destructive! h-9! grow"
			>
				{#if selectedSecret}
					{selectedSecret.name}
				{:else}
					Select secret
				{/if}
			</Popover.Trigger>

			<Popover.Content class="w-[200px] p-0" side="top" align="start">
				<Command.Root>
					<Command.Input placeholder="Select secret..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Item
							onSelect={() => {
								secretManagerOpen = true;
								open = false;
							}}>Add new secret</Command.Item
						>
						<Command.Group>
							{#each secrets ?? [] as secret (secret.id)}
								<Command.Item
									value={secret.id}
									class="flex w-full grow justify-between"
									onSelect={() => {
										$value = secret.id;
										closeAndFocusTrigger(triggerId);
									}}
								>
									<span class="truncate">
										{secret.name}
									</span>

									<span class="text-foreground/50 text-xs">
										{secret.saved ? 'saved' : 'unsaved'}
									</span>
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
		<Button
			onclick={() => {
				secretManagerOpen = true;
				open = false;
			}}>Secret manager</Button
		>
	</div>
{/if}
