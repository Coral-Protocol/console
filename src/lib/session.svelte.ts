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

export class Session {
	private socket: WebSocket;
	public connected = $state(false);

	readonly sessionId: string;
	readonly namespace: string;

	public agentId: string | null = $state(null);

	public possessed: string | null = $state(null);

	public agents: { [id: string]: SessionAgentState } = $state({});
	public threads: {
		[id: string]: Omit<SessionThread, 'participants'> & {
			participants: SvelteSet<string>;
			unread: number;
		};
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

	constructor({
		namespace,
		sessionId,
		server
	}: {
		namespace: string;
		sessionId: string;
		server: CoralServer;
	}) {
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
					this.socket.close();
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
				this.socket.close();
			});

		this.namespace = namespace;
		this.sessionId = sessionId;

		this.socket.onopen = () => {
			toast.success('Connected to session.');
			this.connected = true;
		};
		this.socket.onerror = () => {
			toast.error(`Error connecting to session.`);
			this.connected = false;
			this.socket.close();
		};
		this.socket.onclose = (e) => {
			if (this.connected)
				toast.info(`Session connection closed${e.reason ? ` - ${e.reason}` : '.'}`);
			this.threads = {};
			this.agents = {};
			// We intentionally retain `events` and `agentLanes` after a close so
			// the waterfall view doesn't lose its history if the socket drops.
			this.connected = false;
		};
		this.socket.onmessage = async (ev) => {
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
		this.socket.close();
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
			return null;
		default:
			return null;
	}
}
