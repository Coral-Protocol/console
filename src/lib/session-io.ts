/**
 * Session export / import.
 *
 * Sessions are exported as line-delimited JSON (jsonl). Every line carries a
 * `type` discriminator so the format can grow new line kinds without breaking
 * forward compatibility — importers must silently ignore lines whose `type`
 * they don't recognise.
 *
 * Line kinds currently emitted:
 *   - "header":   one per file, must be the first line; carries sessionId,
 *                 namespace, format version, and export timestamp.
 *   - "agent":    one per known agent (its current/last-seen state).
 *   - "lane":     one per agentLanes entry (preserves horizontal ordering).
 *   - "thread":   one per known thread, with participants flattened to an
 *                 array (the live representation is a SvelteSet).
 *   - "event":    one per event log entry, in arrival order.
 */

import type {
	AgentLane,
	ImportedSessionSnapshot,
	Session,
	SessionEventEntry
} from './session.svelte';
import type { SessionAgentState, SessionThread } from './session.svelte';

export const SESSION_EXPORT_VERSION = 1;

type ExportedThread = Omit<SessionThread, 'participants'> & {
	participants: string[];
	unread: number;
};

type HeaderLine = {
	type: 'header';
	version: number;
	sessionId: string;
	namespace: string;
	exportedAt: string;
};
type AgentLine = { type: 'agent'; name: string; state: SessionAgentState };
type LaneLine = { type: 'lane'; lane: AgentLane };
type ThreadLine = { type: 'thread'; thread: ExportedThread };
type EventLine = { type: 'event'; entry: SessionEventEntry };

type Line = HeaderLine | AgentLine | LaneLine | ThreadLine | EventLine;

/**
 * Serialize a live or imported `Session` to a JSONL string.
 *
 * The line order matters only for the header (must be first); everything
 * else is appended in iteration order for determinism, but importers should
 * not rely on it.
 */
export function exportSessionToJsonl(session: Session): string {
	const lines: Line[] = [];

	lines.push({
		type: 'header',
		version: SESSION_EXPORT_VERSION,
		sessionId: session.sessionId,
		namespace: session.namespace,
		exportedAt: new Date().toISOString()
	});

	for (const [name, state] of Object.entries(session.agents)) {
		lines.push({ type: 'agent', name, state });
	}

	for (const lane of Object.values(session.agentLanes)) {
		lines.push({ type: 'lane', lane });
	}

	for (const thread of Object.values(session.threads)) {
		const { participants, ...rest } = thread;
		lines.push({
			type: 'thread',
			thread: { ...rest, participants: Array.from(participants) }
		});
	}

	for (const entry of session.events) {
		lines.push({ type: 'event', entry });
	}

	return lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
}

/**
 * Trigger a browser download for the given jsonl payload. Filename defaults
 * to a sanitized `<sessionId>.coral-session.jsonl`.
 */
export function downloadSessionExport(session: Session): void {
	const jsonl = exportSessionToJsonl(session);
	const safeId = session.sessionId.replace(/[^a-zA-Z0-9._-]/g, '_') || 'session';
	const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${safeId}.coral-session.jsonl`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Give the browser a tick to start the download before revoking.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse a jsonl string into an `ImportedSessionSnapshot`. Blank lines and
 * lines whose `type` we don't recognise are skipped. Throws if the header
 * line is missing or malformed.
 */
export function parseSessionJsonl(text: string): ImportedSessionSnapshot {
	const rawLines = text.split(/\r?\n/);
	let header: HeaderLine | null = null;
	const agents: ImportedSessionSnapshot['agents'] = {};
	const agentLanes: ImportedSessionSnapshot['agentLanes'] = {};
	const threads: ImportedSessionSnapshot['threads'] = {};
	const events: SessionEventEntry[] = [];

	for (const raw of rawLines) {
		const line = raw.trim();
		if (!line) continue;
		let parsed: Line;
		try {
			parsed = JSON.parse(line) as Line;
		} catch {
			throw new Error('Invalid jsonl: a line is not valid JSON.');
		}
		if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
			throw new Error('Invalid jsonl: missing `type` field on a line.');
		}
		switch (parsed.type) {
			case 'header':
				header = parsed;
				break;
			case 'agent':
				agents[parsed.name] = parsed.state;
				break;
			case 'lane':
				agentLanes[parsed.lane.name] = parsed.lane;
				break;
			case 'thread':
				threads[parsed.thread.id] = parsed.thread;
				break;
			case 'event':
				events.push(parsed.entry);
				break;
			default:
				// Unknown line type — skip for forward compatibility.
				break;
		}
	}

	if (!header) throw new Error('Invalid session export: missing header line.');

	// Sort events by seq for safety, since arrival order in the file is not
	// guaranteed if the producer ever reorders writes.
	events.sort((a, b) => a.seq - b.seq);

	return {
		sessionId: header.sessionId,
		namespace: header.namespace,
		agents,
		agentLanes,
		threads,
		events
	};
}
