<script lang="ts">
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Textarea } from '@coral-os/component-library/ui/textarea/index.js';
	import { cn } from '$lib/utils';

	import type { OptionProps } from '../OptionField.svelte';

	type Props = OptionProps<'string' | 'secret'>;

	let { meta, value, props, errors }: Props = $props();
	let isSecret = $derived(meta.type === 'secret' ? true : meta.secret);
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
		type={isSecret ? 'password' : 'string'}
		bind:value={$value}
		class="m-0 w-full"
		defaultValue={meta.default}
		aria-invalid={errors.length > 0}
	/>
{/if}
