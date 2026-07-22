<script lang="ts">
	import { BaseEdge, type EdgeProps } from '@xyflow/svelte';

	let { sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();

	const SPACING = 14;

	const path = $derived.by(() => {
		const offsetIndex = (data?.offsetIndex as number) ?? 0;
		if (offsetIndex === 0) {
			return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
		}

		const dx = targetX - sourceX;
		const dy = targetY - sourceY;
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;

		const midX = (sourceX + targetX) / 2 + px * offsetIndex * SPACING;
		const midY = (sourceY + targetY) / 2 + py * offsetIndex * SPACING;

		return `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;
	});
</script>

<BaseEdge {path} style={`stroke: ${data?.color ?? '#999'}`} />
