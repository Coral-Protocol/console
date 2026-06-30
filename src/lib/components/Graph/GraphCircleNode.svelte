<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { textfit } from 'svelte-textfit';
	let parent: any = $state();

	let { data, selected }: NodeProps = $props();
</script>

<div class="handle-container {data.viewOnly ? 'cursor-pointer' : ''}">
	<div
		bind:this={parent}
		class="bg-card text-card-foreground @container relative flex h-32 w-32 items-center justify-center rounded-full border-4 {selected &&
		!data.viewOnly
			? 'border-brand-primary/80'
			: 'border-border'} "
	>
		{#key data.label}
			<span class="m-2 p-4 text-center text-xs" use:textfit={{ parent, mode: 'multi', max: 25 }}
				>{data.label}
			</span>
		{/key}
	</div>
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
		z-index: 1001 !important;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.466);
		border-radius: 100%;
	}
</style>
