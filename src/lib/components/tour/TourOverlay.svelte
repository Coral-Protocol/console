<script module lang="ts">
	export type Item = {
		id: string;
		text: string;
		title: string;
		side?: TooltipPrimitive.ContentProps['side'];
	};
</script>

<script lang="ts">
	import { cn } from '@coral-os/component-library/utils.js';

	import IconX from 'phosphor-icons-svelte/IconXRegular.svelte';

	import * as Popover from '@coral-os/component-library/components/ui/popover/index.js';
	import { Button } from '@coral-os/component-library/components/ui/button/index.js';
	import { Tooltip as TooltipPrimitive } from 'bits-ui';
	import { tour } from '$lib/components/tour/tourLib.svelte';

	import { fade } from 'svelte/transition';
	import { PressedKeys } from 'runed';

	let {
		open = $bindable(true),
		items = [],
		side = 'bottom',
		arrowClasses,
		class: className
	}: {
		open?: boolean;
		items: Item[];
		side?: TooltipPrimitive.ContentProps['side'];
		arrowClasses?: string;
		class?: string;
	} = $props();

	let current = $state(0);

	function getOpen() {
		return open;
	}

	function setOpen(newOpen: boolean) {
		open = newOpen;
	}

	const currentItem = $derived(items[current]);

	const currentTarget = $derived(currentItem ? tour.targets.get(currentItem.id) : undefined);
	const scrimStyle = $derived.by(() => {
		if (!currentTarget) return '';

		const rect = currentTarget.getBoundingClientRect();

		const padding = 8;

		const left = rect.left - padding;
		const right = rect.right + padding;
		const top = rect.top - padding;
		const bottom = rect.bottom + padding;

		const { innerHeight, innerWidth } = window;

		return `
		clip-path: polygon(
			0px 0px,
			0px ${innerHeight}px,
			${left}px ${innerHeight}px,
			${left}px ${top}px,
			${right}px ${top}px,
			${right}px ${bottom}px,
			${left}px ${bottom}px,
			${left}px ${innerHeight}px,
			${innerWidth}px ${innerHeight}px,
			${innerWidth}px 0px
		);
	`;
	});

	const keys = new PressedKeys();
	keys.onKeys(['ArrowLeft'], () => {
		if (current <= 0) return;
		current -= 1;
	});
	keys.onKeys(['ArrowRight'], () => {
		if (current + 1 >= items.length) return;
		current += 1;
	});

	$effect(() => {
		if (!open) {
			tour.end();
		}
	});
</script>

<Popover.Root>
	<Popover.Root bind:open={getOpen, setOpen}>
		<Popover.Content
			class="{className} bg-card w-[360px] max-w-[90vw] rounded-lg border-0 lg:w-[420px] dark:bg-[#1E1E23]"
			collisionPadding={20}
			customAnchor={currentTarget}
			side={currentItem?.side ?? side}
			interactOutsideBehavior="ignore"
			sideOffset={8}
		>
			<Popover.Close
				class=" float-right rounded-xs opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
			>
				<IconX />
				<span class="sr-only">Close</span>
			</Popover.Close>
			<h1 class="font-sans">{currentItem?.title ?? 'Tour'}</h1>
			<div class="max-h-[40vh] overflow-y-auto pr-2">
				<p class="text-foreground/80 py-4 text-sm leading-tight whitespace-pre-wrap">
					{currentItem?.text}
				</p>
			</div>
			<footer class="mt-2 flex items-center justify-between">
				<ol class="flex flex-wrap gap-0">
					{#each items as item, i}
						<li>
							<button
								class="group p-1"
								onclick={() => {
									current = i;
								}}
								aria-label="Go to step {i + 1}"
							>
								<div
									class="group-hover:bg-foreground/20 h-1.5 w-1.5 rounded-full transition-colors {i ===
									current
										? 'bg-foreground w-2'
										: 'bg-foreground/10'}"
								></div>
							</button>
						</li>
					{/each}
				</ol>
				<span class="flex gap-2">
					<Button
						variant="outline"
						disabled={current <= 0}
						onclick={() => {
							current -= 1;
						}}>Back</Button
					>
					<Button
						class="w-16"
						onclick={() => {
							if (current + 1 >= items.length) {
								open = false;

								return;
							}
							current += 1;
						}}>{current + 1 >= items.length ? 'Done' : 'Next'}</Button
					>
				</span>
			</footer>
			<Popover.Arrow>
				{#snippet child({ props })}
					<div
						class={cn(
							'z-50 size-3 rotate-45 rounded-[4px] bg-[#1E1E23]',
							'data-[side=top]:translate-x-1/2 data-[side=top]:translate-y-[calc(-50%_+_2px)]',
							'data-[side=bottom]:-translate-x-1/2 data-[side=bottom]:-translate-y-[calc(-50%_+_1px)]',
							'data-[side=right]:translate-x-[calc(50%_+_2px)] data-[side=right]:translate-y-1/2',
							'data-[side=left]:-translate-y-[calc(50%_-_3px)]',
							arrowClasses
						)}
						{...props}
					></div>
				{/snippet}
			</Popover.Arrow>
		</Popover.Content>
		{#if open}
			<div
				transition:fade
				class="fixed inset-0 z-50 bg-black/50 transition-[clip-path]"
				style={scrimStyle}
			></div>
		{/if}
	</Popover.Root>
</Popover.Root>
