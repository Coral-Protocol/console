<script lang="ts">
	import {
		BaseEdge,
		getStraightPath,
		type EdgeProps,
		type StraightEdgeProps
	} from '@xyflow/svelte';

	let {
		id,
		label,
		labelStyle,
		style,
		markerStart,
		markerEnd,
		interactionWidth,
		sourceX,
		sourceY,
		targetX,
		targetY,
	}: StraightEdgeProps = $props();

	let [path, labelX, labelY] = $derived(
		getStraightPath({
			sourceX,
			sourceY,
			targetX,
			targetY
		})
	);
</script>

<BaseEdge
	{id}
	{path}
	{labelX}
	{labelY}
	{label}
	{labelStyle}
	{markerStart}
	{markerEnd}
	{interactionWidth}
	{style}
/>
