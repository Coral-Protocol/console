<script lang="ts">
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';
	import * as Label from '@coral-os/component-library/ui/label/index.js';
	import { tick } from 'svelte';

	const MICRODOLLARS_PER_DOLLAR = 100_000_000;

	const toDollars = (micro: number) => micro / MICRODOLLARS_PER_DOLLAR;
	const toMicro = (dollars: number) => Math.round(dollars * MICRODOLLARS_PER_DOLLAR);

	const formatUSD = (value: number) => {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'USD',
			currencyDisplay: 'narrowSymbol',
			minimumFractionDigits: 2,
			maximumFractionDigits: 8
		}).format(value);
	};

	const parseNumber = (value: string) => Number(value.replace(/[^0-9.-]/g, ''));

	interface Props {
		value: number;
		disabled?: boolean;
		placeholder?: string;
		maxlength?: number;
		onchange?: (microdollars: number) => void;
	}

	let {
		value,
		disabled = false,
		placeholder = '$0.00',
		maxlength = 16,
		onchange
	}: Props = $props();

	let isEditing = $state(false);
	let editingValue = $state('');

	const dollars = $derived(toDollars(value ?? 0));

	async function onFocus(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		isEditing = true;
		editingValue = isNaN(dollars) ? '' : dollars.toFixed(10).replace(/\.?0+$/, '');

		await tick();
		e.currentTarget.select();

		// TODO: without the await tick it doesnt select! :)
	}

	function onBlur(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		isEditing = false;
		const parsed = parseNumber(e.currentTarget.value);
		const normalized = isNaN(parsed) ? 0 : parsed;
		onchange?.(toMicro(normalized));
	}
</script>

<ButtonGroup.Root class="grow">
	<ButtonGroup.Text>
		<Label.Root>$</Label.Root>
	</ButtonGroup.Text>
	<InputGroup.Root>
		<InputGroup.Input
			value={isEditing ? editingValue : formatUSD(dollars)}
			onfocus={onFocus}
			onblur={onBlur}
			{disabled}
			{placeholder}
			{maxlength}
			type="text"
			autocomplete="one-time-code"
		/>
	</InputGroup.Root>
</ButtonGroup.Root>
