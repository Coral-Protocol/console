<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';

	import type { OptionProps } from '../OptionField.svelte';

	type Props = OptionProps<
		'number' | 'i8' | 'i16' | 'i32' | 'i64' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'f64'
	>;

	let { meta, value, props, errors }: Props = $props();
</script>

<Input
	{...props}
	type={'number'}
	bind:value={$value}
	class="m-0 w-full"
	defaultValue={meta.default}
	aria-invalid={errors.length > 0}
	placeholder={meta.default?.toString()}
/>
