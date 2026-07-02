<script lang="ts">
	import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/svelte';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { textfit } from 'svelte-textfit';
	import IconLockOpen from 'phosphor-icons-svelte/IconLockOpenRegular.svelte';
	import IconLock from 'phosphor-icons-svelte/IconLockRegular.svelte';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconRobot from '$lib/icons/robot.svelte';
	import IconRobotClosedEyes from '$lib/icons/robot-closed-eyes.svelte';

	import { activeFile, debugMode } from '$lib/activeFile.svelte';
	import { Button } from '@coral-os/component-library/components/ui/button/index.js';
	import { keys } from '$lib/keyHandler.svelte';

	const isShiftPressed = $derived(keys.has('Shift'));

	let parent: any = $state();

	let { data, id, positionAbsoluteX, positionAbsoluteY, dragging }: NodeProps = $props();

	const initials = $derived.by(() => {
		if (!data.type) return '';
		const type = data.type as string;
		const words = type.split('-');
		if (words.length === 1) {
			return words[0]?.slice(0, 2).toUpperCase();
		} else {
			return words
				.map((word) => word[0])
				.join('')
				.slice(0, 2)
				.toUpperCase();
		}
	});
</script>

<div
	class="handle-container flyIn {data.viewOnly
		? 'cursor-pointer'
		: ''}  bg-secondary text-card-foreground relative flex h-35 w-35 flex-col items-center justify-center gap-0 rounded-full outline-4 {data.selected &&
	!data.viewOnly
		? 'outline-brand-primary'
		: 'outline-accent'} "
>
	<div
		bind:this={parent}
		style:--delay="100ms"
		class="flex h-2/3 w-2/3 flex-col items-center justify-center text-center {data.selected
			? 'text-card-foreground'
			: 'text-muted-foreground'}"
	>
		{#if !data.alert}
			<IconRobot class="h-3/5 w-3/5" />
		{:else}
			<IconRobotClosedEyes class="animation-duration-500 h-3/5 w-3/5 animate-bounce " />
		{/if}
		<span use:textfit={{ parent, mode: 'single', max: 10 }}>{data.label}</span>
		<span
			use:textfit={{ parent, mode: 'single', max: 10 }}
			class="text-foreground/20 text-xs transition">{data.type}</span
		>
	</div>
	{#if dragging && isShiftPressed}
		<div
			class=" flyIn absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full text-center opacity-0 dark:bg-[var(--xy-background-color-default)]"
		>
			{#if data.locked}
				<IconLockOpen class="h-5 w-5" />
			{:else}
				<IconLock class="h-5 w-5" />
			{/if}
		</div>
	{/if}
	{#if debugMode.current === true}
		{positionAbsoluteX}
		{positionAbsoluteY}
		{#if data.selected}
			<NodeToolbar class="mb-8 bg-[var(--xy-background-color-default)] p-2 ">
				{#each Object.entries(data) as [key, dataItem]}
					<div class="flex flex-row justify-between gap-5 border-b">
						<strong>{key}:</strong>
						{dataItem}
					</div>
				{/each}
				<div class="flex flex-row justify-between gap-5 border-b">
					<strong>dragging:</strong>
					{dragging}
				</div>
				<div class="flex flex-row justify-between gap-5 border-b">
					<strong>id:</strong>
					{id}
				</div>
				<div class="flex flex-row justify-between gap-5 border-b">
					<strong>shift key:</strong>
					{isShiftPressed}
				</div>
			</NodeToolbar>
		{/if}
	{/if}
	{#if data.alert}
		<Tooltip.Root>
			<Tooltip.Trigger class="absolute top-0 right-0"
				><div
					class="flyIn
						bg-destructive/80 border-destructive
						 flex h-8 w-8 items-center justify-center rounded-full border-4 text-center"
				>
					!
				</div></Tooltip.Trigger
			>
			<Tooltip.Content>{data.errors ?? 'error displaying error'}</Tooltip.Content>
		</Tooltip.Root>
	{/if}

	{#if data.selected || data.locked}
		{#if !dragging || !isShiftPressed}
			<Tooltip.Root>
				<Tooltip.Trigger
					class="group absolute top-0 left-0 "
					data-locked={data.locked}
					data-selected={data.selected}
					onclick={() => {
						if (data.selected) {
							activeFile.updateAgent(id, {
								nodeData: {
									position: { x: positionAbsoluteX, y: positionAbsoluteY },
									locked: !data.locked
								}
							});
						}
					}}
				>
					<div
						class=" {data.selected
							? 'bg-secondary  '
							: 'text-muted-foreground/70 bg-white dark:bg-[var(--xy-background-color-default)] '}  flyIn flex h-8 w-8 items-center justify-center rounded-full text-center"
					>
						{#if data.locked}
							<IconLock class="h-5 w-5" />
						{:else}
							<IconLockOpen class="h-5 w-5" />
						{/if}
					</div>
					<div
						class=" flyIn flexitems-center justify-center rounded-full text-center transition-opacity hover:opacity-100"
					></div>
				</Tooltip.Trigger>
				<Tooltip.Content class={data.selected ? 'opacity-100' : 'opacity-0'}
					>{data.locked ? 'Unlock position' : 'Lock position'}</Tooltip.Content
				>
			</Tooltip.Root>
		{/if}
	{/if}
	<Handle type="source" position={Position.Bottom} class="pointer-events-none" />
</div>

<style>
	.handle-container > :global(.svelte-flow__handle) {
		margin: auto;
		position: absolute;
		top: 50%;
		bottom: 50%;
		transform: translateY(-50%);
		opacity: 0;
		pointer-events: none;
	}

	:global(.svelte-flow__node) {
		border-radius: 100%;
		cursor: pointer !important;
	}

	:global(.svelte-flow__node.dragging) {
		cursor: grabbing !important;
	}

	@media (prefers-reduced-motion: no-preference) {
		.flyIn {
			--delay: 0s;
			transition-property: opacity, transform;
			transition-duration: 0.2s;
			transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 2);
			opacity: 1;
			transform: scale(1);
			transition-delay: var(--delay, 0s);

			@starting-style {
				opacity: 0;
				transform: scale(0.8);
			}
		}
	}
</style>
