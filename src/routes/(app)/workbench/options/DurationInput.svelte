<script lang="ts">
	import { tick } from 'svelte';
	import IconX from 'phosphor-icons-svelte/IconXRegular.svelte';

	interface Props {
		value: number;
		disabled?: boolean;
		onchange?: (totalMilliseconds: number) => void;
	}

	let { value, disabled = false, onchange }: Props = $props();

	type Segment = 'h' | 'm' | 's';

	const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
	const pad = (n: number) => String(n).padStart(2, '0');
	const parseSegment = (v: string) => {
		const n = parseInt(v.replace(/\D/g, ''), 10);
		return isNaN(n) ? 0 : n;
	};

	const toHMS = (totalMs: number) => {
		const totalSeconds = Math.floor(totalMs / 1000);
		return {
			h: Math.floor(totalSeconds / 3600),
			m: Math.floor((totalSeconds % 3600) / 60),
			s: totalSeconds % 60
		};
	};

	const toMillis = (h: number, m: number, s: number) =>
		(Math.max(h, 0) * 3600 + clamp(m, 0, 59) * 60 + clamp(s, 0, 59)) * 1000;

	const hms = $derived(toHMS(value ?? 0));
	const isEmpty = $derived((value ?? 0) === 0);

	let editing = $state<Segment | null>(null);
	let editValue = $state('');

	let hEl: HTMLInputElement;
	let mEl: HTMLInputElement;
	let sEl: HTMLInputElement;

	function commit(next: { h: number; m: number; s: number }) {
		onchange?.(toMillis(next.h, next.m, next.s));
	}

	async function startEdit(e: FocusEvent & { currentTarget: HTMLInputElement }, segment: Segment) {
		editing = segment;
		editValue = String(hms[segment]);
		await tick();
		e.currentTarget.select();
	}

	function stopEdit(segment: Segment) {
		const raw = parseSegment(editValue);
		const clamped = segment === 'h' ? Math.max(raw, 0) : clamp(raw, 0, 59);
		editing = null;
		commit({ ...hms, [segment]: clamped });
	}

	function handleInput(e: Event & { currentTarget: HTMLInputElement }, segment: Segment) {
		let v = e.currentTarget.value.replace(/\D/g, '');
		const maxLen = segment === 'h' ? 3 : 2;
		if (v.length > maxLen) v = v.slice(-maxLen);

		// live-clamp minutes/seconds so you never see e.g. "9" while typing "99"
		if (segment !== 'h' && v !== '') {
			v = String(clamp(parseSegment(v), 0, 59)).padStart(v.length === maxLen ? 2 : 1, '0');
		}

		editValue = v;

		// auto-advance once the segment can't reasonably take another digit
		if (v.length === maxLen) {
			if (segment === 'h') mEl?.focus();
			else if (segment === 'm') sEl?.focus();
		}
	}

	function handleKeydown(e: KeyboardEvent, segment: Segment) {
		if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault();
			const delta = e.key === 'ArrowUp' ? 1 : -1;
			const current = editing === segment ? parseSegment(editValue) : hms[segment];
			const next = segment === 'h' ? Math.max(0, current + delta) : clamp(current + delta, 0, 59);
			editValue = String(next);
			commit({ ...hms, [segment]: next });
			return;
		}

		const input = e.currentTarget as HTMLInputElement;

		if (e.key === 'ArrowRight' && segment !== 's' && input.selectionStart === input.value.length) {
			e.preventDefault();
			(segment === 'h' ? mEl : sEl)?.focus();
		}
		if (e.key === 'ArrowLeft' && segment !== 'h' && input.selectionStart === 0) {
			e.preventDefault();
			(segment === 's' ? mEl : hEl)?.focus();
		}
		if (e.key === ':' || e.key === ' ') {
			e.preventDefault();
			if (segment === 'h') mEl?.focus();
			if (segment === 'm') sEl?.focus();
		}
	}

	function clear() {
		editing = null;
		onchange?.(0);
	}
</script>

<div
	class="border-input focus-within:ring-ring/50 focus-within:border-ring flex h-9 w-full justify-end items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] {disabled
		? 'pointer-events-none opacity-50'
		: ''}"
>
	<div class="flex items-baseline gap-0.5">
		<input
			bind:this={hEl}
			class="w-6 bg-transparent text-right tabular-nums outline-none"
			value={editing === 'h' ? editValue : String(hms.h)}
			onfocus={(e) => startEdit(e, 'h')}
			onblur={() => stopEdit('h')}
			oninput={(e) => handleInput(e, 'h')}
			onkeydown={(e) => handleKeydown(e, 'h')}
			{disabled}
			placeholder="0"
			inputmode="numeric"
			type="text"
			aria-label="Hours"
		/>
		<span class="text-muted-foreground text-xs">h</span>
	</div>

	<span class="text-muted-foreground">:</span>

	<div class="flex items-baseline gap-0.5">
		<input
			bind:this={mEl}
			class="w-5 bg-transparent text-right tabular-nums outline-none"
			value={editing === 'm' ? editValue : pad(hms.m)}
			onfocus={(e) => startEdit(e, 'm')}
			onblur={() => stopEdit('m')}
			oninput={(e) => handleInput(e, 'm')}
			onkeydown={(e) => handleKeydown(e, 'm')}
			{disabled}
			placeholder="00"
			inputmode="numeric"
			type="text"
			aria-label="Minutes"
		/>
		<span class="text-muted-foreground text-xs">m</span>
	</div>

	<span class="text-muted-foreground">:</span>

	<div class="flex items-baseline gap-0.5">
		<input
			bind:this={sEl}
			class="w-5 bg-transparent text-right tabular-nums outline-none"
			value={editing === 's' ? editValue : pad(hms.s)}
			onfocus={(e) => startEdit(e, 's')}
			onblur={() => stopEdit('s')}
			oninput={(e) => handleInput(e, 's')}
			onkeydown={(e) => handleKeydown(e, 's')}
			{disabled}
			placeholder="00"
			inputmode="numeric"
			type="text"
			aria-label="Seconds"
		/>
		<span class="text-muted-foreground text-xs">s</span>
	</div>

	{#if !isEmpty}
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground hover:bg-accent ml-0.5 flex size-5 items-center justify-center rounded-sm"
			onclick={clear}
			{disabled}
			aria-label="Clear duration"
			tabindex="-1"
		>
			<IconX class="size-3" />
		</button>
	{/if}
</div>
