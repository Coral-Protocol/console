<script lang="ts">
	import * as schemas from '../schemas';
	import type { z } from 'zod';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as store from 'svelte/store';
	import { type SuperForm } from 'sveltekit-superforms';

	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';

	type T = z.output<schemas.FormSchema>;

	type Props = HTMLInputAttributes & {
		superform: SuperForm<T>;
		id: string;
	};

	let { superform: form, id, ...rest }: Props = $props();
	const { form: formData, errors } = form;
	let data = $derived(
		store.toStore(
			() => $formData.tools[id],
			(tool) => {
				if (!tool) return;
				$formData.tools[id] = tool;
			}
		)
	);
</script>

{#if $data}
	<Form.Field {form} name="tools.{id}.name">
		<Form.Control {...rest}>
			{#snippet children({ props })}
				<Form.Label>Name</Form.Label>
				<Input {...props} bind:value={$data.name} />
			{/snippet}
		</Form.Control>
		<Form.Description
			>The name of the tool. This is NOT shown to the agents themselves.</Form.Description
		>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="tools.{id}.transport.url">
		<Form.Control {...rest}>
			{#snippet children({ props })}
				<Form.Label>URL</Form.Label>
				<Input
					{...props}
					bind:value={$data.transport.url}
					placeholder="http://my-app.com/api/custom-tools/my-tool"
				/>
			{/snippet}
		</Form.Control>
		<Form.Description
			>The URL the server sends a POST request to, to get a response for the MCP tool call.</Form.Description
		>
		<Form.FieldErrors />
	</Form.Field>
{/if}
<!-- {#if $errors}<span class="invalid">{$errors}</span>{/if} -->
