<script lang="ts">
	import type { FormSchema } from '../../routes/(app)/workbench/schemas';
	import z from 'zod';

	import { VisSingleContainer, VisGraph } from '@unovis/svelte';
	import { idAsKey } from '$lib/threads';
	import { Graph, type GraphNode } from '@unovis/ts';
	import { untrack } from 'svelte';

	type Id = z.infer<FormSchema>['agents'][number]['id'];
	let {
		agents,
		groups,
		selectedAgent = $bindable(undefined),
		onSelect,
		options
	}: {
		agents: z.infer<FormSchema>['agents'];
		groups: z.infer<FormSchema>['groups'];
		selectedAgent?: number | null;
		onSelect?: (idx: number) => void;
		options?: {};
	} = $props();

	type NodeDatum = {
		id?: string;
	};

	type LinkDatum = {
		id?: string;
		source: number | string | NodeDatum;
		target: number | string | NodeDatum;
	};
	type GraphData = {
		nodes: NodeDatum[];
		links: LinkDatum[];
	};

	const notNull = <T,>(x: T | null): x is T => x !== null; // i hate typescript
	const edgesFromGroups = (groups: string[][]): LinkDatum[] => {
		const seen = new Set<string>();
		return groups.flatMap((group) =>
			group
				.flatMap((a, i) =>
					group.slice(i + 1).map((b) => {
						const key = [a, b].sort().join('|');
						if (seen.has(key)) return null;
						seen.add(key);
						return { source: a, target: b };
					})
				)
				.filter(notNull)
		);
	};

	let reactiveHack = $state(false);
	let data: GraphData = $derived.by(() => {
		let g = reactiveHack ? groups.concat([]) : groups;
		return {
			nodes: agents.map((agent) => ({ id: agent.name })),
			links: edgesFromGroups(g)
		};
	});

	const nodeLabel = (n: NodeDatum, i: number) => agents[i]?.name;
	const nodeSubLabel = (n: NodeDatum, i: number) => agents[i]?.id.name;

	const linkStyle = 'GraphLinkStyle.Dashed';

	let selectedNodeId = $derived(
		selectedAgent !== null && selectedAgent !== undefined ? agents[selectedAgent]?.name : undefined
	);
	$effect(() => {
		selectedNodeId;
		reactiveHack = !untrack(() => reactiveHack);
	});

	let graphRef = $state();
	const events = {
		[Graph.selectors.node]: {
			click: (d: GraphNode) => {
				selectedAgent = d._index;
				console.log(d._index);
				onSelect?.(d._index);
				// Set the selected node id here, e.g.: config.selectedNodeId = d.id
				// and trigger the component update if required by your UI framework
			}
		}
	};
</script>

<VisSingleContainer {data} class="graph-theme-dark size-full">
	<VisGraph
		bind:this={graphRef}
		{nodeLabel}
		{nodeSubLabel}
		{events}
		{selectedNodeId}
		disableBrush={true}
		layoutNonConnectedAside={false}
		layoutType="force"
		layoutInitialIterations={300}
		layoutStatic={false}
		linkStrength={1}
		linkDistance={120}
		nodeCharge={-1000}
		collisionRadius={55}
		nodeSpacing={20}
		{linkStyle}
		linkCurvature={0.15}
		linkNeighborSpacing={95}
		zoomScaleExtent={[0.25, 1.5]}
		nodeLabelPosition="bottom"
		nodeLabelVerticalOffset={12}
		nodeSubLabelVerticalOffset={24}
		nodeSize={50}
		nodeStrokeWidth={0}
		{...options}
	/>
</VisSingleContainer>

<!-- for some reason the above css ONLY WORKS as a global, and ONLY WORKS when in this file, not in app.css -->

<style>
	:global(.graph-theme-dark) {
		--vis-graph-node-label-background: #151923;
		--vis-graph-node-label-text-color: #e6e9f0;
		--vis-graph-node-sublabel-text-color: #9aa0b3;

		--vis-dark-graph-node-label-background: #1b2030;
		--vis-dark-graph-node-label-text-color: #f2f4f8;
		--vis-dark-graph-node-sublabel-text-color: #8f95a8;
	}
</style>
