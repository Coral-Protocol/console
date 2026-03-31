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

		const socket = createWebsocket(`/ws/v1/events/session/${namespace}/${sessionId}`);
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

			switch (data.type) {
				case 'agent_connected':
					if (!this.agents[data.name]) {
						toast.warning("Got agent update about an agent we don't know!");
						return;
					}
					this.agents[data.name]!.status = {
						type: 'running',
						connectionStatus: { type: 'not_connected' }
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
					this.agents[data.name]!.status = { type: 'stopped' };
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
}
