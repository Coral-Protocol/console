<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data, selected }: NodeProps = $props();
</script>

<div class="handle-container {data.viewOnly ? 'cursor-pointer' : ''}">
	<div
		class="bg-card text-card-foreground @container relative flex h-16 w-16 items-center justify-center rounded-full border-2 {data.selectedAgent ==
			data.index && !data.viewOnly
			? 'border-brand-primary/80'
			: 'border-border'} "
	>
		<span class="m-2 text-center text-xs">{data.label} </span>
	</div>
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
		z-index: 1001 !important;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.466);
		border-radius: 100%;
	}
</style>
