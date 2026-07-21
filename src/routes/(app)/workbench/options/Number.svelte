<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';

	import type { OptionProps } from '../OptionField.svelte';

	type Props = OptionProps<
		'i8' | 'i16' | 'i32' | 'i64' | 'u8' | 'u16' | 'u32' | 'u64' | 'f32' | 'f64'
	>;

	let { meta, value, errored }: Props = $props();
</script>

<Input
	type="text"
	inputmode="decimal"
	required={meta.required}
	value={$value}
	pattern=""
	class="m-0 w-full"
	defaultValue={meta.default}
	aria-invalid={errored}
	placeholder={meta.default?.toString()}
	onchange={(e: { currentTarget: HTMLInputElement }) => {
		const input = e.currentTarget;

		const inputValue = input.value;
		const number = Number(inputValue);

		if (inputValue === '') {
			$value = null;
			return;
		}

		value.set(inputValue !== '' && !Number.isNaN(number) ? number : inputValue);
	}}
/>
