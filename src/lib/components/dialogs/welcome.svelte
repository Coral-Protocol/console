<script lang="ts">
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { onMount } from 'svelte';

	let { open = $bindable(false), tourToggle = $bindable(false) } = $props();

	import { tour } from '$lib/components/tour/tour.svelte';

	const STORAGE_KEY = 'coral-console-welcome-shown';

	onMount(() => {
		const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
		if (!hasSeenWelcome) {
			open = true;
			localStorage.setItem(STORAGE_KEY, 'true');
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="mx-auto flex h-fit w-4xl max-w-full! flex-col overflow-hidden *:font-sans! sm:max-w-fit! "
	>
		<Dialog.Header>
			<Dialog.Title class="text-xl font-semibold">Welcome to Coral Console</Dialog.Title>
			<Dialog.Description>
				Your playground for exploring and testing Coral agents
			</Dialog.Description>
		</Dialog.Header>
		<ScrollArea class="min-h-0 flex-1 pr-4">
			<div class="space-y-6 pb-4">
				<Accordion.Root type="single" value="item-1">
					<Accordion.Item value="item-1">
						<Accordion.Trigger variant="compact">What is Coral Console?</Accordion.Trigger>
						<Accordion.Content>
							Coral Console is a playground for <strong>Coral</strong> — a framework for orchestrating
							AI agents. Use this console to browse available agents and try them out interactively.
						</Accordion.Content>
					</Accordion.Item>
					<Accordion.Item value="item-2">
						<Accordion.Trigger variant="compact">Browsing Agents</Accordion.Trigger>
						<Accordion.Content>
							<p class="text-muted-foreground">
								Navigate through the sidebar to explore the agent registry and view all available
								agents. You can create sessions to interact with agents and test their capabilities
								in real-time.
							</p>
						</Accordion.Content>
					</Accordion.Item>
					<Accordion.Item value="item-3">
						<Accordion.Trigger variant="compact">Creating Agents Programmatically</Accordion.Trigger
						>
						<Accordion.Content>
							<p class="text-muted-foreground">
								Agents are intended to be created programmatically in your application code. The
								console serves as a testing and exploration tool, but for production use, you'll
								want to integrate agents directly into your codebase.
							</p>
						</Accordion.Content>
					</Accordion.Item>
					<Accordion.Item value="item-4">
						<Accordion.Trigger variant="compact">Using the Network Tab</Accordion.Trigger>
						<Accordion.Content>
							<p class="text-muted-foreground mb-2">To use an agent in your own application:</p>
							<ol class="text-muted-foreground list-inside list-decimal space-y-2">
								<li>Open your browser's Developer Tools (F12 or Cmd+Option+I)</li>
								<li>Navigate to the <strong>Network</strong> tab</li>
								<li>Interact with an agent in the console</li>
								<li>Find the relevant API request in the network log</li>
								<li>Right-click the request and select <strong>"Copy as cURL"</strong></li>
								<li>Use this cURL command as a reference for your application code</li>
							</ol>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>

				<section>
					<h3 class="mb-2 text-lg font-medium">Quick Tips</h3>
					<ul class="text-muted-foreground list-inside list-disc space-y-1">
						<li>
							Use <kbd class="bg-muted rounded px-1.5 py-0.5 text-xs">Ctrl+K</kbd> to quickly search
							and navigate
						</li>
						<li>
							Press <kbd class="bg-muted rounded px-1.5 py-0.5 text-xs">Shift+R</kbd> to refresh agent
							configurations
						</li>
						<li>
							Press <kbd class="bg-muted rounded px-1.5 py-0.5 text-xs">Shift+N</kbd> to create a new
							session
						</li>
						<li>
							Press <kbd class="bg-muted rounded px-1.5 py-0.5 text-xs">Shift+?</kbd> to view all keyboard
							shortcuts
						</li>
					</ul>
				</section>

				<section class="border-muted rounded-lg border p-4">
					<p class="text-muted-foreground text-sm">
						💡 <strong>Tip:</strong> You can reopen this help dialog anytime by clicking the help icon
						next to the search button in the top-right corner.
					</p>
				</section>
			</div>
		</ScrollArea>
		<Dialog.Footer>
			<Dialog.Close class="text-muted-foreground text-xs">Skip tour</Dialog.Close>

			<Button
				onclick={() => {
					tour.start([
						{ id: 'workbench', text: 'Click here to create a new session' },
						{ id: 'add-agents', text: 'Add a new agent here' }
					]),
						(open = false);
				}}>Quickstart</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
