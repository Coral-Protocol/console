<script lang="ts">
	/**
	 * Live, force-directed visualization of a session's agents, threads,
	 * and the relations the backend has declared between them.
	 *
	 * Rendering uses a single <canvas> rather than reactive SVG — at
	 * thousands of nodes, painting per-element <g>/<circle>/<text> nodes
	 * with Svelte reactivity dominates the frame budget. Canvas drops the
	 * cost to roughly O(nodes + links) of simple primitive calls per
	 * frame and keeps interactions smooth at 1000+ agents.
	 *
	 * Only the hover popover and the details dialog stay in the DOM.
	 *
	 * See ./session-graph/data.ts (incremental stats accumulator) and
	 * ./session-graph/layout.ts (uniform-grid repulsion + indexed
	 * springs) for the matching algorithmic optimisations.
	 */
	import { onMount, onDestroy, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import type { Session, SessionGroup, SessionEventEntry } from '$lib/session.svelte';
	import {
		simulate,
		buildNodeIndex,
		DEFAULT_SIM_PARAMS,
		type GraphLayout,
		type GraphNode,
		type SimParams
	} from './session-graph/layout';
	import {
		buildGraphData,
		StatsAccumulator,
		type AgentStats,
		type ThreadStats
	} from './session-graph/data';
	import {
		agentVisual,
		threadVisual,
		drawAgentIcon,
		drawThreadIcon,
		drawStatusPip,
		type AgentVisual,
		type ThreadVisual
	} from './session-graph/visual';
	import SessionGraphDetails from './session-graph/SessionGraphDetails.svelte';
	import SessionGraphControls from './session-graph/SessionGraphControls.svelte';

	// Physics params — mutated in place by the controls component; the
	// rAF loop reads the same object reference every frame.
	const simParams: SimParams = $state({ ...DEFAULT_SIM_PARAMS });

	interface Props {
		session: Session;
	}
	let { session }: Props = $props();

	// ── Topology (rebuilt only when counts change) ──────────────────────
	// Tracking by length is cheap and avoids re-running the O(agents +
	// links) topology builder on every event arrival.
	let agentsLen = $derived(Object.keys(session.agents).length);
	let threadsLen = $derived(Object.values(session.threads).length);
	let groupsLen = $derived(session.groups.length);
	// Sum of all current thread participants — drives participation links.
	let participantsLen = $derived.by(() => {
		let n = 0;
		for (const t of Object.values(session.threads)) n += t.participants.size;
		return n;
	});

	let graphData = $derived.by(() => {
		// Touch the length signals so the derivation re-runs when topology
		// changes; the actual reads use the live (untracked) maps.
		void agentsLen;
		void threadsLen;
		void groupsLen;
		void participantsLen;
		const agents = Object.keys(session.agents).sort();
		const threads = Object.values(session.threads);
		const groups = session.groups as SessionGroup[];
		return buildGraphData(agents, threads, groups);
	});

	// ── Stats: incremental accumulator ──────────────────────────────────
	const stats = new StatsAccumulator();
	let statsVersion = $state(0); // bumped after each ingest so derived consumers refresh
	$effect(() => {
		// Re-run whenever the event log grows or topology changes.
		const evs = session.events;
		void agentsLen;
		void threadsLen;
		untrack(() => {
			stats.ingest(evs);
			stats.syncRoster(Object.keys(session.agents), Object.values(session.threads));
			statsVersion += 1;
		});
	});
	let agentStats = $derived.by<Record<string, AgentStats>>(() => {
		void statsVersion;
		return stats.agentStats;
	});
	let threadStats = $derived.by<Record<string, ThreadStats>>(() => {
		void statsVersion;
		return stats.threadStats;
	});

	// ── Force-directed layout (mutable; not $state to avoid per-tick
	// reactivity overhead with thousands of nodes) ──────────────────────
	let width = $state(800);
	let height = $state(560);
	let container = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	const layout: GraphLayout = { nodes: [], links: [], nodeIndex: new Map() };
	let raf = 0;
	let lastTick = 0;

	// Rebuild layout when topology changes, preserving existing positions
	// so additions animate in rather than reshuffling the whole graph.
	$effect(() => {
		const data = graphData;
		untrack(() => {
			const prev = layout.nodeIndex;
			const nodes: GraphNode[] = new Array(data.nodes.length);
			for (let i = 0; i < data.nodes.length; i++) {
				const n = data.nodes[i]!;
				const old = prev.get(n.id);
				if (old) {
					old.kind = n.kind;
					old.label = n.label;
					nodes[i] = old;
				} else {
					nodes[i] = {
						id: n.id,
						kind: n.kind,
						label: n.label,
						x: width / 2 + (Math.random() - 0.5) * 200,
						y: height / 2 + (Math.random() - 0.5) * 200,
						vx: 0,
						vy: 0
					};
				}
			}
			layout.nodes = nodes;
			// Reuse link objects by id where possible to avoid GC churn.
			layout.links = data.links.map((l) => ({ ...l }));
			layout.nodeIndex = buildNodeIndex(nodes);
		});
	});

	// ── Message flashes (indexed) ───────────────────────────────────────
	const FLASH_DURATION_MS = 900;
	type Flash = {
		key: string;
		from: string;
		to: string;
		color: 'blue' | 'violet';
		start: number;
	};
	// Mutable list (not $state) — repainted every frame from the rAF loop.
	let flashes: Flash[] = [];
	let lastFlashSeq = -1;
	// Index: threadId → list of {seq, sender} message records in arrival
	// order. Lets a new proxy_request find "unseen" messages in O(k) where
	// k is the relevant window, instead of scanning the full event log.
	const threadMessages = new Map<string, { seq: number; sender: string }[]>();
	// Per-agent: highest seq of a message we've already accounted for in a
	// proxy-request flash.
	const lastSeenByAgent = new Map<string, number>();

	function ingestNewEvents(evs: SessionEventEntry[]) {
		let cursor = lastFlashSeq;
		// Find first new event index (suffix scan from tail).
		let firstNew = evs.length;
		for (let i = evs.length - 1; i >= 0; i--) {
			if (evs[i]!.seq <= cursor) {
				firstNew = i + 1;
				break;
			}
			if (i === 0) firstNew = 0;
		}
		const nowMs = performance.now();
		for (let i = firstNew; i < evs.length; i++) {
			const e = evs[i]!;
			if (e.seq <= cursor) continue;
			cursor = e.seq;
			const ev = e.event;
			if (ev.type === 'thread_message_sent') {
				const tid = ev.message.threadId;
				let list = threadMessages.get(tid);
				if (!list) {
					list = [];
					threadMessages.set(tid, list);
				}
				list.push({ seq: e.seq, sender: ev.message.senderName });
				if (lastFlashSeq >= 0) {
					// Only emit visual flashes for genuinely new events
					// (skip during initial hydration of imported sessions).
					flashes.push({
						key: `m:${e.seq}`,
						from: `a:${ev.message.senderName}`,
						to: `t:${tid}`,
						color: 'blue',
						start: nowMs
					});
				}
			} else if (ev.type === 'detailed_llm_proxy_request') {
				const agentName = ev.agentName;
				const since = lastSeenByAgent.get(agentName) ?? -1;
				if (lastFlashSeq >= 0) {
					// Walk only threads this agent currently participates in.
					for (const tid of Object.keys(session.threads)) {
						const t = session.threads[tid]!;
						if (!t.participants.has(agentName)) continue;
						const list = threadMessages.get(tid);
						if (!list) continue;
						// Messages are appended in seq order; find first
						// index with seq > since via linear scan from end.
						// In steady state this is near-constant.
						for (let k = list.length - 1; k >= 0; k--) {
							const m = list[k]!;
							if (m.seq <= since) break;
							if (m.seq >= e.seq) continue;
							if (m.sender === agentName) continue;
							flashes.push({
								key: `r:${e.seq}:${m.seq}`,
								from: `t:${tid}`,
								to: `a:${agentName}`,
								color: 'violet',
								start: nowMs
							});
						}
					}
				}
				lastSeenByAgent.set(agentName, e.seq);
			}
		}
		lastFlashSeq = cursor;
	}

	$effect(() => {
		// Track only the length to avoid touching every entry of the array.
		const len = session.events.length;
		void len;
		untrack(() => ingestNewEvents(session.events));
	});

	// ── Hover / selection / interaction state ──────────────────────────
	let hoverId = $state<string | null>(null);
	let hoverX = $state(0);
	let hoverY = $state(0);
	/** Selection set (multi-select). Reactive so the canvas paint
	 *  invalidation in derived consumers re-runs. */
	const selection = new SvelteSet<string>();
	/** Node id whose details dialog is currently open (double-click). */
	let detailsId = $state<string | null>(null);
	/** Live marquee rectangle (canvas pixels) while shift+drag or
	 *  empty-space drag is in progress, else null. */
	let marquee = $state<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

	type DragMode =
		| { kind: 'none' }
		| { kind: 'pending'; x0: number; y0: number; shift: boolean; id: string | null }
		| { kind: 'nodes'; lastX: number; lastY: number; ids: string[] }
		| { kind: 'marquee'; x0: number; y0: number; additive: boolean };
	let drag: DragMode = { kind: 'none' };
	const DRAG_THRESHOLD_PX = 4;

	const AGENT_R = 22;
	const AGENT_HIT_R2 = (AGENT_R + 4) * (AGENT_R + 4);
	const THREAD_HALF_W = 28;
	const THREAD_HALF_H = 18;

	function hitTest(mx: number, my: number): string | null {
		// Scan nodes in reverse so visually-top nodes win ties.
		const nodes = layout.nodes;
		for (let i = nodes.length - 1; i >= 0; i--) {
			const n = nodes[i]!;
			if (n.kind === 'agent') {
				const dx = mx - n.x;
				const dy = my - n.y;
				if (dx * dx + dy * dy <= AGENT_HIT_R2) return n.id;
			} else {
				if (
					mx >= n.x - THREAD_HALF_W &&
					mx <= n.x + THREAD_HALF_W &&
					my >= n.y - THREAD_HALF_H &&
					my <= n.y + THREAD_HALF_H
				)
					return n.id;
			}
		}
		return null;
	}

	/** Collect node ids whose centre falls within a canvas-space box. */
	function hitTestBox(x0: number, y0: number, x1: number, y1: number): string[] {
		const lo_x = Math.min(x0, x1);
		const hi_x = Math.max(x0, x1);
		const lo_y = Math.min(y0, y1);
		const hi_y = Math.max(y0, y1);
		const out: string[] = [];
		for (const n of layout.nodes) {
			if (n.x >= lo_x && n.x <= hi_x && n.y >= lo_y && n.y <= hi_y) out.push(n.id);
		}
		return out;
	}

	function applyPinned() {
		for (const n of layout.nodes) n.pinned = selection.has(n.id) && pinSelection;
	}
	/** When true, selected nodes stay frozen (good for arranging the graph). */
	let pinSelection = $state(false);

	function localXY(e: MouseEvent): { x: number; y: number } {
		const rect = canvas!.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function onMouseDown(e: MouseEvent) {
		if (!canvas || e.button !== 0) return;
		const { x, y } = localXY(e);
		const id = hitTest(x, y);
		drag = { kind: 'pending', x0: x, y0: y, shift: e.shiftKey, id };
	}

	function onMove(e: MouseEvent) {
		if (!canvas) return;
		const { x, y } = localXY(e);

		// Hover bookkeeping (cheap; runs always).
		if (drag.kind === 'none' || drag.kind === 'pending') {
			const id = hitTest(x, y);
			if (id !== hoverId) hoverId = id;
			if (id) {
				const n = layout.nodeIndex.get(id);
				if (n) {
					hoverX = n.x;
					hoverY = n.y;
				}
			}
		}

		if (drag.kind === 'pending') {
			const dx = x - drag.x0;
			const dy = y - drag.y0;
			if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
			if (drag.id) {
				// Node-drag: if the clicked node isn't part of the current
				// selection, treat the drag as moving just that node
				// (replacing selection unless shift is held).
				let ids: string[];
				if (selection.has(drag.id)) {
					ids = Array.from(selection);
				} else {
					if (!drag.shift) selection.clear();
					selection.add(drag.id);
					ids = [drag.id];
				}
				// Pin during drag so the simulation doesn't fight us.
				for (const id of ids) {
					const n = layout.nodeIndex.get(id);
					if (n) n.pinned = true;
				}
				drag = { kind: 'nodes', lastX: drag.x0, lastY: drag.y0, ids };
			} else {
				drag = { kind: 'marquee', x0: drag.x0, y0: drag.y0, additive: drag.shift };
				marquee = { x0: drag.x0, y0: drag.y0, x1: x, y1: y };
			}
		}

		if (drag.kind === 'nodes') {
			const dx = x - drag.lastX;
			const dy = y - drag.lastY;
			drag.lastX = x;
			drag.lastY = y;
			for (const id of drag.ids) {
				const n = layout.nodeIndex.get(id);
				if (!n) continue;
				n.x += dx;
				n.y += dy;
				n.vx = 0;
				n.vy = 0;
			}
		} else if (drag.kind === 'marquee') {
			marquee = { x0: drag.x0, y0: drag.y0, x1: x, y1: y };
		}
	}

	function onMouseUp(e: MouseEvent) {
		if (!canvas) return;
		const { x, y } = localXY(e);
		if (drag.kind === 'pending') {
			// No drag occurred — handle as click.
			const id = drag.id;
			if (id) {
				if (drag.shift) {
					if (selection.has(id)) selection.delete(id);
					else selection.add(id);
				} else {
					selection.clear();
					selection.add(id);
				}
			} else if (!drag.shift) {
				selection.clear();
			}
			applyPinned();
		} else if (drag.kind === 'marquee') {
			const hits = hitTestBox(drag.x0, drag.y0, x, y);
			if (!drag.additive) selection.clear();
			for (const id of hits) selection.add(id);
			marquee = null;
			applyPinned();
		} else if (drag.kind === 'nodes') {
			// Release pin unless explicit sticky mode is on.
			if (!pinSelection) {
				for (const id of drag.ids) {
					const n = layout.nodeIndex.get(id);
					if (n) n.pinned = false;
				}
			}
		}
		drag = { kind: 'none' };
	}

	function onDblClick(e: MouseEvent) {
		if (!canvas) return;
		const { x, y } = localXY(e);
		const id = hitTest(x, y);
		if (id) detailsId = id;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			selection.clear();
			marquee = null;
			drag = { kind: 'none' };
			applyPinned();
		}
	}

	// ── Render loop ─────────────────────────────────────────────────────
	// Resolve text colors from CSS once per frame so we follow theme
	// changes without per-node DOM lookups.
	let fgColor = '#111';
	let borderColor = '#ccc';
	let mutedColor = '#999';
	function refreshThemeColors() {
		if (!container) return;
		const cs = getComputedStyle(container);
		const fg = cs.getPropertyValue('color');
		if (fg) fgColor = fg;
	}

	function paint() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const dpr = window.devicePixelRatio || 1;
		const cssW = width;
		const cssH = height;
		if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
			canvas.width = Math.floor(cssW * dpr);
			canvas.height = Math.floor(cssH * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, cssW, cssH);

		const nodes = layout.nodes;
		const links = layout.links;
		const idx = layout.nodeIndex;
		const nowMs = performance.now();
		const showLabels = nodes.length <= 400; // labels off for huge graphs

		// Links — two passes (group dashed, participation solid) so we
		// only set strokeStyle/lineDash twice.
		ctx.lineWidth = 1;
		ctx.strokeStyle = borderColor;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		for (let i = 0; i < links.length; i++) {
			const l = links[i]!;
			if (l.kind !== 'group') continue;
			const a = idx.get(l.source);
			const b = idx.get(l.target);
			if (!a || !b) continue;
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
		}
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.lineWidth = 1.25;
		ctx.strokeStyle = mutedColor;
		ctx.beginPath();
		for (let i = 0; i < links.length; i++) {
			const l = links[i]!;
			if (l.kind !== 'participation') continue;
			const a = idx.get(l.source);
			const b = idx.get(l.target);
			if (!a || !b) continue;
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
		}
		ctx.stroke();

		// Flashes — filter and draw in one pass.
		if (flashes.length) {
			const next: Flash[] = [];
			for (let i = 0; i < flashes.length; i++) {
				const f = flashes[i]!;
				const t = (nowMs - f.start) / FLASH_DURATION_MS;
				if (t >= 1) continue;
				next.push(f);
				const a = idx.get(f.from);
				const b = idx.get(f.to);
				if (!a || !b) continue;
				const k = 1 - Math.pow(1 - t, 3);
				const x = a.x + (b.x - a.x) * k;
				const y = a.y + (b.y - a.y) * k;
				ctx.globalAlpha = 1 - t;
				ctx.fillStyle = f.color === 'blue' ? '#3b82f6' : '#8b5cf6';
				ctx.beginPath();
				ctx.arc(x, y, 5 + 4 * (1 - t), 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			flashes = next;
		}

		// Nodes — drawn with state-aware border colour, an icon glyph in
		// the centre, and a small pulsing status pip for thinking agents.
		// A separate selection-ring pass on top makes selected items
		// visually pop without re-traversing the whole node array twice.
		const pulse = 0.5 + 0.5 * Math.sin(nowMs / 220); // 0..1 wave for "thinking"
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i]!;
			const selected = selection.has(n.id);
			const hovered = hoverId === n.id;
			if (n.kind === 'agent') {
				const av: AgentVisual = agentVisual(session.agents[n.label]);
				const r = selected ? 26 : hovered ? 24 : AGENT_R;
				ctx.beginPath();
				ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
				ctx.lineWidth = av.status === 'thinking' ? 2 + 1.5 * pulse : 2;
				ctx.strokeStyle = av.color;
				ctx.stroke();
				drawAgentIcon(ctx, n.x, n.y, r * 0.55, av.color);
				if (av.status === 'thinking' || av.status === 'waiting_message') {
					drawStatusPip(
						ctx,
						n.x,
						n.y,
						r,
						av.color,
						av.status === 'thinking' ? pulse : 0
					);
				}
			} else {
				const tv: ThreadVisual = threadVisual(session.threads[n.id.slice(2)]);
				ctx.beginPath();
				const x = n.x - THREAD_HALF_W;
				const y = n.y - THREAD_HALF_H;
				const w = THREAD_HALF_W * 2;
				const h = THREAD_HALF_H * 2;
				const rr = 8;
				ctx.moveTo(x + rr, y);
				ctx.arcTo(x + w, y, x + w, y + h, rr);
				ctx.arcTo(x + w, y + h, x, y + h, rr);
				ctx.arcTo(x, y + h, x, y, rr);
				ctx.arcTo(x, y, x + w, y, rr);
				ctx.closePath();
				ctx.fillStyle = '#ffffff';
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = tv.color;
				// Dashed border indicates a non-empty limitToPostingBy.
				if (tv.limited) ctx.setLineDash([5, 3]);
				ctx.stroke();
				if (tv.limited) ctx.setLineDash([]);
				drawThreadIcon(ctx, n.x, n.y, THREAD_HALF_W, THREAD_HALF_H, tv.color);
			}
		}
		// Selection ring pass.
		if (selection.size) {
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#2563eb'; // blue-600
			ctx.setLineDash([3, 3]);
			for (let i = 0; i < nodes.length; i++) {
				const n = nodes[i]!;
				if (!selection.has(n.id)) continue;
				ctx.beginPath();
				if (n.kind === 'agent') {
					ctx.arc(n.x, n.y, AGENT_R + 5, 0, Math.PI * 2);
				} else {
					const pad = 4;
					const x = n.x - THREAD_HALF_W - pad;
					const y = n.y - THREAD_HALF_H - pad;
					const w = (THREAD_HALF_W + pad) * 2;
					const h = (THREAD_HALF_H + pad) * 2;
					const rr = 10;
					ctx.moveTo(x + rr, y);
					ctx.arcTo(x + w, y, x + w, y + h, rr);
					ctx.arcTo(x + w, y + h, x, y + h, rr);
					ctx.arcTo(x, y + h, x, y, rr);
					ctx.arcTo(x, y, x + w, y, rr);
				}
				ctx.stroke();
			}
			ctx.setLineDash([]);
		}

		// Marquee overlay (drawn last so it sits above everything).
		if (marquee) {
			const mx = Math.min(marquee.x0, marquee.x1);
			const my = Math.min(marquee.y0, marquee.y1);
			const mw = Math.abs(marquee.x1 - marquee.x0);
			const mh = Math.abs(marquee.y1 - marquee.y0);
			ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
			ctx.fillRect(mx, my, mw, mh);
			ctx.strokeStyle = '#2563eb';
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 3]);
			ctx.strokeRect(mx, my, mw, mh);
			ctx.setLineDash([]);
		}

		if (showLabels) {
			ctx.fillStyle = fgColor;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
			for (let i = 0; i < nodes.length; i++) {
				const n = nodes[i]!;
				ctx.fillText(n.label, n.x, n.y + (n.kind === 'agent' ? 38 : 32));
			}
			ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
			for (let i = 0; i < nodes.length; i++) {
				const n = nodes[i]!;
				if (n.kind === 'agent') {
					const s = agentStats[n.label];
					if (s) ctx.fillText(`${s.llmCalls}/${s.messagesSent}`, n.x, n.y + 4);
				} else {
					const s = threadStats[n.id.slice(2)];
					if (s) ctx.fillText(`${s.messages}·${s.participants}`, n.x, n.y + 4);
				}
			}
		}
	}

	function tick(now: number) {
		const dt = Math.min(64, now - (lastTick || now));
		lastTick = now;
		simulate(layout, { nodes: [], links: [] }, { width, height, dt, params: simParams });
		paint();
		raf = requestAnimationFrame(tick);
	}

	onMount(() => {
		const ro = new ResizeObserver((es) => {
			for (const e of es) {
				width = Math.max(320, e.contentRect.width);
				height = Math.max(320, e.contentRect.height);
			}
		});
		if (container) ro.observe(container);
		refreshThemeColors();
		raf = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
	onDestroy(() => cancelAnimationFrame(raf));

	let hoverNode = $derived(hoverId ? layout.nodeIndex.get(hoverId) : null);
</script>

<svelte:window onkeydown={onKeyDown} />

<div bind:this={container} class="relative h-full w-full overflow-hidden">
	{#if agentsLen === 0 && threadsLen === 0 && groupsLen === 0}
		<div class="text-muted-foreground flex h-full items-center justify-center text-sm">
			No agents, threads, or groups yet.
		</div>
	{:else}
		<canvas
			bind:this={canvas}
			style="width: {width}px; height: {height}px;"
			class="absolute inset-0 cursor-pointer select-none"
			onmousemove={onMove}
			onmouseleave={() => (hoverId = null)}
			onmousedown={onMouseDown}
			onmouseup={onMouseUp}
			ondblclick={onDblClick}
			aria-label="Session graph"
		></canvas>

		<SessionGraphControls params={simParams} />

		{#if hoverId && hoverNode}
			{@const av = hoverNode.kind === 'agent' ? agentVisual(session.agents[hoverNode.label]) : null}
			{@const tv = hoverNode.kind === 'thread' ? threadVisual(session.threads[hoverNode.id.slice(2)]) : null}
			<div
				class="pointer-events-none absolute"
				style="left: {hoverX + 16}px; top: {hoverY + 16}px;"
			>
				<div
					class="bg-popover text-popover-foreground rounded-md border p-2 text-xs shadow-md"
				>
					<div class="font-semibold">{hoverNode.label}</div>
					{#if hoverNode.kind === 'agent'}
						{@const s = agentStats[hoverNode.label]}
						<div class="text-muted-foreground mt-1">
							Agent · <span style="color: {av?.color}">{av?.label}</span>
						</div>
						{#if s}
							<div class="mt-1">LLM calls: <span class="font-mono">{s.llmCalls}</span></div>
							<div>Messages sent: <span class="font-mono">{s.messagesSent}</span></div>
							<div>Threads: <span class="font-mono">{s.threads}</span></div>
						{/if}
					{:else}
						{@const id = hoverNode.id.slice(2)}
						{@const s = threadStats[id]}
						{@const t = session.threads[id]}
						<div class="text-muted-foreground mt-1">
							Thread · <span style="color: {tv?.color}">{tv?.label}</span>
						</div>
						{#if s}
							<div class="mt-1">Messages: <span class="font-mono">{s.messages}</span></div>
							<div>Participants: <span class="font-mono">{s.participants}</span></div>
							<div>State: <span class="font-mono">{s.state}</span></div>
							{#if t && t.limitToPostingBy.length}
								<div class="text-muted-foreground mt-1">
									Posting limited to:
									<span class="font-mono">{t.limitToPostingBy.join(', ')}</span>
								</div>
							{/if}
						{/if}
					{/if}
					<div class="text-muted-foreground mt-2 italic">
						Click to select · shift+click to add · double-click for details
					</div>
				</div>
			</div>
		{/if}

		<div
			class="bg-background/80 text-muted-foreground absolute right-2 top-2 flex items-center gap-2 rounded border px-2 py-1 text-[10px] backdrop-blur"
		>
			<span>
				{agentsLen} agent{agentsLen === 1 ? '' : 's'} ·
				{threadsLen} thread{threadsLen === 1 ? '' : 's'} ·
				{groupsLen} group{groupsLen === 1 ? '' : 's'}
			</span>
			{#if selection.size > 0}
				<span class="text-foreground border-l pl-2">
					{selection.size} selected
				</span>
				<label class="flex items-center gap-1" title="Keep selected nodes fixed in place">
					<input
						type="checkbox"
						bind:checked={pinSelection}
						onchange={applyPinned}
						class="size-3"
					/>
					Pin
				</label>
				<button
					type="button"
					class="hover:bg-muted rounded border px-1"
					onclick={() => {
						selection.clear();
						applyPinned();
					}}
				>
					Clear
				</button>
			{/if}
		</div>
	{/if}

	<SessionGraphDetails
		{session}
		selectedId={detailsId}
		onClose={() => (detailsId = null)}
		{agentStats}
		{threadStats}
	/>
</div>
