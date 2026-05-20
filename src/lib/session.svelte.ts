import type { Agent, Message, Thread } from './threads';
import { toast } from 'svelte-sonner';

import type { components } from '../generated/api';
import { base } from '$app/paths';
import { SvelteSet } from 'svelte/reactivity';
import type { CoralServer } from './CoralServer.svelte';
import { createWebsocket } from './websocket.svelte';

export type SessionAgentState = components['schemas']['SessionAgentState'];
export type SessionAgentStatus = SessionAgentState['status'];

export type SessionThread = components['schemas']['SessionThread'];

export type SessionEvent = components['schemas']['SessionEvent'];
export type SessionEventType = SessionEvent['type'];

/**
 * Event entry captured in the session-wide event log.
 *
 * `seq` is a monotonically increasing index assigned in arrival order. We use
 * it as a stable, unique key (timestamps may collide on bursty traffic) and as
 * a tiebreaker when sorting. `time` is the parsed event timestamp as a number
 * of milliseconds since epoch, which the waterfall view uses for time scaling.
 */
export interface SessionEventEntry {
	seq: number;
	time: number;
	event: SessionEvent;
}

/**
 * Per-agent metadata maintained by the waterfall view.
 *
 * `index` is a stable, never-reused horizontal lane position. New agents that
 * appear after the session has started receive higher indices than any
 * previous agent. Removing an agent does not change anyone else's index, and
 * the entry stays in the registry so historical events remain renderable.
 */
export interface AgentLane {
	name: string;
	index: number;
	/** Wallclock time (ms) the agent was first seen by the registry. */
	firstSeen: number;
	/** Whether the agent is still present in `session.agents`. */
	present: boolean;
}

export type SessionThreadState = Omit<SessionThread, 'participants'> & {
	participants: SvelteSet<string>;
	unread: number;
};

/**
 * A "group" is a set of agents that the backend declared visible to each
 * other via a `group_added` event. Groups are append-only — once added,
 * they remain in the registry; new groups appear as the session evolves.
 */
export interface SessionGroup {
	/** Stable, never-reused index assigned in arrival order. */
	index: number;
	agents: string[];
	/** Wallclock time (ms) the group was first observed. */
	firstSeen: number;
}

/**
 * Plain (serializable) snapshot of a session, suitable for export/import.
 * `participants` is stored as a plain array; the constructor re-wraps it as
 * a `SvelteSet` when hydrating.
 */
export interface ImportedSessionSnapshot {
	sessionId: string;
	namespace: string;
	agents: { [id: string]: SessionAgentState };
	threads: {
		[id: string]: Omit<SessionThread, 'participants'> & {
			participants: string[];
			unread: number;
		};
	};
	agentLanes: { [name: string]: AgentLane };
	groups?: SessionGroup[];
	events: SessionEventEntry[];
}

export class Session {
	private socket: WebSocket | null = null;
	public connected = $state(false);

	readonly sessionId: string;
	readonly namespace: string;
	/**
	 * `true` for sessions hydrated from an exported jsonl file. Imported
	 * sessions have no live websocket and are read-only snapshots.
	 */
	public readonly imported: boolean = false;

	public agentId: string | null = $state(null);

	public possessed: string | null = $state(null);

	public agents: { [id: string]: SessionAgentState } = $state({});
	public threads: {
		[id: string]: SessionThreadState;
	} = $state({});

	/**
	 * Rolling event log used by the waterfall view. Capped at `eventLogLimit`
	 * to keep memory bounded on long-running sessions; oldest entries are
	 * dropped first.
	 */
	public events: SessionEventEntry[] = $state([]);
	public readonly eventLogLimit = 10000;
	private nextSeq = 0;

	/**
	 * Stable lane registry. Entries are append-only: removing an agent flips
	 * `present` to `false` but never reuses or reorders indices.
	 */
	public agentLanes: { [name: string]: AgentLane } = $state({});
	private nextAgentIndex = 0;

	/**
	 * Append-only registry of agent groups observed via `group_added`
	 * events. Order matches arrival order. Duplicate groups (same set of
	 * agents) are ignored, so reconnecting clients that replay groups don't
	 * accumulate duplicates.
	 */
	public groups: SessionGroup[] = $state([]);
	private nextGroupIndex = 0;

	constructor(
		opts:
			| { namespace: string; sessionId: string; server: CoralServer }
			| { imported: ImportedSessionSnapshot }
	) {
		if ('imported' in opts) {
			const snap = opts.imported;
			this.imported = true;
			this.namespace = snap.namespace;
			this.sessionId = snap.sessionId;
			this.agents = { ...snap.agents };
			this.threads = Object.fromEntries(
				Object.entries(snap.threads).map(([id, t]) => [
					id,
					{ ...t, participants: new SvelteSet(t.participants) }
				])
			);
			this.agentLanes = { ...snap.agentLanes };
			this.groups = (snap.groups ?? []).slice();
			this.nextGroupIndex = this.groups.reduce((m, g) => Math.max(m, g.index + 1), 0);
			this.events = snap.events.slice();
			this.nextSeq = snap.events.reduce((m, e) => Math.max(m, e.seq + 1), 0);
			this.nextAgentIndex = Object.values(snap.agentLanes).reduce(
				(m, l) => Math.max(m, l.index + 1),
				0
			);
			this.connected = false;
			return;
		}

		const { namespace, sessionId, server } = opts;
		let markInitialStateReady: (value?: any) => void;
		const initialStateReady = new Promise((resolve) => {
			markInitialStateReady = resolve;
		});

		const socket = createWebsocket(`/ws/v1/events/session/${namespace}/${sessionId}`, 'session');
		if (!socket) throw new Error('cannot construct for SSR');
		this.socket = socket;

		server.api
			.GET('/api/v1/local/session/{namespace}/{sessionId}/extended', {
				params: { path: { namespace, sessionId: sessionId } }
			})
			.then((res) => {
				if (res.error || !res.data) {
					this.connected = false;
					toast.error(
						`Error fetching session state${res.error ? ` - ${res.error.message}.` : '.'}`
					);
					socket.close();
					return;
				}
				this.threads = Object.fromEntries(
					res.data.threads.map((thread) => {
						return [
							thread.id,
							{
								...thread,
								participants: new SvelteSet(thread.participants),
								unread: thread.messages.length
							}
						];
					})
				);
				this.agents = Object.fromEntries(res.data.agents.map((agent) => [agent.name, agent]));
				// Seed the lane registry with the agents present at connect time so
				// historical events (and re-renders after reconnect) keep a stable
				// horizontal ordering. We sort by name for deterministic initial
				// layout; subsequently joining agents get appended.
				const seedTime = Date.now();
				for (const name of Object.keys(this.agents).sort()) {
					this.touchAgentLane(name, seedTime);
				}
				markInitialStateReady();
			})
			.catch((reason) => {
				this.connected = false;
				toast.error(`Error fetching session state${reason ? ` - ${reason}.` : '.'}`, {
					duration: Infinity
				});
				socket.close();
			});

		this.namespace = namespace;
		this.sessionId = sessionId;

		socket.onopen = () => {
			toast.success('Connected to session.');
			this.connected = true;
		};
		socket.onerror = () => {
			toast.error(`Error connecting to session.`);
			this.connected = false;
			socket.close();
		};
		socket.onclose = (e) => {
			if (this.connected)
				toast.info(`Session connection closed${e.reason ? ` - ${e.reason}` : '.'}`);
			this.threads = {};
			this.agents = {};
			// We intentionally retain `events` and `agentLanes` after a close so
			// the waterfall view doesn't lose its history if the socket drops.
			this.connected = false;
		};
		socket.onmessage = async (ev) => {
			// we don't process any events until initial state fetch,
			// since events can give us only partial info on agents/threads
			await initialStateReady;

			let data = null;
			try {
				data = JSON.parse(ev.data) as components['schemas']['SessionEvent'];
			} catch (e) {
				toast.warning(`ws: '${ev.data}'`);
				return;
			}

			// Record every parsed event into the rolling log before mutating
			// derived state — that way the waterfall sees agent_connected
			// events even for agents we hadn't previously tracked.
			const parsedTime = Date.parse(data.timestamp);
			const entryTime = Number.isFinite(parsedTime) ? parsedTime : Date.now();
			// Ensure a lane exists for any agent referenced by the event so the
			// waterfall can place the chip immediately.
			const referencedAgent = agentNameForEvent(data);
			if (referencedAgent) this.touchAgentLane(referencedAgent, entryTime);
			this.recordEvent({ seq: this.nextSeq++, time: entryTime, event: data });

			switch (data.type) {
				case 'agent_connected':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'running',
						startTime: data.timestamp, // FIXME: make this actually correct
						connectionStatus: { type: 'connected', communicationStatus: { type: 'thinking' } }
					};
					break;
				case 'agent_wait_start':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = { type: 'waiting' };
					break;
				case 'agent_wait_stop':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'running',
						startTime: data.timestamp, // FIXME: make this actually correct
						connectionStatus: { type: 'connected', communicationStatus: { type: 'thinking' } }
					};
					break;
				case 'agent_sleep_start':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'running',
						startTime: data.timestamp, // FIXME: make this actually correct
						connectionStatus: { type: 'connected', communicationStatus: { type: 'sleeping' } }
					};
					break;
				case 'agent_sleep_stop':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'running',
						startTime: data.timestamp, // FIXME: make this actually correct
						connectionStatus: { type: 'connected', communicationStatus: { type: 'thinking' } }
					};
					break;
				case 'runtime_started':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'running',
						startTime: data.timestamp, // FIXME: make this actually correct
						connectionStatus: { type: 'not_connected' }
					};
					break;
				case 'runtime_stopped':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'stopped'
					};
					// Lane registry keeps the index; we only flip `present` so the
					// waterfall can grey out the column header without reflowing.
					if (this.agentLanes[data.name]) this.agentLanes[data.name]!.present = false;
					break;
				case 'thread_created':
					console.log('new thread');
					this.threads[data.thread.id] = {
						...data.thread,
						participants: new SvelteSet(data.thread.participants),
						unread: data.thread.messages.length
					};
					break;
				case 'thread_message_sent':
					if (data.message.threadId in this.threads) {
						this.threads[data.message.threadId]!.messages.push(data.message);
						this.threads[data.message.threadId]!.unread += 1;
					} else {
						console.warn("got new msg in thread we don't know!", {
							data: data,
							threads: this.threads
						});
					}
					break;
				case 'thread_closed':
					if (!this.threads[data.threadId]) return;
					this.threads[data.threadId]!.state = {
						state: 'closed',
						summary: data.summary,
						timestamp: data.timestamp
					};
					break;
				case 'thread_participant_added':
					if (!this.threads[data.threadId]) return;
					this.threads[data.threadId]!.participants.add(data.name);
					break;
				case 'thread_participant_removed':
					if (!this.threads[data.threadId]) return;
					this.threads[data.threadId]!.participants.delete(data.name);
					break;
				case 'group_added':
					this.recordGroup(data.agents, entryTime);
					break;
				case undefined:
				case null:
					toast.error('WS with empty message type! Please report this to the team.');
					console.error('ws type == null', { data });
					break;
				default:
					console.warn('WS data type an expected value', { data });
					break;
			}
		};
	}

	public close() {
		this.socket?.close();
	}

	/**
	 * Register/refresh a lane for `name`. New agents are appended with the
	 * next monotonic index; previously-seen agents have their `present` flag
	 * flipped back to `true`. Indices are never reused.
	 */
	private touchAgentLane(name: string, time: number) {
		const existing = this.agentLanes[name];
		if (existing) {
			if (!existing.present) existing.present = true;
			return;
		}
		this.agentLanes[name] = {
			name,
			index: this.nextAgentIndex++,
			firstSeen: time,
			present: true
		};
	}

	/**
	 * Push an event into the rolling log, trimming the oldest entries past
	 * `eventLogLimit`. We splice in-place so Svelte's reactivity picks up the
	 * change and downstream `$derived` recomputes only once per message.
	 */
	private recordEvent(entry: SessionEventEntry) {
		this.events.push(entry);
		const overflow = this.events.length - this.eventLogLimit;
		if (overflow > 0) this.events.splice(0, overflow);
	}

	/**
	 * Add a new group to the registry, deduplicating on exact agent-set
	 * equality. Member ordering within a group is preserved (it carries
	 * meaning at the source) but membership is treated as a set when
	 * comparing for duplicates so a reconnect doesn't churn the list.
	 *
	 * Also makes sure each referenced agent has a lane entry so downstream
	 * views can render the new node immediately even if no other event has
	 * mentioned that agent yet.
	 */
	private recordGroup(agents: string[], time: number) {
		const key = [...agents].sort().join('\u0000');
		for (const g of this.groups) {
			if ([...g.agents].sort().join('\u0000') === key) return;
		}
		for (const name of agents) this.touchAgentLane(name, time);
		this.groups.push({
			index: this.nextGroupIndex++,
			agents: agents.slice(),
			firstSeen: time
		});
	}
}

/**
 * Map a SessionEvent to the agent it is "about", if any. Events with an
 * `agentName` (LLM proxy traffic) and `name` (agent lifecycle, thread
 * participants) are agent-scoped; thread message events are attributed to
 * the sender. Thread lifecycle and docker container events are not
 * agent-scoped and return `null`.
 */
export function agentNameForEvent(event: SessionEvent): string | null {
	switch (event.type) {
		case 'agent_connected':
		case 'agent_sleep_start':
		case 'agent_sleep_stop':
		case 'agent_wait_start':
		case 'agent_wait_stop':
		case 'runtime_started':
		case 'runtime_stopped':
		case 'thread_participant_added':
		case 'thread_participant_removed':
			return event.name;
		case 'detailed_llm_proxy_request':
		case 'detailed_llm_proxy_response':
		case 'llm_proxy_call':
			return event.agentName;
		case 'thread_message_sent':
			return event.message.senderName;
		case 'thread_created':
		case 'thread_closed':
		case 'docker_container_created':
		case 'docker_container_removed':
		case 'group_added':
			return null;
		default:
			return null;
	}
}
