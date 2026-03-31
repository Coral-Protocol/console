<script lang="ts">
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import { cn } from '$lib/utils';
	import type { TabsTriggerProps } from 'bits-ui';
	import type { Component } from 'svelte';

	let {
		class: className,
		icon: Icon,
		invalid = false,
		children,
		...rest
	}: TabsTriggerProps & { icon: Component; invalid?: boolean } = $props();
</script>

<Tabs.Trigger class={cn('group @container flex items-center gap-1 truncate', className)} {...rest}>
	<Icon class={cn('size-6', invalid && 'group-not-data-[state=active]:text-destructive')} />
	<span
		class={cn('hidden @[11ch]:inline', invalid && 'group-not-data-[state=active]:text-destructive')}
	>
		{@render children?.()}
	</span>
</Tabs.Trigger>
