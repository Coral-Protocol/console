<script lang="ts">
	import { toast } from 'svelte-sonner';

	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';

	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { TooltipLabel, TwostepButton } from '@coral-os/component-library';

	import CaretUpDown from 'phosphor-icons-svelte/IconCaretUpDownRegular.svelte';
	import IconPlus from 'phosphor-icons-svelte/IconPlusRegular.svelte';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';

	import { fade } from 'svelte/transition';

	import { tick, untrack } from 'svelte';
	import { appContext } from '$lib/context';
	import { activeFile } from '$lib/activeFile.svelte';

	let ctx = appContext.get();

	let sessionSearcherOpen = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	let namespaces = $derived(ctx.server.namespaces.filter((ns) => ns !== 'default'));
	let createOpen = $state(false);

	let newNamespace = $state('Untitled Namespace');
	let duplicate = $derived(newNamespace === 'default' || newNamespace in ctx.server.namespaces);

	let selectedNamespace = $state();

	const setNamespaceForSession = (namespace: string) => {
		selectedNamespace = namespace;
		activeFile.updateNamespaceSettings({
			namespaceRequest: {
				name: namespace,
				annotations: {},
				deleteOnLastSessionExit: false
			}
		});
	};
</script>

<Popover.Root bind:open={sessionSearcherOpen}>
	<Popover.Trigger aria-invalid={ctx.session !== null && !ctx.session.connected}>
		{#snippet child({ props }: any)}
			<Button
				variant="outline"
				{...props}
				role="combobox"
				class="flex min-w-0 grow items-center gap-0"
				aria-expanded={sessionSearcherOpen}
				bind:ref={triggerRef}
			>
				<span class="text-muted-foreground min-w-0 shrink-0 text-left"> Namespace </span>
				<div class="grow"></div>
				<span class="w-0 min-w-0 flex-1 truncate pr-1 text-right">
					{selectedNamespace ?? 'default'}
				</span>

				<CaretUpDown class="shrink-0" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Button onclick={() => (createOpen = true)} size="icon" variant="outline">
		<IconPlus />
	</Button>
	<Popover.Content align="start" class="p-1">
		<Command.Root>
			<Command.Input placeholder="Search" />
			<Command.List>
				<Command.Group>
					<Command.Item
						onSelect={() => {
							setNamespaceForSession('default');
						}}>default</Command.Item
					>

					{#each namespaces as namespace}
						<Command.Item
							class="flex text-wrap break-all"
							onSelect={() => {
								setNamespaceForSession(namespace);
							}}
						>
							<span class="grow">{namespace}</span>
							<TwostepButton
								variant="destructive"
								size="icon-xs"
								onclick={() => {
									ctx.server
										.deleteNamespace(namespace)
										.then(() => {
											toast.success(`Namespace '${namespace}' deleted.`);
										})
										.catch((e) => {
											toast.error(`Failed to delete namespace '${namespace}'${e ? ` - ${e}` : ''}`);
										});
								}}><IconTrash /></TwostepButton
							>
						</Command.Item>
					{/each}
				</Command.Group>
				<Command.Separator />
				<Command.Item onSelect={() => ((createOpen = true), (sessionSearcherOpen = false))}
					>Create new namespace</Command.Item
				>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<form
			class="grid w-full gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				(async () => {
					ctx.server.namespace = newNamespace;
					toast.info(`Switching to '${newNamespace}'.`);
					await ctx.server.addNamespace(newNamespace);
					ctx.server.namespace = newNamespace;
					newNamespace = '';
					createOpen = false;
				})();
			}}
		>
			<Dialog.Header>
				<Dialog.Title>Add new namespace</Dialog.Title>
			</Dialog.Header>
			<section class="grid grid-cols-2">
				<TooltipLabel>Namespace</TooltipLabel>
				<Input placeholder="Namespace Name" maxlength={100} bind:value={newNamespace} />
			</section>
			<p class="text-sm text-gray-500">
				This namespace will be created when you make a new session
			</p>
			<p class="text-sm text-gray-500">(re-click into Workbench to refresh the namespace)</p>
			<Dialog.Footer class="items-center">
				{#if duplicate === true}
					<p class="mr-auto text-sm text-orange-400" transition:fade>
						This namespace already exists.
					</p>
				{/if}
				{#if duplicate === true}
					<Button type="submit" variant="outline">Use</Button>
				{:else}
					<Button type="submit">Add</Button>
				{/if}
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
