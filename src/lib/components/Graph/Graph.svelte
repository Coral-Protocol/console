<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		SvelteFlow,
		Background,
		Panel,
		useSvelteFlow,
		type Node,
		type Edge,
		ConnectionMode
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { mode } from 'mode-watcher';
	import type { FormSchema } from '../../sessionSchema';
	import z from 'zod';
	import GraphCircleNode from './GraphCircleNode.svelte';

	import * as d3Force from 'd3-force';
	import type { SessionAgentState } from '$lib/session.svelte';
	import { cn } from '$lib/utils';

	import {
		Button,
		buttonVariants
	} from '@coral-os/component-library/components/ui/button/index.js';
	import * as Tooltip from '@coral-os/component-library/components/ui/tooltip/index.js';

	import IconSelection from 'phosphor-icons-svelte/IconSelectionFill.svelte';
	import IconPlay from 'phosphor-icons-svelte/IconPlayFill.svelte';
	import IconPause from 'phosphor-icons-svelte/IconPauseFill.svelte';
	import * as Command from '@coral-os/component-library/ui/command/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';

	const nodeTypes = {
		circleNode: GraphCircleNode
	};
	type SimNode = d3Force.SimulationNodeDatum & {
		id: string;
		x: number;
		y: number;
		fx?: number;
		fy?: number;
	};

	type DraggingNode = { id: string; position: { x: number; y: number } };

	let {
		class: className,
		agents,
		groups,
		selectedAgent = $bindable(undefined),
		onSelect,
		id,
		controls = false,
		viewOnly = false,
		fitDefault = true,
		enableContext = false
	}: {
		class?: string;
		agents: z.infer<FormSchema>['agents'] | SessionAgentState[];
		groups: z.infer<FormSchema>['groups'];
		selectedAgent?: number | null;
		onSelect?: (idx: number) => void;
		id?: string;
		controls?: boolean;
		viewOnly?: boolean;
		fitDefault?: boolean;
		enableContext?: boolean;
	} = $props();

	type AgentNode = Node<{ label: string }>;
	type GroupEdge = Edge;

	type GraphData = {
		nodes: AgentNode[];
		edges: GroupEdge[];
	};

	const notNull = <T,>(x: T | null): x is T => x !== null;

	const edgesFromGroups = (groupList: string[][]): GroupEdge[] => {
		const seen = new Set<string>();
		return groupList.flatMap((group, groupIndex) =>
			group
				.flatMap((a, i) =>
					group.slice(i + 1).map((b) => {
						const key = [a, b].sort().join('|');
						if (seen.has(key)) return null;
						seen.add(key);
						return {
							id: key,
							source: a,
							target: b,
							type: 'straight',
							style: `stroke: oklch(0.7 0.1 ${53 * groupIndex})`
						} satisfies GroupEdge;
					})
				)
				.filter(notNull)
		);
	};

	let data: GraphData = $derived.by(() => ({
		nodes: agents.map((agent, index) => ({
			id: agent.name,
			position: { x: !viewOnly ? 0 : 0 + index * 100, y: !viewOnly ? 0 : 0 + index * 20 },
			data: { label: agent.name, viewOnly: viewOnly, selectedAgent: selectedAgent, index: index },
			type: 'circleNode',
			selectable: false,
			selected: false,
			draggable: !viewOnly
		})),
		edges: edgesFromGroups(groups)
	}));

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	$effect(() => {
		nodes = structuredClone(data.nodes);
		edges = structuredClone(data.edges);
	});

	let simulation: d3Force.Simulation<d3Force.SimulationNodeDatum, undefined>;
	let running = $state.raw(false);
	let initialized = $state.raw(false);
	let draggingNode = $state.raw<DraggingNode | null>(null);

	const { fitView } = useSvelteFlow();

	onMount(() => {
		simulation = d3Force
			.forceSimulation()
			.force('charge', d3Force.forceManyBody().strength(-800))
			.force('x', d3Force.forceX().x(0).strength(0.1))
			.force('y', d3Force.forceY().y(0).strength(0.1))
			.force('collide', d3Force.forceCollide().radius(32))
			.alphaTarget(0.05)
			.stop();

		return () => {
			if (simulation) simulation.stop();
		};
	});

	onDestroy(() => {
		if (simulation) simulation.stop();
	});

	function initializeSimulation() {
		if (!simulation || !initialized || nodes.length === 0) return;

		const simNodes = nodes.map((node) => ({
			...node,
			x: node.position.x,
			y: node.position.y,
			measured: {
				width: node.width ?? 32,
				height: node.height ?? 32
			}
		})) as SimNode[];

		const simEdges = edges.map((edge) => ({
			...edge,
			source: edge.source,
			target: edge.target
		}));

		simulation.nodes(simNodes);
		simulation.force(
			'link',
			d3Force
				.forceLink(simEdges)
				.id((d) => (d as { id: string }).id)
				.strength(0.05)
				.distance(100)
		);
	}

	function tick() {
		if (!running) return;

		const simNodes = simulation.nodes() as SimNode[];

		simNodes.forEach((node) => {
			const dragging = draggingNode?.id === node.id;
			if (dragging && draggingNode) {
				node.fx = draggingNode.position.x;
				node.fy = draggingNode.position.y;
			} else {
				delete node.fx;
				delete node.fy;
			}
		});

		simulation.tick();

		nodes = simNodes.map((simNode) => {
			const originalNode = nodes.find((n) => n.id === simNode.id) ?? {};
			return {
				...originalNode,
				position: {
					x: simNode.fx ?? simNode.x ?? 0,
					y: simNode.fy ?? simNode.y ?? 0
				}
			};
		}) as Node[];

		window.requestAnimationFrame(() => {
			if (fitDefault) {
				fitView();
			}
			if (running) tick();
		});
	}

	$effect(() => {
		if (!initialized && nodes.length > 0 && !viewOnly) {
			initialized = true;
			initializeSimulation();
			running = true;
			requestAnimationFrame(tick);
		}
	});

	$effect(() => {
		if (!initialized || !simulation) return;

		const simNodes = simulation.nodes();
		const existing = new Set(simNodes.map((n) => (n as { id: string }).id));
		const added = nodes.filter((n) => !existing.has(n.id));

		if (added.length === 0) return;

		for (const n of added) {
			simNodes.push({
				...n,
				x: n.position.x,
				y: n.position.y
			} as d3Force.SimulationNodeDatum);
		}

		simulation.nodes(simNodes);
		simulation.alphaTarget(0.15).restart();
	});

	function toggleLayout() {
		if (!running) {
			initializeSimulation();
			running = true;
			window.requestAnimationFrame(tick);
		} else {
			running = false;
		}
	}

	function handleNodeDragStart({ targetNode }: { targetNode: Node | null }) {
		if (targetNode) draggingNode = { id: targetNode.id, position: targetNode.position };
	}

	function handleNodeDrag({ targetNode }: { targetNode: Node | null }) {
		if (targetNode) draggingNode = { id: targetNode.id, position: targetNode.position };
	}

	function handleNodeDragStop() {
		draggingNode = null;
	}

	function handleContextMenu({ event }: { event: MouseEvent }) {
		if (!enableContext) return;
		event.preventDefault();
		openPaneContext = !openPaneContext;
		if (!openPaneContext) return;
		contextPos = {
			x: event.clientX,
			y: event.clientY
		};
	}

	let contextPos = $state({ x: 0, y: 0 });
	let openPaneContext = $state(false);
	let customAnchor = $state<HTMLElement>(null!);
</script>

<SvelteFlow
	bind:nodes
	bind:edges
	{nodeTypes}
	class={cn('[&_.svelte-flow__edge-wrapper]:z-10!', className)}
	fitView
	onpanecontextmenu={handleContextMenu}
	onnodedragstart={handleNodeDragStart}
	onnodedrag={handleNodeDrag}
	edgesFocusable={false}
	panOnDrag={[1]}
	onnodedragstop={handleNodeDragStop}
	defaultEdgeOptions={{ selectable: false, focusable: false }}
	onnodeclick={(e) => {
		const node = e.node;
		const index = agents.findIndex((a) => a.name === node.id);
		if (index !== -1) {
			selectedAgent = index;
			onSelect?.(index);
		}
	}}
	autoPanOnNodeDrag={false}
	selectNodesOnDrag={false}
	onedgeclick={() => {
		selectedAgent = null;
	}}
	connectionMode={'loose' as ConnectionMode}
	colorMode={mode.current}
	proOptions={{
		hideAttribution: true
	}}
>
	{#if controls && nodes.length > 0}
		<Panel position="top-right" class="flex gap-4">
			<Tooltip.Root>
				<Tooltip.Trigger
					onclick={() => fitView()}
					class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
					><IconSelection /></Tooltip.Trigger
				>
				<Tooltip.Content>
					<p>Fit all in view</p>
				</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger
					onclick={toggleLayout}
					class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
					>{#if running}<IconPause />{:else}<IconPlay />{/if}</Tooltip.Trigger
				>
				<Tooltip.Content>
					<p>{running ? 'Stop simulating' : 'Start simulating'}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</Panel>
	{/if}
	<div
		style="position: fixed; left: {contextPos.x}px !important; top: {contextPos.y}px !important;"
		bind:this={customAnchor}
	></div>
	{#if enableContext}
		<Popover.Root bind:open={openPaneContext}>
			<Popover.Content align="start" sideOffset={1} {customAnchor} class="p-0">
				<Command.Root>
					<Command.Input placeholder="Type a command or search..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Group heading="Suggestions">
							<Command.Item>Add agent</Command.Item>
							<Command.Item>Select agent</Command.Item>
							<Command.Item>Remove agent</Command.Item>
						</Command.Group>
						<Command.Separator />
						<Command.Group heading="Settings">
							<Command.Item>Profile</Command.Item>
							<Command.Item>Billing</Command.Item>
							<Command.Item>Settings</Command.Item>
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{/if}

	<Background {id} />
</SvelteFlow>
