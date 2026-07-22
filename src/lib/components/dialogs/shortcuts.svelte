<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Kbd from '@coral-os/component-library/ui/kbd/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';

	let { open = $bindable(false) } = $props();

	let shortcuts = [
		{ description: 'Open Quick Switcher', keys: ['CTRL', 'K'] },
		{ description: 'Open Shortcuts Dialog', keys: ['CTRL', '/'] },
		{ description: 'Open Sidebar', keys: ['CTRL', 'B'] },
		{ description: 'Refresh agent configuration', keys: ['SHIFT', 'R'] },
		{ description: 'Create new session', keys: ['SHIFT', 'N'] },
		{ description: 'Debug tools', keys: ['SHIFT', 'D'] }
	];
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Shortcuts</Dialog.Title>
			<Dialog.Description class="my-8">
				<ul class="flex max-w-full min-w-0 list-inside flex-wrap gap-4 overflow-hidden">
					{#each shortcuts as shortcut}
						<li class="wrap-anywhere">
							<Card.Root class="p-0">
								<Card.Content class="flex flex-col gap-2 p-2">
									<Card.Title class="text-sm font-medium">{shortcut.description}</Card.Title>
									<Kbd.Group>
										{#each shortcut.keys as key}
											<Kbd.Root>{key}</Kbd.Root>
										{/each}
									</Kbd.Group>
								</Card.Content>
							</Card.Root>
						</li>
					{/each}
				</ul>
			</Dialog.Description>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
