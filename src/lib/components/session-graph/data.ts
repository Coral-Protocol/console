/**
 * Derives the static graph topology and per-node statistics from the
 * Session's reactive state. Kept as a pure module so the component file
 * stays focused on rendering and animation.
 *
 * Node id conventions:
 *   - Agents:  `a:<name>`
 *   - Threads: `t:<id>`
 *
 * Two link kinds are emitted:
 *   - "group": every pair of agents in a `group_added` group. Dashed,
 *      drawn behind everything else; deduplicated across overlapping
 *      groups so we don't stack identical lines.
 *   - "participation": each thread → each of its current participants.
 *      Solid; this is what message-flashes ride.
 *
 * Statistics are exposed via {@link StatsAccumulator}, an *incremental*
 * accumulator: callers feed it the live event log on every frame and it
 * only walks the suffix appended since the last call. This is what keeps
 * the graph view affordable on sessions with thousands of events.
 */

import type { SessionEventEntry, SessionGroup, SessionThreadState } from '$lib/session.svelte';

export interface AgentStats {
	llmCalls: number;
	messagesSent: number;
	threads: number;
}
export interface ThreadStats {
	messages: number;
	participants: number;
	state: 'open' | 'closed';
}

export interface BuiltGraphData {
	nodes: { id: string; kind: 'agent' | 'thread'; label: string }[];
	links: {
		id: string;
		source: string;
		target: string;
		kind: 'group' | 'participation';
		distance: number;
		strength: number;
	}[];
}

export function buildGraphData(
	agents: string[],
	threads: SessionThreadState[],
	groups: SessionGroup[]
): BuiltGraphData {
	const nodes: BuiltGraphData['nodes'] = [];
	const links: BuiltGraphData['links'] = [];

	for (const name of agents) nodes.push({ id: `a:${name}`, kind: 'agent', label: name });
	for (const t of threads) {
		nodes.push({ id: `t:${t.id}`, kind: 'thread', label: t.name || t.id.slice(0, 8) });
	}

	// Group edges — deduplicate across overlapping groups using a sorted
	// "a|b" key so the same pair never gets two parallel lines.
	const seenGroupPair = new Set<string>();
	for (const g of groups) {
		for (let i = 0; i < g.agents.length; i++) {
			for (let j = i + 1; j < g.agents.length; j++) {
				const a = g.agents[i]!;
				const b = g.agents[j]!;
				const key = a < b ? `${a}|${b}` : `${b}|${a}`;
				if (seenGroupPair.has(key)) continue;
				seenGroupPair.add(key);
				links.push({
					id: `g:${key}`,
					source: `a:${a}`,
					target: `a:${b}`,
					kind: 'group',
					distance: 180,
					strength: 0.04
				});
			}
		}
	}

	// Participation edges.
	for (const t of threads) {
		for (const p of t.participants) {
			links.push({
				id: `p:${t.id}:${p}`,
				source: `t:${t.id}`,
				target: `a:${p}`,
				kind: 'participation',
				distance: 130,
				strength: 0.08
			});
		}
	}

	return { nodes, links };
}

/**
 * Incremental agent + thread statistics. `ingest` only walks the events
 * appended since the last call, which keeps the per-frame cost O(new
 * events) instead of O(all events). The accumulator transparently
 * resets itself if it detects the log was truncated, replaced, or
 * re-keyed (e.g. session reconnect, jsonl import).
 */
export class StatsAccumulator {
	agentStats: Record<string, AgentStats> = {};
	threadStats: Record<string, ThreadStats> = {};
	/** Per-agent set of thread ids ever participated in (drives `threads`). */
	private threadsByAgent = new Map<string, Set<string>>();
	/** Highest event `seq` already folded in. -1 = nothing yet. */
	private lastSeq = -1;
	/** Reference equality token; if the events array is swapped out (e.g.
	 *  the host re-creates the array on a reconnect), we re-baseline. */
	private lastArray: SessionEventEntry[] | null = null;

	/**
	 * Ensure stat buckets exist for the current agent / thread roster so
	 * nodes with zero events still render zeros instead of `undefined`.
	 */
	syncRoster(agents: string[], threads: SessionThreadState[]) {
		for (const name of agents) {
			if (!this.agentStats[name]) {
				this.agentStats[name] = { llmCalls: 0, messagesSent: 0, threads: 0 };
			}
		}
		for (const t of threads) {
			const ts = this.threadStats[t.id];
			const participants = t.participants.size;
			const messages = t.messages.length;
			const state = t.state.state;
			if (!ts) {
				this.threadStats[t.id] = { messages, participants, state };
			} else if (
				ts.messages !== messages ||
				ts.participants !== participants ||
				ts.state !== state
			) {
				ts.messages = messages;
				ts.participants = participants;
				ts.state = state;
			}
		}
	}

	ingest(events: SessionEventEntry[]) {
		if (events !== this.lastArray) {
			// Array identity changed. If it still appears to be a strict
			// suffix-extension we can keep our state; otherwise reset.
			if (
				this.lastArray &&
				events.length >= this.lastArray.length &&
				events[this.lastArray.length - 1]?.seq === this.lastArray[this.lastArray.length - 1]?.seq
			) {
				// continuation; keep state
			} else {
				this.reset();
			}
			this.lastArray = events;
		}
		// `events` is append-mostly and monotonically increasing in `seq`.
		// Find the first index whose `seq` is past `lastSeq` via a scan
		// from the tail — terminates in O(1) on steady-state and O(k)
		// when a burst of k events landed since the last call.
		let lastSeq = this.lastSeq;
		let firstNew = events.length;
		for (let i = events.length - 1; i >= 0; i--) {
			if (events[i]!.seq <= lastSeq) {
				firstNew = i + 1;
				break;
			}
			if (i === 0) firstNew = 0;
		}
		const tba = this.threadsByAgent;
		for (let i = firstNew; i < events.length; i++) {
			const e = events[i]!;
			if (e.seq <= lastSeq) continue;
			lastSeq = e.seq;
			const ev = e.event;
			switch (ev.type) {
				case 'detailed_llm_proxy_request':
				case 'llm_proxy_call': {
					const a = (this.agentStats[ev.agentName] ??= {
						llmCalls: 0,
						messagesSent: 0,
						threads: 0
					});
					a.llmCalls += 1;
					break;
				}
				case 'thread_message_sent': {
					const name = ev.message.senderName;
					const a = (this.agentStats[name] ??= {
						llmCalls: 0,
						messagesSent: 0,
						threads: 0
					});
					a.messagesSent += 1;
					let ts = tba.get(name);
					if (!ts) {
						ts = new Set<string>();
						tba.set(name, ts);
					}
					const before = ts.size;
					ts.add(ev.message.threadId);
					if (ts.size !== before) a.threads = ts.size;
					break;
				}
				case 'thread_participant_added': {
					const name = ev.name;
					let ts = tba.get(name);
					if (!ts) {
						ts = new Set<string>();
						tba.set(name, ts);
					}
					const before = ts.size;
					ts.add(ev.threadId);
					if (ts.size !== before) {
						const a = (this.agentStats[name] ??= {
							llmCalls: 0,
							messagesSent: 0,
							threads: 0
						});
						a.threads = ts.size;
					}
					break;
				}
				default:
					break;
			}
		}
		this.lastSeq = lastSeq;
	}

	reset() {
		this.agentStats = {};
		this.threadStats = {};
		this.threadsByAgent = new Map();
		this.lastSeq = -1;
	}
}
