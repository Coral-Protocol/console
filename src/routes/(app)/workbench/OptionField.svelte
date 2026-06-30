<script lang="ts" module>
	import type { z } from 'zod';
	import * as schemas from '$lib/sessionSchema';
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
		errors?: string[];
		name: string;
	};

	import Bool from './options/Bool.svelte';
	import StringOption from './options/String.svelte';
	import Number from './options/Number.svelte';
	import Blob from './options/Blob.svelte';
	import List from './options/List.svelte';

	export const componentMap: {
		[K in OptionTypes]: Component<any> | undefined;
	} = {
		string: StringOption,

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
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
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
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';
	import type { Agent } from '$lib/fileStorage';
	import { activeFile } from '$lib/activeFile.svelte';

	type Props = {
		agent: Agent;
		name: string;
		class?: string;
		meta: components['schemas']['RegistryAgent']['options'][string];
	};

	let { agent, name, meta, class: className }: Props = $props();

	let type = $derived(meta.type);
	let value = $derived(
		store.toStore(
			() => agent.options?.[name]?.value,
			(value) => {
				if (!agent) return;
				activeFile.updateAgent(agent.clientId, {
					options: {
						...agent.options,
						[name]: { type, value } as any // Safety: trust me (this sadly remains)
					}
				});
			}
		)
	);

	const valuesEqual = (a: any, b: any): boolean => {
		if (Array.isArray(a) && Array.isArray(b)) {
			return a.length === b.length && a.every((v, i) => valuesEqual(v, b[i]));
		}
		// TODO: This was added because special number types need to be represented as different types sometimes
		// TODO: Probably they should always be represented using a value that doesn't need to change type?
		if (typeof a !== typeof b) {
			return String(a) === String(b);
		}
		return a === b;
	};
</script>

<li class={cn('hover:bg-muted/50 group px-2 py-2', className)}>
	<Resizable.PaneGroup direction="horizontal" class="w-full grow">
		<Resizable.Pane
			class="grid grid-cols-[auto_min-content] items-start gap-1 truncate"
			defaultSize={25}
			minSize={10}
		>
			<TooltipLabel
				title={name}
				tooltip={meta.display?.description ?? 'No description provided.'}
				extra={{
					required: meta.required ?? false,
					type: meta.type
				}}
			>
				<div class="flex flex-col">
					<span class="truncate wrap-break-word">{meta.display?.label ?? name}</span>

					<span class="text-muted-foreground truncate text-xs"
						>{meta.display?.description ?? ''}</span
					>
				</div>
			</TooltipLabel>
			{#if meta.default !== undefined && $value !== undefined && !valuesEqual($value, meta.default)}
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
			{/if}
		</Resizable.Pane>
		<Resizable.Handle class="w-1 bg-transparent" />
		<Resizable.Pane minSize={15}>
			{#if type}
				{@const O = componentMap[type] as Component<OptionProps>}
				{#if O}
					<O {type} {value} {meta} {name} />
				{:else}
					Unknown option type - {type}
				{/if}
			{/if}
		</Resizable.Pane>
	</Resizable.PaneGroup>

	<!-- FIXME: error prop -->
	<!-- {#if JSON.stringify($errors?.agents?.[selectedAgent!]?.options?.[name]) !== '{}' && JSON.stringify($errors?.agents?.[selectedAgent!]?.options?.[name])} -->
	<!-- 	<span class="text-xs"> -->
	<!-- 		{$errors?.agents?.[selectedAgent!]?.options?.[name]?.value ?? -->
	<!-- 			$errors?.agents?.[selectedAgent!]?.options?.[name]} -->
	<!-- 	</span> -->
	<!-- {/if} -->
	<Separator class="mt-4 group-last:hidden" />
</li>
