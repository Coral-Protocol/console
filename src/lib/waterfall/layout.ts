import type { AgentLane, SessionEventEntry, SessionEventType } from '../session.svelte';
import { agentNameForEvent } from '../session.svelte';

/**
 * The waterfall renders a vertical, virtualized list of "rows". Each row is
 * either a single event chip or a collapsed gap representing a span of time
 * where nothing matching the active filter happened. Keeping the row union
 * narrow lets the renderer stay a simple `switch` and lets virtua handle
 * variable heights cleanly.
 */
export type WaterfallRow =
	| {
			kind: 'event';
			/** Stable key for keyed each / virtua getKey. */
			key: string;
			entry: SessionEventEntry;
			/** Lane (column) index of the agent this event belongs to. */
			laneIndex: number | null;
			/** Lane order index within the *visible* lane set (after filtering). */
			visibleLaneIndex: number | null;
			/** Resolved height in CSS pixels for layout / virtua hints. */
			height: number;
			/** Vertical offset (px) relative to the previous row. */
			gapBefore: number;
	  }
	| {
			kind: 'gap';
			key: string;
			/** Number of filtered-out events folded into this gap, for display. */
			hiddenCount: number;
			/** Duration in ms the gap spans, for display. */
			durationMs: number;
			height: number;
	  };

export interface VisibleLane {
	lane: AgentLane;
	/** Order this lane appears in horizontally after filtering. */
	visibleIndex: number;
}

export interface BuildLayoutInput {
	events: ReadonlyArray<SessionEventEntry>;
	lanes: ReadonlyArray<AgentLane>;
	/**
	 * Agent statuses keyed by name; used by the "hide sleeping" filter.
	 * Typed loosely (`unknown` walked defensively) so we can accept the full
	 * generated `SessionAgentState` union without coupling layout to its
	 * exact shape.
	 */
	agentStatuses: Record<string, unknown>;
	hideSleeping: boolean;
	/** Filter agents by name; case-insensitive substring match. */
	agentNameFilter: string;
	/** Allowed event types; if empty, all types are allowed. */
	allowedTypes: ReadonlySet<SessionEventType>;
	/** Vertical distance per millisecond, scaled live by the zoom slider. */
	pxPerMs: number;
	/** Minimum spacing between two rows so chips don't overlap. */
	minRowGap: number;
	/** Threshold (px) above which an idle period collapses into a gap row. */
	collapseThresholdPx: number;
	/** Height (px) of the collapsed gap row itself. */
	gapHeight: number;
	/** Height (px) of a normal event row (chip + breathing space). */
	rowHeight: number;
}

export interface BuildLayoutResult {
	rows: WaterfallRow[];
	visibleLanes: VisibleLane[];
	/** Total content height in CSS pixels (sum of all row heights + gaps). */
	totalHeight: number;
	/** Lookup helpers exposed for the SVG connector overlay. */
	visibleLaneIndexByName: Map<string, number>;
}

/**
 * Decide whether a given event belongs to an "inactive" (sleeping or stopped)
 * agent.
 */
function isAgentInactive(
	agentName: string | null,
	statuses: BuildLayoutInput['agentStatuses']
): boolean {
	if (!agentName) return false;
	const status = statuses[agentName];
	if (!status || typeof status !== 'object') return false;
	const s = status as {
		type?: string;
		connectionStatus?: { communicationStatus?: { type?: string } };
	};
	if (s.type === 'stopped') return true;
	if (s.type === 'running') {
		return s.connectionStatus?.communicationStatus?.type === 'sleeping';
	}
	return false;
}

/**
 * Build a layout snapshot from the current event log + lane registry +
 * filters. This function is intentionally pure (no DOM, no Svelte runes) so
 * the renderer can be swapped to canvas/WebGL later without rewriting the
 * layout pipeline.
 *
 * The algorithm:
 *   1. Compute the set of "visible" lanes by skipping sleeping agents when
 *      `hideSleeping` is on and skipping lanes that never produced a visible
 *      event after filtering.
 *   2. Walk events in arrival order. Each visible event becomes a row whose
 *      `gapBefore` is `min(collapseThresholdPx, dt * pxPerMs)`. If the gap
 *      exceeds the collapse threshold, we emit a dedicated gap row instead
 *      and reset the gap counter.
 *   3. Hidden events get rolled into the next gap row's `hiddenCount` so the
 *      user can see how much was suppressed by the filter.
 */
export function buildLayout(input: BuildLayoutInput): BuildLayoutResult {
	const {
		events,
		lanes,
		agentStatuses,
		hideSleeping,
		agentNameFilter,
		allowedTypes,
		pxPerMs,
		minRowGap,
		collapseThresholdPx,
		gapHeight,
		rowHeight
	} = input;

	// Determine which lanes carry any visible events; this prevents a long
	// tail of inactive agents from widening the timeline pointlessly.
	const accept = (entry: SessionEventEntry) => {
		if (!allowedTypes.has(entry.event.type)) return false;

		const name = agentNameForEvent(entry.event);
		if (hideSleeping && isAgentInactive(name, agentStatuses)) return false;

		if (
			agentNameFilter &&
			name &&
			!name.toLowerCase().includes(agentNameFilter.toLowerCase())
		) {
			return false;
		}

		return true;
	};

	const activeLaneNames = new Set<string>();
	for (const entry of events) {
		if (!accept(entry)) continue;
		const name = agentNameForEvent(entry.event);
		if (name) activeLaneNames.add(name);
	}

	// Sort lanes by their stable monotonic index so horizontal ordering is
	// deterministic across re-renders, even after agents leave the session.
	const sortedLanes = [...lanes].sort((a, b) => a.index - b.index);
	const visibleLanes: VisibleLane[] = [];
	const visibleLaneIndexByName = new Map<string, number>();
	for (const lane of sortedLanes) {
		if (!activeLaneNames.has(lane.name)) continue;
		const visibleIndex = visibleLanes.length;
		visibleLanes.push({ lane, visibleIndex });
		visibleLaneIndexByName.set(lane.name, visibleIndex);
	}

	const rows: WaterfallRow[] = [];
	let prevTime: number | null = null;
	let pendingHidden = 0;
	let pendingHiddenStart: number | null = null;
	let pendingHiddenEnd: number | null = null;
	let totalHeight = 0;

	const flushHiddenAsGap = () => {
		if (pendingHidden === 0 || pendingHiddenStart === null || pendingHiddenEnd === null) return;
		const duration = Math.max(0, pendingHiddenEnd - pendingHiddenStart);
		rows.push({
			kind: 'gap',
			key: `gap-hidden-${pendingHiddenStart}-${pendingHiddenEnd}-${pendingHidden}`,
			hiddenCount: pendingHidden,
			durationMs: duration,
			height: gapHeight
		});
		totalHeight += gapHeight;
		pendingHidden = 0;
		pendingHiddenStart = null;
		pendingHiddenEnd = null;
	};

	for (const entry of events) {
		if (!accept(entry)) {
			pendingHidden += 1;
			if (pendingHiddenStart === null) pendingHiddenStart = entry.time;
			pendingHiddenEnd = entry.time;
			continue;
		}

		const dt = prevTime === null ? 0 : Math.max(0, entry.time - prevTime);
		const rawGap = dt * pxPerMs;
		let gapBefore: number;
		if (prevTime === null) {
			gapBefore = 0;
		} else if (rawGap > collapseThresholdPx) {
			// Emit any accumulated hidden-event context first, then a dedicated
			// idle gap row so the visual collapse is explicit.
			flushHiddenAsGap();
			rows.push({
				kind: 'gap',
				key: `gap-idle-${prevTime}-${entry.time}`,
				hiddenCount: pendingHidden, // usually 0 here; flushed above
				durationMs: dt,
				height: gapHeight
			});
			totalHeight += gapHeight;
			gapBefore = minRowGap;
		} else {
			flushHiddenAsGap();
			gapBefore = Math.max(minRowGap, rawGap);
		}

		const name = agentNameForEvent(entry.event);
		const lane = name ? lanes.find((l) => l.name === name) ?? null : null;
		const visibleLaneIndex = name ? visibleLaneIndexByName.get(name) ?? null : null;

		rows.push({
			kind: 'event',
			key: `evt-${entry.seq}`,
			entry,
			laneIndex: lane ? lane.index : null,
			visibleLaneIndex,
			height: rowHeight,
			gapBefore
		});
		totalHeight += rowHeight + gapBefore;
		prevTime = entry.time;
	}

	// Trailing run of filtered events should still surface as a gap so the
	// user knows the tail of the log was suppressed.
	flushHiddenAsGap();

	return { rows, visibleLanes, totalHeight, visibleLaneIndexByName };
}

/**
 * Human-friendly compact duration formatter for gap labels. We deliberately
 * pick the largest unit that fits to keep gap rows scannable at a glance
 * ("3m 12s idle") rather than precise.
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	const rem = s % 60;
	if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
	const h = Math.floor(m / 60);
	const remM = m % 60;
	return remM ? `${h}h ${remM}m` : `${h}h`;
}
