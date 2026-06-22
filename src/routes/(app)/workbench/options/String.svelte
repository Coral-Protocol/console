<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';
	import { cn } from '$lib/utils';

	import type { OptionProps } from '../OptionField.svelte';
	import { onMount } from 'svelte';

	type Props = OptionProps<'string'>;

	let readonly = $state(true);

	let { meta, value, props, errors, name }: Props = $props();
</script>

{#if meta.display?.multiline === true}
	<Textarea
		{...props}
		class={cn('relative m-0 resize-y', !!meta.default && 'h-30')}
		bind:value={$value}
		defaultValue={meta.default}
		aria-invalid={errors.length > 0}
	/>
{:else}
	<Input
		{...props}
		type={meta.secret ? 'password' : 'string'}
		bind:value={$value}
		class="m-0 w-full"
		defaultValue={meta.default}
		aria-invalid={errors.length > 0}
		autocomplete={meta.secret ? `section-${name} one-time-code` : undefined}
		data-1p-ignore={meta.secret ? 'true' : undefined}
		spellcheck={meta.secret ? 'false' : undefined}
		{readonly}
		onfocus={() => (readonly = false)}
		onblur={() => (readonly = true)}
	/>
{/if}
