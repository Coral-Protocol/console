<script lang="ts">
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';
	import * as Label from '@coral-os/component-library/ui/label/index.js';
	import { tick } from 'svelte';

	interface Props {
		value: number;
		disabled?: boolean;
		onchange?: (totalMilliseconds: number) => void;
	}

	let { value, disabled = false, onchange }: Props = $props();

	const toHMS = (totalMs: number) => {
		const totalSeconds = Math.floor(totalMs / 1000);
		return {
			h: Math.floor(totalSeconds / 3600),
			m: Math.floor((totalSeconds % 3600) / 60),
			s: totalSeconds % 60
		};
	};

	const toSeconds = (h: number, m: number, s: number) =>
		(h * 3600 + Math.min(m, 59) * 60 + Math.min(s, 59)) * 1000;

	const pad = (n: number) => String(n).padStart(2, '0');
	const parseSegment = (v: string) => {
		const n = parseInt(v.replace(/\D/g, ''), 10);
		return isNaN(n) ? 0 : n;
	};

	let isEditingH = $state(false);
	let isEditingM = $state(false);
	let isEditingS = $state(false);
	let editH = $state('');
	let editM = $state('');
	let editS = $state('');

	const hms = $derived(toHMS(value ?? 0));

	async function onFocusSegment(
		e: FocusEvent & { currentTarget: HTMLInputElement },
		segment: 'h' | 'm' | 's'
	) {
		if (segment === 'h') {
			isEditingH = true;
			editH = String(hms.h);
		}
		if (segment === 'm') {
			isEditingM = true;
			editM = String(hms.m);
		}
		if (segment === 's') {
			isEditingS = true;
			editS = String(hms.s);
		}
		await tick();
		e.currentTarget.select();
	}

	function onBlurSegment(
		e: FocusEvent & { currentTarget: HTMLInputElement },
		segment: 'h' | 'm' | 's'
	) {
		const raw = parseSegment(e.currentTarget.value);
		if (segment === 'h') {
			isEditingH = false;
		}
		if (segment === 'm') {
			isEditingM = false;
		}
		if (segment === 's') {
			isEditingS = false;
		}
		const { h, m, s } = hms;
		const next = {
			h: segment === 'h' ? raw : h,
			m: segment === 'm' ? raw : m,
			s: segment === 's' ? raw : s
		};
		onchange?.(toSeconds(next.h, next.m, next.s));
	}
</script>

<ButtonGroup.Root class="grow">
	<!-- Hours -->
	<ButtonGroup.Text>
		<Label.Root>Hours</Label.Root>
	</ButtonGroup.Text>
	<InputGroup.Root>
		<InputGroup.Input
			value={isEditingH ? editH : String(hms.h)}
			onfocus={(e: any) => onFocusSegment(e, 'h')}
			onblur={(e: any) => onBlurSegment(e, 'h')}
			oninput={(e: any) => (editH = e.currentTarget.value)}
			{disabled}
			placeholder="0"
			maxlength={4}
			inputmode="numeric"
			type="text"
		/>
	</InputGroup.Root>

	<!-- Minutes -->
	<ButtonGroup.Text>
		<Label.Root>Minutes</Label.Root>
	</ButtonGroup.Text>
	<InputGroup.Root>
		<InputGroup.Input
			value={isEditingM ? editM : pad(hms.m)}
			onfocus={(e: any) => onFocusSegment(e, 'm')}
			onblur={(e: any) => onBlurSegment(e, 'm')}
			oninput={(e: any) => (editM = e.currentTarget.value)}
			{disabled}
			placeholder="00"
			maxlength={2}
			inputmode="numeric"
			type="text"
		/>
	</InputGroup.Root>

	<!-- Seconds -->
	<ButtonGroup.Text>
		<Label.Root>Seconds</Label.Root>
	</ButtonGroup.Text>
	<InputGroup.Root>
		<InputGroup.Input
			value={isEditingS ? editS : pad(hms.s)}
			onfocus={(e: any) => onFocusSegment(e, 's')}
			onblur={(e: any) => onBlurSegment(e, 's')}
			oninput={(e: any) => (editS = e.currentTarget.value)}
			{disabled}
			placeholder="00"
			maxlength={2}
			inputmode="numeric"
			type="text"
		/>
	</InputGroup.Root>
</ButtonGroup.Root>
