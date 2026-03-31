<script lang="ts" module>
	import type { z } from 'zod';
	import * as schemas from './schemas';
	import type { ControlAttrs } from 'formsnap';

	type Schema = z.output<schemas.FormSchema>;

	type Option = NonNullable<Schema['agents'][number]['options'][string]>;
	export type OptionTypes = NonNullable<Option['type']>;

	export type Expand<T> = T extends infer U
		? {
				[K in keyof U]: U[K];
			}
		: never;
	export type OptionProps<Type extends OptionTypes = OptionTypes> = {
		meta: Extract<components['schemas']['RegistryAgent']['options'][string], { type: Type }>;
		type: Type;
		value: store.Writable<Extract<Option, { type: Type }>['value'] | undefined>;
		props: Expand<ControlAttrs>;
		errors: string[];
	};

	import Bool from './options/Bool.svelte';
	import String from './options/String.svelte';
	import Number from './options/Number.svelte';
	import Blob from './options/Blob.svelte';
	import List from './options/List.svelte';

	export const componentMap: {
		[K in OptionTypes]: Component<any> | undefined;
	} = {
		string: String,
		secret: String,

		bool: Bool,
		blob: Blob,

		number: Number,
		i8: Number,
		i16: Number,
		i32: Number,
		i64: Number,
		u8: Number,
		u16: Number,
		u32: Number,
		u64: Number,
		f32: Number,
		f64: Number,

		'list[blob]': List,
		'list[i8]': List,
		'list[i16]': List,
		'list[i32]': List,
		'list[i64]': List,
		'list[u8]': List,
		'list[u16]': List,
		'list[u32]': List,
		'list[u64]': List,
		'list[f32]': List,
		'list[f64]': List,
		'list[string]': List
	};
</script>

<script lang="ts">
	import type { Component } from 'svelte';
	import * as store from 'svelte/store';
	import { type SuperForm } from 'sveltekit-superforms';

	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { buttonVariants } from '@coral-os/component-library/ui/button/index.js';

	import IconArrowUUpLeft from 'phosphor-icons-svelte/IconArrowUUpLeftRegular.svelte';

	import { cn } from '$lib/utils';

	import type { components } from '$generated/api';
	import { TooltipLabel } from '@coral-os/component-library';

	type Props = {
		superform: SuperForm<Schema>;
		agent: number;
		name: string;
		meta: components['schemas']['RegistryAgent']['options'][string];
	};

	let { superform: form, agent, name, meta }: Props = $props();
	const { form: formData, errors } = form;

	let type = $derived(meta.type);
	let value = $derived(
		store.toStore(
			() => {
				return $formData.agents[agent]?.options[name]?.value;
			},
			(value) => {
				if (!$formData.agents[agent]) return;
				$formData.agents[agent].options[name] = { type, value } as any; // Safety: trust me
			}
		)
	);

	const valuesEqual = (a: any, b: any) => {
		if (Array.isArray(a) && Array.isArray(b)) {
			return a.every((v, i) => v === b[i]);
		}
		return a === b;
	};
</script>

<li class="hover:bg-muted/50 border-b px-4 py-2">
	<Form.ElementField
		class="grid grid-cols-[1fr_3fr] gap-2 space-y-0"
		{form}
		name="agents[{agent}].options.{name}.value"
	>
		<Form.Control>
			{#snippet children({ props })}
				<div class="grid grid-cols-[auto_min-content] items-center gap-1">
					<TooltipLabel
						title={name}
						for={props.id}
						tooltip={meta.display?.description ?? 'No description provided.'}
						extra={{
							required: meta.required ?? false,
							type: meta.type
						}}
					>
						{meta.display?.label ?? name}
					</TooltipLabel>
					{#if meta.default !== undefined && $value !== undefined && !valuesEqual($value, meta.default)}
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger
									class={cn(buttonVariants({ size: 'icon' }))}
									onclick={() => {
										$value = meta.default as any;
									}}
								>
									<IconArrowUUpLeft />
								</Tooltip.Trigger>
								<Tooltip.Content>Revert to default</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}
				</div>
				{#if type}
					{@const O = componentMap[type] as Component<OptionProps>}
					{@const errs = $errors.agents?.[agent]?.options?.[name]?.value ?? []}
					{#if O}
						<O {type} {props} {value} {meta} errors={errs} />
					{:else}
						Unknown option type - {type}
					{/if}
				{/if}
			{/snippet}
		</Form.Control>
	</Form.ElementField>

	<!-- FIXME: error prop -->
	<!-- {#if JSON.stringify($errors?.agents?.[selectedAgent!]?.options?.[name]) !== '{}' && JSON.stringify($errors?.agents?.[selectedAgent!]?.options?.[name])} -->
	<!-- 	<span class="text-xs"> -->
	<!-- 		{$errors?.agents?.[selectedAgent!]?.options?.[name]?.value ?? -->
	<!-- 			$errors?.agents?.[selectedAgent!]?.options?.[name]} -->
	<!-- 	</span> -->
	<!-- {/if} -->
</li>
