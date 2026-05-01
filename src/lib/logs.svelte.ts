import type { components } from '$generated/api';
import { createWebsocket } from './websocket.svelte';

export type Log = Omit<components['schemas']['LoggingEvent'], 'timestamp'> & {
	timestamp: Date;
};

export class Logs {
	private socket: WebSocket;
	public readonly session: string;

	public logs: Log[] = $state([]);

	public state: 'connecting' | 'connected' | 'closed' = $state('connecting');

	constructor(
		{
			session
		}: {
			session: string;
		},
		agentId: string
	) {
		this.session = session;
		const sock = createWebsocket(
			`/ws/v1/logs?sessionFilter=${this.session}&agentFilter=${agentId}`,
			'logs'
		);
		if (!sock) throw new Error('cannot create Logs in SSR');
		this.socket = sock;
		this.socket.onopen = () => {
			this.state = 'connected';
		};
		this.socket.onerror = (e) => {
			this.state = 'closed';
			this.socket.close();
			console.log('log socket error: ', e);
		};
		this.socket.onclose = (e) => {
			this.logs = [];
			this.state = 'closed';
			console.log('log socket closed', e);
		};
		this.socket.onmessage = (ev) => {
			let data;
			try {
				data = JSON.parse(ev.data) as components['schemas']['LoggingEvent'];
			} catch (e) {
				console.log('??', e);
				return;
			}

			data && this.logs.push({ ...data, timestamp: new Date(data.timestamp) });
		};
	}
}
