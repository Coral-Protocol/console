/**
 * Visual derivations + canvas icon helpers for {@link SessionGraph}.
 *
 * Kept in its own module so the component file stays focused on
 * orchestration, and so the (relatively cheap but per-node) state
 * lookups and the icon-drawing primitives can be unit-tested or reused.
 */

import type { SessionAgentState, SessionThreadState } from '$lib/session.svelte';

/** Coarse status the UI represents distinctly. */
export type AgentVisualStatus =
	| 'thinking'
	| 'waiting_message'
	| 'sleeping'
	| 'waiting'
	| 'stopped'
	| 'not_connected'
	| 'unknown';

export interface AgentVisual {
	status: AgentVisualStatus;
	color: string; // accent / border colour
	label: string; // human-readable status label for tooltips
}

const STATUS_COLORS: Record<AgentVisualStatus, string> = {
	thinking: '#f59e0b', // amber-500 — actively computing
	waiting_message: '#3b82f6', // blue-500 — idle, awaiting input
	sleeping: '#64748b', // slate-500 — yielded
	waiting: '#a855f7', // purple-500 — pre-startup
	stopped: '#ef4444', // red-500 — terminated
	not_connected: '#9ca3af', // gray-400 — registered but offline
	unknown: '#10b981' // emerald-500 — fallback (matches old default)
};

const STATUS_LABELS: Record<AgentVisualStatus, string> = {
	thinking: 'Thinking',
	waiting_message: 'Waiting for message',
	sleeping: 'Sleeping',
	waiting: 'Waiting to start',
	stopped: 'Stopped',
	not_connected: 'Not connected',
	unknown: 'Unknown'
};

export function agentVisual(a: SessionAgentState | undefined): AgentVisual {
	let status: AgentVisualStatus = 'unknown';
	const s = a?.status;
	if (s) {
		if (s.type === 'running') {
			const conn = s.connectionStatus;
			if (conn.type === 'not_connected') status = 'not_connected';
			else status = conn.communicationStatus.type as AgentVisualStatus;
		} else if (s.type === 'stopped') status = 'stopped';
		else if (s.type === 'waiting') status = 'waiting';
	}
	return { status, color: STATUS_COLORS[status], label: STATUS_LABELS[status] };
}

export interface ThreadVisual {
	closed: boolean;
	limited: boolean; // limitToPostingBy non-empty
	color: string;
	label: string;
}

export function threadVisual(t: SessionThreadState | undefined): ThreadVisual {
	const closed = t?.state.state === 'closed';
	const limited = (t?.limitToPostingBy?.length ?? 0) > 0;
	return {
		closed,
		limited,
		color: closed ? '#f59e0b' : '#14b8a6', // amber when closed, teal when open
		label: closed ? 'Closed' : limited ? 'Open (limited posters)' : 'Open'
	};
}

// ── Canvas glyphs ────────────────────────────────────────────────────
// Tiny stylised icons drawn inside the existing node shapes. We avoid
// loading SVGs / image assets to keep per-frame paint cost predictable
// at thousands of nodes.

/** Draw a simple "person" silhouette centred at (x, y), sized roughly r. */
export function drawAgentIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	color: string
) {
	ctx.save();
	ctx.fillStyle = color;
	const headR = r * 0.32;
	const headY = y - r * 0.28;
	// head
	ctx.beginPath();
	ctx.arc(x, headY, headR, 0, Math.PI * 2);
	ctx.fill();
	// shoulders / torso (rounded hump)
	ctx.beginPath();
	const bodyTop = headY + headR * 0.7;
	const bodyW = r * 0.95;
	const bodyH = r * 0.7;
	ctx.moveTo(x - bodyW, y + bodyH * 0.7);
	ctx.quadraticCurveTo(x - bodyW, bodyTop, x, bodyTop);
	ctx.quadraticCurveTo(x + bodyW, bodyTop, x + bodyW, y + bodyH * 0.7);
	ctx.lineTo(x - bodyW, y + bodyH * 0.7);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
}

/** Draw a speech-bubble glyph centred at (x, y) for a thread node. */
export function drawThreadIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	halfW: number,
	halfH: number,
	color: string
) {
	ctx.save();
	ctx.fillStyle = color;
	// Three dots
	const cy = y - 1;
	const dotR = Math.min(halfW, halfH) * 0.14;
	const gap = dotR * 2.8;
	ctx.beginPath();
	ctx.arc(x - gap, cy, dotR, 0, Math.PI * 2);
	ctx.arc(x, cy, dotR, 0, Math.PI * 2);
	ctx.arc(x + gap, cy, dotR, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/** Tiny status pip drawn at the top-right of an agent circle. */
export function drawStatusPip(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	color: string,
	pulse: number /* 0..1 */
) {
	ctx.save();
	const px = x + r * 0.72;
	const py = y - r * 0.72;
	const baseR = 4;
	ctx.beginPath();
	ctx.arc(px, py, baseR + 2 * pulse, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.globalAlpha = 0.35 * (1 - pulse);
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.beginPath();
	ctx.arc(px, py, baseR, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = '#ffffff';
	ctx.stroke();
	ctx.restore();
}
