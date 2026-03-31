<script lang="ts">
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';

	import { cn } from '$lib/utils';

	import type { OptionProps } from '../OptionField.svelte';

	type Props = OptionProps<'bool'>;

	let { meta, value, props }: Props = $props();
</script>

<ButtonGroup.Root {...props} class="m-0 justify-start">
	<Button
		class={cn(($value ?? meta.default) === true && 'bg-accent text-accent-foreground')}
		onclick={() => {
			$value = true;
		}}>True</Button
	>
	<Button
		class={cn(($value ?? meta.default) === false ? 'bg-accent text-accent-foreground' : '')}
		onclick={() => {
			$value = false;
		}}>False</Button
	>
</ButtonGroup.Root>
