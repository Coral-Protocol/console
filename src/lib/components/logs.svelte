<script lang="ts">
	import type { Logs } from '$lib/logs.svelte';
	import { cn } from '$lib/utils';

	import { useDebounce, watch } from 'runed';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import VList from './VList.svelte';
	import type { Component } from 'svelte';

	import { type VirtualizerHandle } from 'virtua/svelte';

	import IconWarning from 'phosphor-icons-svelte/IconWarningRegular.svelte';
	import IconWarningCircle from 'phosphor-icons-svelte/IconWarningCircleRegular.svelte';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';
	import IconArrowDown from 'phosphor-icons-svelte/IconArrowDownRegular.svelte';
	import IconBug from 'phosphor-icons-svelte/IconBugRegular.svelte';
	import IconPath from 'phosphor-icons-svelte/IconPathRegular.svelte';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { slide } from 'svelte/transition';
	import type { Snapshot } from '@sveltejs/kit';

	let { logs, class: className }: { logs?: Logs | null; class?: string } = $props();
	const ts_fmt = (d: Date) =>
		`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

	const icons: { [K in Logs['logs'][number]['type']]: Component<{ class?: string }> } = {
		error: IconWarning,
		info: IconInfo,
		warning: IconWarningCircle,
		debug: IconBug,
		trace: IconPath
	};

	const typeColors: { [K in Logs['logs'][number]['type']]: string | null } = {
		error: 'text-destructive',
		info: null,
		warning: 'text-orange-400',
		debug: 'text-blue-400',
		trace: 'text-muted-foreground'
	};

	let manualScroll = $state(false);
	let ref: VirtualizerHandle | null = $state(null);

	const scrollToBottom = () => {
		if (!ref) return;
		const scrollTop = ref.getScrollOffset();
		const scrollHeight = ref.getScrollSize();
		const clientHeight = ref.getViewportSize();
		const distFromBottom = scrollHeight - (scrollTop + clientHeight);
		// For better performance, don't smooth scroll if the distance is too far
		ref.scrollToIndex((logs?.logs.length ?? 1) - 1, { smooth: distFromBottom <= 10000 });
	};

	// auto scroll
	watch([() => logs?.logs.length], () => {
		if (manualScroll) return;
		scrollToBottom();
	});

	// automatically enable auto scroll when we are < 5 pixels from scroll bottom,
	// and disable when far enough from bottom
	const onscroll = useDebounce((scrollTop: number) => {
		if (!ref) return;
		// const scrollTop = ref.getScrollOffset();
		const scrollHeight = ref.getScrollSize();
		const clientHeight = ref.getViewportSize();
		const distFromBottom = scrollHeight - (scrollTop + clientHeight);
		// console.log({ distFromBottom });
		if (distFromBottom < 5) {
			manualScroll = false;
		} else if (distFromBottom > 100 || distFromBottom / scrollHeight > 0.1) {
			manualScroll = true;
		}
	}, 15);
</script>

<div class={cn('relative overflow-clip rounded-md border', className)}>
	{#if logs && logs.state === 'connected'}
		{#if manualScroll}
			<div class="absolute right-4 bottom-0 z-10" transition:slide={{ axis: 'y' }}>
				<Button
					size="icon"
					class="mb-4 size-8"
					onclick={() => {
						scrollToBottom();
						manualScroll = false;
					}}
				>
					<span class="sr-only">Scroll to bottom</span><IconArrowDown /></Button
				>
			</div>
		{/if}
		<VList class="bg-sidebar size-full text-sm" bind:this={ref} {onscroll} data={logs?.logs ?? []}>
			{#snippet children(log, i)}
				{@const LogIcon = icons[log.type]}
				<li
					class={cn(
						'grid grid-cols-[max-content_max-content_auto] items-center gap-x-1 px-2 py-1 pr-3',
						'hover:bg-primary/10 rounded-sm ',
						typeColors[log.type],
						i % 2 == 1 && 'bg-background'
					)}
				>
					<Tooltip.Root>
						<Tooltip.Trigger class="pr-1 opacity-40">
							<LogIcon class={cn('opacity-50', typeColors[log.type])} />
						</Tooltip.Trigger>
						<Tooltip.Content><span class="capitalize select-all">{log.type}</span></Tooltip.Content>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger class="pr-1 opacity-40">
							{ts_fmt(log.timestamp)}
						</Tooltip.Trigger>
						<Tooltip.Content
							><span class="select-all"
								>{log.timestamp.toLocaleDateString()}
								{log.timestamp.getHours()}:{log.timestamp
									.getMinutes()
									.toString()
									.padStart(2, '0')}:{log.timestamp
									.getSeconds()
									.toString()
									.padStart(2, '0')}.{log.timestamp
									.getMilliseconds()
									.toString()
									.padStart(3, '0')}</span
							></Tooltip.Content
						>
					</Tooltip.Root>
					<span>{log.text}</span>
				</li>
			{/snippet}
		</VList>
	{/if}
	{#if !logs || logs.state === 'connecting'}
		<div class="flex size-full items-center justify-center">
			<Spinner class="size-10" />
		</div>
	{:else if logs.state === 'closed'}
		<div class="flex size-full items-center justify-center">
			<Card.Root>
				<Card.Header>
					<Card.Title>An error has occurred.</Card.Title>
				</Card.Header>
				<Card.Content>
					<Card.Description
						><p>Connection to agent logs has closed.</p>
						<p>Try reloading the page!</p></Card.Description
					>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
