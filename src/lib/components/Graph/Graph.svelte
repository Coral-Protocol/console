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
		type PaneEvents,
		useStore,
		MiniMap,
		Controls,
		type OnSelectionDrag,
		type NodesEventWithPointer,
		type Viewport,
		type OnDelete
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { mode } from 'mode-watcher';
	import GraphCircleNode from './GraphCircleNode.svelte';

	import * as d3Force from 'd3-force';
	import { cn, getInitials } from '$lib/utils';

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
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';

	let fps = $state(0);
	let fpsFrame: number | null = null;

	onMount(() => {
		let frameCount = 0;
		let lastFpsUpdate = performance.now();

		function measureFps() {
			frameCount++;
			const now = performance.now();
			const elapsed = now - lastFpsUpdate;

			if (elapsed >= 500) {
				fps = Math.round((frameCount * 1000) / elapsed);
				frameCount = 0;
				lastFpsUpdate = now;
			}

			fpsFrame = requestAnimationFrame(measureFps);
		}

		fpsFrame = requestAnimationFrame(measureFps);

		return () => {
			if (fpsFrame !== null) cancelAnimationFrame(fpsFrame);
		};
	});

	function hueFromString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash) % 360;
	}

	function handleToggleLock(
		nodeId: string,
		position: { x: number; y: number },
		currentlyLocked: boolean
	) {
		activeFile.updateAgent(nodeId, {
			nodeData: { position, locked: !currentlyLocked }
		});
	}

	let lastFocusedBeforePointerDown = $state<Element | null>(null);

	function capturePointerDown() {
		lastFocusedBeforePointerDown = document.activeElement;
	}

	onMount(() => {
		window.addEventListener('pointerdown', capturePointerDown, true);
		return () => window.removeEventListener('pointerdown', capturePointerDown, true);
	});

	// todo: i hate how this (the above and below) is done

	function clearSelectedAgentIfNotInInput() {
		const el = lastFocusedBeforePointerDown;

		if (
			el instanceof HTMLElement &&
			(el.tagName === 'INPUT' ||
				el.tagName === 'TEXTAREA' ||
				el.tagName === 'SELECT' ||
				el.isContentEditable)
		) {
			return;
		}

		sessCtx.selectedAgentClientId = undefined;
		workbenchTabSide.current = 'Agents';
	}

	const { setCenter, screenToFlowPosition, setViewport } = useSvelteFlow();

	const pendingPositions = new Map<string, { x: number; y: number }>();
	let contextFlowPosition: { x: number; y: number } | null = null;

	let sessCtx = getSessionContext();
	let ctx = appContext.get();
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

	import { type Agent, type Group } from '$lib/fileStorage.svelte';
	import { randomAdjective, randomAnimal, randomPlant } from '$lib/words';
	import { appContext } from '$lib/context';
	import { add } from 'date-fns';
	import { PersistedState, PressedKeys } from 'runed';
	import { debugMode } from '$lib/debugMode.svelte';
	import { workbenchTabSide } from '$lib/fileTabs.svelte';

	const agents = $derived(activeFile.current?.agents ?? []);
	const groups = $derived(activeFile.current?.groups ?? []);
	const errors = $derived(activeFile.current?.errors);

	type AgentNode = Node<{
		label: string;
		type: string;
		index: number;
		locked: boolean;
		selected: boolean;
		errors?: any;
	}>;
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
			const nodeData = agent.nodeData ? $state.snapshot(agent.nodeData) : undefined;
			if (nodeData) {
				position = nodeData.position;
			} else if (pending) {
				position = pending;
				pendingPositions.delete(agent.clientId);
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
				data: {
					label: agent.name,
					type: agent.id.name,
					viewOnly,
					index,
					locked: nodeData?.locked ?? false,
					selected: agent.clientId === sessCtx.selectedAgentClientId,
					hue: hueFromString(agent.clientId),
					onToggleLock: handleToggleLock,
					errors: errors
				},
				type: 'circleNode',
				draggable: !viewOnly,
				locked: nodeData?.locked ?? false
			};
		});

		const edges = edgesFromGroups(groups);
		return { nodes, edges };
	});
	let nodes = $state.raw<AgentNode[]>([]);

	$effect(() => {
		nodes = data.nodes;
	});

	let edges = $derived<GroupEdge[]>(data.edges);

	let simulation: d3Force.Simulation<d3Force.SimulationNodeDatum, undefined>;
	let running = $state.raw(false);
	let initialized = $state.raw(false);
	let draggingNode = $state.raw<DraggingNode | null>(null);

	const { fitView } = useSvelteFlow();

	const ALPHA_SETTLE_THRESHOLD = 0.001;
	let cooldownFrame: number | null = null;

	onMount(() => {
		simulation = d3Force
			.forceSimulation()
			.force('charge', d3Force.forceManyBody().strength(300).distanceMax(500))
			.force(
				'collide',
				d3Force
					.forceCollide()
					.radius(82 + 12)
					.strength(0.1)
					.iterations(0.2)
			)
			.alphaTarget(0.15)
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
				.strength(0.5)
				.distance(100)
		);
	}

	let lockedIds = $derived(
		new Set(
			(activeFile.current?.agents ?? []).filter((a) => a.nodeData?.locked).map((a) => a.clientId)
		)
	);

	let lockedIdsSnapshot = $derived(lockedIds);

	const POSITION_EPSILON = 0.25;

	function tick() {
		if (!running) return;

		const simNodes = simulation.nodes() as SimNode[];

		simNodes.forEach((node) => {
			const dragging = draggingNode?.id === node.id;
			const locked = lockedIdsSnapshot.has(node.id);

			if (dragging && draggingNode) {
				node.fx = draggingNode.position.x;
				node.fy = draggingNode.position.y;
			} else if (locked) {
				node.fx = node.x;
				node.fy = node.y;
			} else {
				node.fx = undefined;
				node.fy = undefined;
			}
		});

		simulation.tick();

		const nodeById = new Map(untrack(() => nodes).map((n) => [n.id, n]));
		let changed = false;
		const next: AgentNode[] = [];

		for (const simNode of simNodes) {
			const original = nodeById.get(simNode.id);
			if (!original) continue;

			const x = simNode.fx ?? simNode.x ?? 0;
			const y = simNode.fy ?? simNode.y ?? 0;
			const dx = Math.abs(original.position.x - x);
			const dy = Math.abs(original.position.y - y);

			if (dx > POSITION_EPSILON || dy > POSITION_EPSILON) {
				changed = true;
				next.push({ ...original, position: { x, y } });
			} else {
				next.push(original);
			}
		}

		if (changed) {
			nodes = next;
		}

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

	function handleNodeDragStart({ targetNode }: { targetNode: Node | null }) {}

	function handleNodeDrag({ targetNode }: { targetNode: Node | null }) {
		if (targetNode) draggingNode = { id: targetNode.id, position: targetNode.position };
	}

	function handleNodeDragStop({
		targetNode,
		event
	}: {
		targetNode: Node | null;
		event: MouseEvent | TouchEvent;
	}) {
		if (targetNode) {
			if (event.shiftKey) {
				activeFile.updateAgent(targetNode.id, {
					nodeData: { position: targetNode.position, locked: !targetNode.data.locked }
				});
			} else if (targetNode.data.locked) {
				activeFile.updateAgent(targetNode.id, {
					nodeData: { position: targetNode.position }
				});
			}
		}
		draggingNode = null;
	}

	function handleSelectionDragStop(event: MouseEvent, nodes: AgentNode[]) {
		if (nodes.length === 0) return;
		for (const node of nodes) {
			if (node.data.locked) {
				activeFile.updateAgent(node.id, {
					nodeData: { position: node.position, locked: node.data.locked }
				});
			}
		}
	}

	function handleSelectionDrag(event: MouseEvent, nodes: AgentNode[]) {
		if (nodes.length === 0) return;
		for (const node of nodes) {
			if (node.data.locked) {
				activeFile.updateAgent(node.id, {
					nodeData: { position: node.position, locked: node.data.locked }
				});
			}
		}
	}

	let contextedNodes = $state<AgentNode[]>([]);
	let contextPos = $state({ x: 0, y: 0 });
	let openPaneContext = $state(false);
	let customAnchor = $state<HTMLElement>(null!);

	const handleContextMenu = ({ event }: { event: MouseEvent }) => {
		if (!enableContext) return;
		event.preventDefault();
		openPaneContext = true;
		contextPos = { x: event.clientX, y: event.clientY };
		contextFlowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		contextedNodes = [];
	};

	const handleNodeContextMenu: NodeEventWithPointer<MouseEvent> = ({ event, node }) => {
		event.preventDefault();
		handleContextMenu({ event });
		contextedNodes = [node as AgentNode];
	};

	const handleSelectionContextMenu: NodesEventWithPointer<MouseEvent, AgentNode> = ({
		event,
		nodes
	}) => {
		event.preventDefault();
		handleContextMenu({ event });
		contextedNodes = nodes as AgentNode[];
	};

	const agentData = useDnD();

	let dragPreviewPos = $state<{ x: number; y: number } | null>(null);

	const onDragOver = (event: DragEvent) => {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
		dragPreviewPos = { x: event.clientX, y: event.clientY };
	};

	const onDragLeave = () => {
		dragPreviewPos = null;
	};

	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		const agent = agentData.current;
		if (!agent) return;

		const dropPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
		addAgent(agent, dropPos);
		dragPreviewPos = null;
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

	const saveViewportPos = (event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
		activeFile.updateMeta({ viewport: viewport });
	};

	const deleteData: OnDelete<AgentNode, GroupEdge> = ({
		nodes: deletedNodes,
		edges: deletedEdges
	}) => {
		for (const node of deletedNodes) {
			activeFile.removeAgent(node.id);
			if (node.id === sessCtx.selectedAgentClientId) {
				sessCtx.selectedAgentClientId = undefined;
			}
		}
	};

	const keys = new PressedKeys();
	const IsShiftPressed = $derived(keys.has('Shift'));

	let lastFileId = $state<string | null>(null);

	$effect(() => {
		const currentId = activeFile.current?.id;
		if (!currentId || currentId === lastFileId) return;

		lastFileId = currentId;
		const savedViewport = activeFile.meta?.viewport;

		if (savedViewport) {
			setViewport(savedViewport, { duration: 0 });
		} else {
			setCenter(0, 0, { zoom: 1, duration: 0 });
		}
	});
</script>

{#if dragPreviewPos && agentData.current}
	<Avatar.Root
		class="pointer-events-none fixed z-50 flex size-8  shadow-lg"
		style="left: {dragPreviewPos.x}px; top: {dragPreviewPos.y}px; transform: translate(-50%, -50%);"
	>
		<Avatar.Fallback class="">
			{getInitials(agentData.current.name)}
		</Avatar.Fallback>
	</Avatar.Root>
{/if}

{#if mode.current}
	<SvelteFlow
		onmoveend={saveViewportPos}
		bind:nodes
		bind:edges
		nodeOrigin={[0.5, 0.5]}
		{nodeTypes}
		class={cn('svelte-flow__pane.selection ', className)}
		ondragover={onDragOver}
		fitView
		ondelete={deleteData}
		ondrop={onDrop}
		ondragleave={onDragLeave}
		onpanecontextmenu={handleContextMenu}
		onnodecontextmenu={handleNodeContextMenu}
		onnodedragstart={handleNodeDragStart}
		onnodedrag={handleNodeDrag}
		onnodeclick={(nodes) => {
			sessCtx.selectedAgentClientId = nodes.node.id;
			workbenchTabSide.current = 'Inspector';
		}}
		onpaneclick={clearSelectedAgentIfNotInInput}
		onselectiondragstop={handleSelectionDragStop}
		onselectioncontextmenu={handleSelectionContextMenu}
		selectNodesOnDrag={false}
		snapGrid={[20, 20]}
		maxZoom={2}
		minZoom={0.5}
		onselectionstart={() => {
			sessCtx.selectedAgentClientId = undefined;
		}}
		selectionOnDrag={true}
		edgesFocusable={false}
		panOnDrag={[1]}
		elevateNodesOnSelect={false}
		onnodedragstop={handleNodeDragStop}
		defaultEdgeOptions={{ selectable: false, focusable: false }}
		autoPanOnNodeDrag={false}
		connectionMode={'loose' as ConnectionMode}
		colorMode={mode.current}
		proOptions={{
			hideAttribution: true
		}}
	>
		<MiniMap
			class="border opacity-70 transition-opacity hover:opacity-100"
			pannable={false}
			zoomable={false}
			nodeBorderRadius={100}
		/>
		<Controls />
		{#if debugMode.current === true}
			<Panel
				position="top-left"
				class="text-muted-foreground pointer-events-none font-mono text-xs"
			>
				{fps} fps
			</Panel>
		{/if}
		{#if controls}
			<Panel position="top-right" class="flex gap-4 ">
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
								{#if contextedNodes}
									{#if contextedNodes.length === 1}
										{@const node = contextedNodes[0] ?? ({} as AgentNode)}
										<Command.Group heading={String(node.data.label ?? '')}>
											<Command.Item
												keywords={['delete', 'remove']}
												onclick={() => {
													activeFile.removeAgent(node.id);
													openPaneContext = false;
												}}>Delete agent</Command.Item
											>
										</Command.Group>
									{:else if contextedNodes.length > 1}
										{@const node = contextedNodes[0] ?? ({} as AgentNode)}
										<Command.Group heading="{contextedNodes.length} Selected agents">
											<Command.Item
												keywords={['delete', 'remove']}
												onclick={() => {
													for (const node of contextedNodes) {
														activeFile.removeAgent(node.id);
													}
													openPaneContext = false;
												}}
											>
												Delete selected agents
											</Command.Item>
										</Command.Group>
									{/if}
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

<style>
	:global(.svelte-flow__pane.selection) {
		cursor: default;
	}

	:global(.svelte-flow__pane.dragging) {
		cursor: grabbing;
	}
</style>
