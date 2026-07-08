<script lang="ts" module>
	import type { z } from 'zod';
	import * as schemas from '$lib/sessionSchema';
	import type { components } from '$generated/api';

	import Blob from './options/Blob.svelte';
	import Bool from './options/Bool.svelte';
	import List from './options/List.svelte';
	import NumberOption from './options/Number.svelte';
	import StringOption from './options/String.svelte';

	type Schema = z.output<schemas.FormSchema>;
	type Option = NonNullable<Schema['agents'][number]['options'][string]>;

	export type OptionTypes = NonNullable<Option['type']>;

	export type OptionProps<Type extends OptionTypes = OptionTypes> = {
		meta: Extract<components['schemas']['RegistryAgent']['options'][string], { type: Type }>;
		type: Type;
		value: store.Writable<Extract<Option, { type: Type }>['value'] | undefined | null>;
		errored?: boolean;
		name: string;
	};

	const NUMBER_TYPES = [
		'number',
		'i8',
		'i16',
		'i32',
		'i64',
		'u8',
		'u16',
		'u32',
		'u64',
		'f32',
		'f64'
	] as const;
	const LIST_TYPES = [
		'list[blob]',
		'list[i8]',
		'list[i16]',
		'list[i32]',
		'list[i64]',
		'list[u8]',
		'list[u16]',
		'list[u32]',
		'list[u64]',
		'list[f32]',
		'list[f64]',
		'list[string]'
	] as const;

	export const componentMap: {
		[K in OptionTypes]: Component<any> | undefined;
	} = {
		string: StringOption,
		bool: Bool,
		blob: Blob,
		...Object.fromEntries(NUMBER_TYPES.map((t) => [t, NumberOption])),
		...Object.fromEntries(LIST_TYPES.map((t) => [t, List]))
	} as any; // Safety: keys are exhaustively covered by NUMBER_TYPES/LIST_TYPES above
</script>

<script lang="ts">
	import type { Component } from 'svelte';
	import * as store from 'svelte/store';

	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';
	import { TooltipLabel } from '@coral-os/component-library';

	import IconArrowUUpLeft from 'phosphor-icons-svelte/IconArrowUUpLeftRegular.svelte';

	import { cn } from '$lib/utils';
	import { activeFile } from '$lib/activeFile.svelte';
	import type { Agent, FileValidationErrors } from '$lib/fileStorage.svelte';

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
						[name]: { type, value } as any
					}
				});
			}
		)
	);

	function valuesEqual(a: any, b: any): boolean {
		if (Array.isArray(a) && Array.isArray(b)) {
			return a.length === b.length && a.every((v, i) => valuesEqual(v, b[i]));
		}

		// TODO: representing these with a stable type value instead?
		if (typeof a !== typeof b) {
			return String(a) === String(b);
		}
		return a === b;
	}

	let showRevertButton = $derived(
		meta.default !== undefined && $value !== undefined && !valuesEqual($value, meta.default)
	);

	let errors = $derived(activeFile.current?.errors);
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
					<span class="text-muted-foreground truncate text-xs">
						{meta.display?.description ?? ''}
					</span>
				</div>
			</TooltipLabel>

			{#if showRevertButton}
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
				{@const OptionComponent = componentMap[type] as Component<OptionProps>}
				{#if OptionComponent}
					<OptionComponent
						{type}
						{value}
						{meta}
						{name}
						errored={!!errors?.agent?.[agent.clientId]?.[`options.${name}.value`]}
					/>
				{:else}
					Unknown option type - {type}
				{/if}
			{/if}

			<p class="text-foreground/80">
				{errors?.agent?.[agent.clientId]?.[`options.${name}.value`]?.message}
			</p>
		</Resizable.Pane>
	</Resizable.PaneGroup>
	<Separator class="mt-4 group-last:hidden" />
</li>
