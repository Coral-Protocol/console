<script lang="ts">
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';

	import { componentMap, type OptionProps, type OptionTypes } from '../OptionField.svelte';
	import type { Component } from 'svelte';
	import * as store from 'svelte/store';

	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';

	type Props = OptionProps<
		| 'list[blob]'
		| 'list[i8]'
		| 'list[i16]'
		| 'list[i32]'
		| 'list[i64]'
		| 'list[u8]'
		| 'list[u16]'
		| 'list[u32]'
		| 'list[u64]'
		| 'list[f32]'
		| 'list[f64]'
		| 'list[string]'
	>;

	let { meta, value, props }: Props = $props();
	const re = /list\[(.*)\]/;
	let subtype = $derived(re.exec(meta.type)?.[1]) as OptionTypes | null;
</script>

<ol class="flex w-full flex-col gap-1 rounded-md">
	<li>
		<Button
			onclick={() => {
				if (!$value) $value = [];
				($value as any).push('');
				$value = $value;
			}}
			class="m-0 w-full">Add value</Button
		>
	</li>
	{#each $value ?? [], i}
		<li>
			<ButtonGroup.Root class="m-0 w-full">
				{#if subtype}
					{@const O = componentMap[subtype] as Component<OptionProps>}
					{@const subval = store.toStore(
						() => {
							return $value?.[i];
						},
						(val) => {
							if (!$value) return;
							$value[i] = val as any; // Safety: trust me
						}
					)}
					{#if O}
						<O type={subtype} {props} value={subval} {meta} errors={[]} />
					{:else}
						Unknown option type - {subtype}
					{/if}
				{/if}
				<Button
					variant="outline"
					class="m-0"
					size="icon"
					onclick={() => {
						$value?.splice(i, 1);
						$value = $value;
					}}
				>
					<IconXRegular />
				</Button>
			</ButtonGroup.Root>
		</li>
	{/each}
</ol>
