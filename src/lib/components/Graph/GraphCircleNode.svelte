<script lang="ts">
	import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/svelte';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { textfit } from 'svelte-textfit';
	import IconLockOpen from 'phosphor-icons-svelte/IconLockOpenRegular.svelte';
	import IconLock from 'phosphor-icons-svelte/IconLockRegular.svelte';
	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconRobot from '$lib/icons/robot.svelte';
	import IconRobotClosedEyes from '$lib/icons/robot-closed-eyes.svelte';

	import { Button } from '@coral-os/component-library/components/ui/button/index.js';
	import { keys } from '$lib/keyHandler.svelte';
	import { debugMode } from '$lib/debugMode.svelte';

	const isShiftPressed = $derived(keys.has('Shift'));

	let parent: any = $state();

	let { data, id, positionAbsoluteX, positionAbsoluteY, dragging, selected }: NodeProps = $props();
</script>

<div class="ring-wrapper group relative h-30 w-30 rounded-full transition-all">
	<div
		class="handle-container border-foreground/10 flyIn hover:border-brand-primary/50 relative flex h-full w-full flex-col items-center
	justify-center rounded-full border
	bg-white
text-[oklch(0.72_0.18_44.59)]
	transition-all
	dark:bg-[var(--xy-background-color-default)]
	{selected && !data.selected && !dragging ? 'border-foreground!' : ''}
	{data.selected ? 'border-brand-primary!' : ''}"
	>
		<div
			bind:this={parent}
			class="flex w-full flex-col items-center justify-center gap-1 px-2 text-center"
		>
			{#if !data.alert}
				<IconRobot class="h-12 w-12 transition-opacity group-hover:opacity-100" />
			{:else}
				<IconRobotClosedEyes class="h-12 w-12 animate-pulse" />
			{/if}

			<span
				class="text-foreground/90 line-clamp-1.5 text-sm leading-tight font-medium tracking-wide wrap-anywhere"
				use:textfit={{ parent, mode: 'single', max: 10 }}
			>
				{data.label}
			</span>

			<span
				class="text-foreground/40 text-[10px] tracking-wider uppercase"
				use:textfit={{
					parent,
					mode: 'single',
					max: 9,
					min: 8,
					autoResize: true
				}}
			>
				{data.type}
			</span>
		</div>
		{#if dragging && isShiftPressed}
			<div
				class="flyIn absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-center dark:bg-[var(--xy-background-color-default)]"
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
		{#if (data.errors as any)?.agent?.[id]}
			<Tooltip.Root>
				<Tooltip.Trigger class="absolute top-0 right-0"
					><div
						class="flyIn
							bg-destructive border-destructive text-foreground
							 flex h-8 w-8 items-center justify-center rounded-full border-1 text-center text-xl transition-transform hover:scale-105"
					>
						!
					</div></Tooltip.Trigger
				>
				<Tooltip.Content>Agent settings invalid</Tooltip.Content>
			</Tooltip.Root>
		{/if}

		{#if data.selected || data.locked}
			{#if !dragging || !isShiftPressed}
				<Tooltip.Root>
					<Tooltip.Trigger
						class="group absolute top-0 left-0 z-10"
						data-locked={data.locked}
						data-selected={data.selected}
						onclick={() => {
							if (data.selected && typeof data.onToggleLock === 'function') {
								data.onToggleLock(id, { x: positionAbsoluteX, y: positionAbsoluteY }, data.locked);
							}
						}}
					>
						<div
							class="{data.selected
								? 'bg-secondary'
								: 'text-muted-foreground/70 bg-white dark:bg-[var(--xy-background-color-default)]'} flyIn flex h-8 w-8 items-center justify-center rounded-full text-center"
						>
							{#if data.locked}
								<IconLock class="h-5 w-5" />
							{:else}
								<IconLockOpen class="h-5 w-5" />
							{/if}
						</div>
					</Tooltip.Trigger>
					<Tooltip.Content class={data.selected ? 'opacity-100' : 'opacity-0'}
						>{data.locked ? 'Unlock position' : 'Lock position'}</Tooltip.Content
					>
				</Tooltip.Root>
			{/if}
		{/if}
		<Handle type="source" position={Position.Bottom} class="pointer-events-none" />
	</div>
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

	.handle-container {
		transition:
			transform 0.18s,
			box-shadow 0.18s;
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
