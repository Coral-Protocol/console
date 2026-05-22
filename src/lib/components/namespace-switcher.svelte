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

	import { tick } from 'svelte';
	import { appContext } from '$lib/context';

	let ctx = appContext.get();

	let sessionSearcherOpen = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	let namespaces = $derived(ctx.server.namespaces.filter((ns) => ns !== 'default'));
	let createOpen = $state(false);

	let newNamespace = $state('Untitled Namespace');
	let duplicate = $derived(newNamespace === 'default' || newNamespace in ctx.server.namespaces);
</script>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<form
			class="grid w-full gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				(async () => {
					ctx.server.namespace = newNamespace;
					if (duplicate) {
						toast.info(`Using existing namespace '${newNamespace}'.`);
					} else {
						toast.info(`Using namespace '${newNamespace}'.`);
						await ctx.server.addNamespace(newNamespace);
						ctx.server.namespace = newNamespace;
					}
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

<Popover.Root bind:open={sessionSearcherOpen}>
	<section class="my-2 flex w-full gap-2">
		<Popover.Trigger
			class="bg-sidebar border-offset-background dark:aria-invalid:border-destructive/40 aria-invalid:border-destructive relative  w-full flex-1 grow justify-between truncate border-1 "
			aria-invalid={ctx.session !== null && !ctx.session.connected}
		>
			{#snippet child({ props })}
				<Button
					variant="outline"
					{...props}
					role="combobox"
					aria-expanded={sessionSearcherOpen}
					bind:ref={triggerRef}
				>
					{ctx.server.namespace ? ctx.server.namespace : 'default'}
					<CaretUpDown />
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
						<Command.Item onSelect={() => (ctx.server.namespace = 'default')}>default</Command.Item>

						{#each namespaces as namespace}
							<Command.Item
								class="flex text-wrap break-all"
								onSelect={() => (ctx.server.namespace = namespace)}
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
												toast.error(
													`Failed to delete namespace '${namespace}'${e ? ` - ${e}` : ''}`
												);
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
	</section>
</Popover.Root>
