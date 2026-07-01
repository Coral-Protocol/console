<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { textfit } from 'svelte-textfit';
	import IconLockOpen from 'phosphor-icons-svelte/IconLockOpenRegular.svelte';
	import IconLock from 'phosphor-icons-svelte/IconLockRegular.svelte';

	import { activeFile } from '$lib/activeFile.svelte';
	let parent: any = $state();

	let { data, id, positionAbsoluteX, positionAbsoluteY }: NodeProps = $props();
</script>

<div class="handle-container flyIn {data.viewOnly ? 'cursor-pointer' : ''}">
	<div
		bind:this={parent}
		style:--delay="100ms"
		class=" bg-card text-card-foreground @container relative flex h-32 w-32 items-center justify-center rounded-full outline-4 {data.selected &&
		!data.viewOnly
			? 'outline-brand-primary/80'
			: 'outline-border'} "
	>
		{#key data.label}
			<span class="m-2 p-4 text-center text-xs" use:textfit={{ parent, mode: 'multi', max: 25 }}
				>{data.label}
			</span>
		{/key}
	</div>
	{#if data.alert}
		<Tooltip.Root>
			<Tooltip.Trigger class="absolute top-0 right-0"
				><div
					class="bg-destructive/80 border-destructive flex h-6 w-6 items-center justify-center rounded-full border-4 text-center"
				>
					!
				</div></Tooltip.Trigger
			>
			<Tooltip.Content>{data.errors ?? 'error displaying error'}</Tooltip.Content>
		</Tooltip.Root>
	{/if}
	{#if data.locked}
		<Tooltip.Root>
			<Tooltip.Trigger
				class="absolute top-0 left-0"
				onclick={() => {
					activeFile.updateAgent(id, {
						nodeData: { position: { positionAbsoluteX, positionAbsoluteY }, locked: false }
					});
				}}
				>{#if data.selected}
					<div
						class=" bg-card flex h-8 w-8 items-center justify-center rounded-full border-4 text-center transition-opacity hover:opacity-100"
					>
						<IconLockOpen class="h-4 w-4" />
					</div>
				{:else}
					<div
						class=" flyIn text-foreground/50 m-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--xy-background-color-default)] text-center"
					>
						<IconLock class="h-4 w-4" />
					</div>
				{/if}</Tooltip.Trigger
			>
			<Tooltip.Content>{data.selected ? 'unlock position' : 'position locked'}</Tooltip.Content>
		</Tooltip.Root>
	{/if}
	<Handle type="source" position={Position.Bottom} class="pointer-events-none" />
	<span class="text-muted-foreground absolute bottom-0 w-full translate-y-full text-center text-xs"
		>{data.type}</span
	>
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
