<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';

	import type { OptionProps } from '../OptionField.svelte';

	type Props = OptionProps<
		'number' | 'i8' | 'i16' | 'i32' | 'i64' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'f64'
	>;

	let { meta, value, errors }: Props = $props();
</script>

<Input
	type="file"
	bind:value={$value}
	class="m-0"
	aria-invalid={errors}
	placeholder={meta.default?.toString()}
/>
