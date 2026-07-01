<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import {
		SvelteFlow,
		Background,
		Panel,
		useSvelteFlow,
		type Node,
		type Edge,
		ConnectionMode,
		useOnSelectionChange,
		type NodeEventWithPointer,
		type PaneEvents
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { mode } from 'mode-watcher';
	import type { FormSchema } from '../../sessionSchema';
	import z, { json } from 'zod';
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
	import { getSessionContext, type SessionCreatorContext } from '$lib/sessionCreatorContext';
	import { useDnD } from '$lib/components/DndProvider.svelte';
	import { activeFile } from '../../activeFile.svelte';
	const { setCenter, screenToFlowPosition } = useSvelteFlow();

	// consume-once map: clientId -> spawn position
	const pendingPositions = new Map<string, { x: number; y: number }>();
	let contextFlowPosition: { x: number; y: number } | null = null;

	let sessCtx = getSessionContext();
	let ctx = appContext.get();

	useOnSelectionChange(({ nodes, edges }) => {
		sessCtx.selectedAgentClientId = nodes[0]?.id;
	});
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
		onSelect,
		id,
		controls = false,
		viewOnly = false,
		fitDefault = true,
		enableContext = false
	}: {
		class?: string;
		onSelect?: (idx: number) => void;
		id?: string;
		controls?: boolean;
		viewOnly?: boolean;
		fitDefault?: boolean;
		enableContext?: boolean;
	} = $props();

	import { type Agent, type Group } from '$lib/fileStorage';
	import { randomAdjective, randomAnimal, randomPlant } from '$lib/words';
	import { appContext } from '$lib/context';
	import { add } from 'date-fns';
	import { PressedKeys } from 'runed';

	const agents = $derived(activeFile.current?.agents ?? []);
	const groups = $derived(activeFile.current?.groups ?? []);

	type AgentNode = Node<{ label: string; type: string; index: number }>;
	type GroupEdge = Edge;

	type GraphData = {
		nodes: AgentNode[];
		edges: GroupEdge[];
	};

	const notNull = <T,>(x: T | null): x is T => x !== null;

	const edgesFromGroups = (groupList: Group[]): GroupEdge[] => {
		const seen = new Set<string>();
		return groupList.flatMap((group, groupIndex) => {
			const members = group.agentClientIds;
			return members
				.flatMap((a, i) =>
					members.slice(i + 1).map((b) => {
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
				.filter(notNull);
		});
	};

	let data: GraphData = $derived.by(() => {
		const nodes: AgentNode[] = agents.map((agent, index) => {
			let position: { x: number; y: number };
			const pending = pendingPositions.get(agent.clientId);
			if (pending) {
				position = pending;
				pendingPositions.delete(agent.clientId); // consume once
			} else {
				position = viewOnly
					? { x: index * 120, y: index * 60 }
					: {
							x: Math.cos(index * 2.4) * (40 + index * 6),
							y: Math.sin(index * 2.4) * (40 + index * 6)
						};
			}

			return {
				id: agent.clientId,
				position,
				data: { label: agent.name, type: agent.id.name, viewOnly, index },
				type: 'circleNode',
				draggable: !viewOnly,
				selected: agent.clientId === sessCtx.selectedAgentClientId
			};
		});

		const edges = edgesFromGroups(groups);
		return { nodes, edges };
	});

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	const safeNodes = (nodes: Node[]) =>
		nodes.filter((n) => typeof n.id === 'string' && n.id.trim().length > 0);

	$effect(() => {
		const fresh = structuredClone(safeNodes(data.nodes));

		const prevNodes = untrack(() => nodes);
		nodes = fresh.map((n) => {
			const existing = prevNodes.find((prev) => prev.id === n.id);
			return existing ? { ...n, position: existing.position } : n;
		});
		edges = structuredClone(data.edges);
	});

	let simulation: d3Force.Simulation<d3Force.SimulationNodeDatum, undefined>;
	let running = $state.raw(false);
	let initialized = $state.raw(false);
	let draggingNode = $state.raw<DraggingNode | null>(null);
	let lockedNodeIds = $state.raw(new Set<string>());

	const { fitView } = useSvelteFlow();

	const ALPHA_SETTLE_THRESHOLD = 0.001;
	let cooldownFrame: number | null = null;

	onMount(() => {
		simulation = d3Force
			.forceSimulation()
			.force('charge', d3Force.forceManyBody().strength(-800))
			.force('x', d3Force.forceX().x(0).strength(0.1))
			.force('y', d3Force.forceY().y(0).strength(0.1))
			.force('collide', d3Force.forceCollide().radius(82 + 12))
			.alphaTarget(0)
			.stop();

		return () => {
			if (simulation) simulation.stop();
			if (cooldownFrame !== null) cancelAnimationFrame(cooldownFrame);
		};
	});

	onDestroy(() => {
		if (simulation) simulation.stop();
		if (cooldownFrame !== null) cancelAnimationFrame(cooldownFrame);
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
			const locked = lockedNodeIds.has(node.id);

			if (dragging && draggingNode) {
				node.fx = draggingNode.position.x;
				node.fy = draggingNode.position.y;
			} else if (locked) {
			} else {
				delete node.fx;
				delete node.fy;
			}
		});

		simulation.tick();

		nodes = simNodes
			.map((simNode) => {
				const originalNode = nodes.find((n) => n.id === simNode.id);

				if (!originalNode) return null;
				return {
					...originalNode,
					position: {
						x: simNode.fx ?? simNode.x ?? 0,
						y: simNode.fy ?? simNode.y ?? 0
					}
				};
			})
			.filter((n): n is Node => n !== null);

		window.requestAnimationFrame(() => {
			if (running) tick();
		});
	}

	$effect(() => {
		if (viewOnly) return;
		if (initialized) return;
		if (nodes.length === 0) return;

		initialized = true;
		initializeSimulation();
		running = true;

		simulation.alpha(1).restart();
		requestAnimationFrame(tick);
	});

	$effect(() => {
		if (!initialized || !simulation) return;

		const currentIds = new Set(nodes.map((n) => n.id));
		const simNodes = simulation.nodes() as SimNode[];
		const existing = new Set(simNodes.map((n) => n.id));
		const added = nodes.filter((n) => !existing.has(n.id));
		const survivors = simNodes.filter((n) => currentIds.has(n.id));
		const removedCount = simNodes.length - survivors.length;

		if (added.length === 0 && removedCount === 0) return;

		for (const n of added) {
			survivors.push({
				...n,
				x: n.position.x,
				y: n.position.y
			} as SimNode);
		}

		simulation.nodes(survivors);
		simulation.force(
			'link',
			d3Force
				.forceLink(edges.map((e) => ({ ...e })))
				.id((d) => (d as { id: string }).id)
				.strength(0.05)
				.distance(100)
		);

		const isMostlyNewGraph = nodes.length > 0 && added.length / nodes.length > 0.5;

		if (isMostlyNewGraph) {
			simulation.alpha(1).restart();
		} else {
			simulation.alphaTarget(0.15).restart();
			if (cooldownFrame !== null) cancelAnimationFrame(cooldownFrame);
			cooldownFrame = window.requestAnimationFrame(function cooldown() {
				simulation.alphaTarget(0.15);
				cooldownFrame = null;
			});
		}

		if (!running) {
			running = true;
			window.requestAnimationFrame(tick);
		}
	});

	function toggleLayout() {
		if (!running) {
			initializeSimulation();
			running = true;

			simulation.alpha(Math.max(simulation.alpha(), 0.5)).restart();
			window.requestAnimationFrame(tick);
		} else {
			running = false;
		}
	}

	function handleNodeDragStart({ targetNode }: { targetNode: Node | null }) {
		if (targetNode) draggingNode = { id: targetNode.id, position: targetNode.position };
		if (!running) {
			running = true;
			window.requestAnimationFrame(tick);
		}
		if (simulation) simulation.alphaTarget(0.1).restart();
	}

	function handleNodeDrag({ targetNode }: { targetNode: Node | null }) {
		if (targetNode) draggingNode = { id: targetNode.id, position: targetNode.position };
	}

	function handleNodeDragStop({ targetNode }: { targetNode: Node | null }) {
		if (targetNode) {
			const simNodes = simulation.nodes() as SimNode[];
			const simNode = simNodes.find((n) => n.id === targetNode.id);
			if (simNode) {
				simNode.fx = targetNode.position.x;
				simNode.fy = targetNode.position.y;
			}
			lockedNodeIds = new Set(lockedNodeIds).add(targetNode.id);
		}
		draggingNode = null;
	}

	let contextedNode = $state<Node>();
	let contextPos = $state({ x: 0, y: 0 });
	let openPaneContext = $state(false);
	let customAnchor = $state<HTMLElement>(null!);

	const handleContextMenu = ({ event }: { event: MouseEvent }) => {
		if (!enableContext) return;
		event.preventDefault();
		openPaneContext = true;
		contextPos = { x: event.clientX, y: event.clientY };
		contextFlowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		contextedNode = undefined;
	};

	const handleNodeContextMenu: NodeEventWithPointer<MouseEvent> = ({ event, node }) => {
		event.preventDefault();
		handleContextMenu({ event });
		contextedNode = node;
	};

	const agentData = useDnD();

	const onDragOver = (event: DragEvent) => {
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	};

	const addAgent = async (agent: any, spawnPos: { x: number; y: number } | null = null) => {
		const registrySourceId = agent.registrySourceId ?? { type: agent.source };

		const lookupDetails = await ctx.server.lookupAgent({
			name: agent.name,
			version: agent.version,
			registrySourceId
		});

		if (!lookupDetails) {
			console.error('Failed to look up agent details for', agent);
			return;
		}

		const runtime = (Object.keys(lookupDetails.registryAgent.runtimes).at(0) ?? undefined) as
			| 'function'
			| 'executable'
			| 'docker'
			| 'prototype';

		const beforeIds = new Set((activeFile.current?.agents ?? []).map((a) => a.clientId));

		activeFile.addAgent({
			id: { name: agent.name, version: agent.version, registrySourceId },
			name: `${randomAdjective()} ${randomPlant()}`,
			description: lookupDetails.registryAgent.info.description ?? '',
			provider: { type: 'local', runtime },
			blocking: false,
			customToolAccess: [],
			plugins: [],
			budgetSettings: { budget: 0, exhaustionBehavior: { type: 'consume_session' } },
			x402Budgets: [],
			options: {}
		});

		if (spawnPos) {
			const newAgent = (activeFile.current?.agents ?? []).find((a) => !beforeIds.has(a.clientId));
			if (newAgent) pendingPositions.set(newAgent.clientId, spawnPos);
		}
	};
	// todo: ^^ sort out the other provider types because they are not all 'local', but seafra has stated its not currently important

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		const agent = agentData.agent;
		if (!agent) return;

		const dropPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		addAgent(agent, dropPos);
	};

	const keys = new PressedKeys();
	const IsShiftPressed = $derived(keys.has('Shift'));
</script>

{#if mode.current}
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		class={cn('[&_.svelte-flow__edge-wrapper]:z-10!', className)}
		ondragover={onDragOver}
		fitView
		ondrop={onDrop}
		onpanecontextmenu={handleContextMenu}
		onnodecontextmenu={handleNodeContextMenu}
		onnodedragstart={handleNodeDragStart}
		onnodedrag={handleNodeDrag}
		onnodeclick={(nodes) => {
			sessCtx.selectedAgentClientId = nodes.node.id;
		}}
		edgesFocusable={false}
		panOnDrag={[1]}
		selectNodesOnDrag={false}
		elevateNodesOnSelect={true}
		onnodedragstop={handleNodeDragStop}
		defaultEdgeOptions={{ selectable: false, focusable: false }}
		autoPanOnNodeDrag={false}
		onedgeclick={() => {
			sessCtx.selectedAgentClientId = null;
		}}
		connectionMode={'loose' as ConnectionMode}
		colorMode={mode.current}
		proOptions={{
			hideAttribution: true
		}}
	>
		{#if controls}
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
		{#key contextPos}
			<div
				style="position: fixed; left: {contextPos.x}px !important; top: {contextPos.y}px !important;"
				bind:this={customAnchor}
			></div>
			{#if enableContext}
				{@const availableAgents = Object.values(ctx.server.catalogs).flatMap((catalog) =>
					Object.values(catalog.agents ?? {}).map((agent) => ({
						...agent,
						type: catalog.identifier.type
					}))
				)}
				<Popover.Root bind:open={openPaneContext}>
					<Popover.Content align="start" sideOffset={1} {customAnchor} class="p-0">
						<Command.Root>
							<Command.Input placeholder="Quick actions" />
							<Command.List>
								<Command.Empty>No results found.</Command.Empty>
								{#if contextedNode}
									<Command.Group heading={String(contextedNode.data.label ?? '')}>
										<Command.Item
											keywords={['delete', 'remove']}
											onclick={() => {
												activeFile.removeAgent(contextedNode!.id);
												openPaneContext = false;
											}}>Delete agent</Command.Item
										>
									</Command.Group>
								{/if}
								<Command.Group heading="Add agents">
									{#each availableAgents as agent, i}
										<Command.Item
											class="flex grow justify-between"
											keywords={['add', 'create']}
											value={agent.name + i}
											onclick={() => {
												const details = {
													name: agent.name,
													version: agent.versions[0]!,
													registrySourceId: { type: 'marketplace' }
												};

												addAgent(details, contextFlowPosition);

												if (!IsShiftPressed) {
													openPaneContext = false;
												}
											}}
											><span>{agent.name}</span>
											<span class="text-muted-foreground! text-xs"
												>{agent.type === 'local' ? 'local' : ''}</span
											></Command.Item
										>
									{/each}
								</Command.Group>
								<Command.Group heading="Actions"></Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			{/if}
		{/key}

		<Background {id} />
	</SvelteFlow>
{/if}
