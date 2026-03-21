<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import { randomAdjective, randomAnimal } from '$lib/words';
	import * as Label from '@coral-os/component-library/ui/label/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Template } from './templates/TemplateV1';
	import { saveTemplateToLocalStorage } from './templates/TemplateLib';

	let { open = $bindable(false), data }: { open: boolean; data: Template['payload']['data'] } =
		$props();

	let templateName = $state(`${randomAdjective()}-${randomAnimal()}`);
	let templateDescription = $state('');
	let overwriteWarning = $state(false);

	onMount(() => {
		const template = page.url.searchParams.get('template');
		if (template) {
			templateName = template;
		}

		if (localStorage.getItem(`template_${templateName}`) != null) {
			overwriteWarning = true;
		}
	});

	function save() {
		const saveResult = saveTemplateToLocalStorage({
			name: templateName,
			updated: Date.now(),
			description: templateDescription,
			trusted: true,
			version: 1,
			payload: {
				data,
				version: 1
			}
		});

		if (!saveResult.success) {
			if (saveResult.error) {
				toast.error(saveResult.error);
			}
			return;
		}

		toast.success(
			saveResult.overwrite ? 'Template updated successfully!' : 'Template saved successfully!'
		);

		open = false;
		overwriteWarning = true;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Save Template</Dialog.Title>
			<Dialog.Description class="flex flex-col gap-4">
				<p class="py-4">
					Here you can save your current template configuration. This will allow you to easily load
					it again in the future.
				</p>
				<InputGroup.Root>
					<InputGroup.Input
						aria-invalid={overwriteWarning}
						id="templateName"
						bind:value={templateName}
						oninput={() => {
							localStorage.getItem(`template_${templateName}`) != null
								? (overwriteWarning = true)
								: (overwriteWarning = false);
						}}
					/>
					<InputGroup.Addon align="block-start">
						<Label.Root for="templateName" class="text-foreground">Template Name</Label.Root>
					</InputGroup.Addon>
				</InputGroup.Root>

				<InputGroup.Root>
					<InputGroup.Textarea
						id="templateDescription"
						bind:value={templateDescription}
						class="min-h-[80px]"
						placeholder="Add an optional description for your template"
					/>

					<InputGroup.Addon align="block-start">
						<Label.Root for="templateDescription" class="text-foreground">Description</Label.Root>
					</InputGroup.Addon>
				</InputGroup.Root>

				<Separator />

				<p class="text-muted-foreground text-xs">
					<strong>Templates are stored locally in your browser's storage</strong>, so they will only
					be available on this device and browser.
				</p>
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button onclick={save} variant={overwriteWarning ? 'destructive' : 'default'}
				>{overwriteWarning ? 'Overwrite' : 'Save'}</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
