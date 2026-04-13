import type { SessionAgentStatus } from './session.svelte';

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};
type ChildKeys<T, K> = Omit<Extract<T, { type: K }>, 'type' | 'startTime'>;

type DeepMap<T, V> = [T] extends [{ type: string }]
	? {
			[K in T['type']]: keyof ChildKeys<T, K> extends never
				? V
				: DeepMap<ChildKeys<T, K>[keyof ChildKeys<T, K>], V>;
		}
	: never;

export type SessionAgentStatusMap<V> = Prettify<DeepMap<SessionAgentStatus, V>>;

export const humanReadableMap: SessionAgentStatusMap<string> = {
	running: {
		connected: {
			sleeping: 'sleeping',
			thinking: 'thinking',
			waiting_message: 'waiting for message'
		},
		not_connected: 'not connected'
	},
	stopped: 'stopped',
	waiting: 'waiting'
};

export const resolveStateMap = <V extends Exclude<unknown, object>>(
	state: SessionAgentStatus,
	map: SessionAgentStatusMap<V>
): V => {
	if (state.type !== 'running') return map[state.type];
	if (state.connectionStatus.type === 'not_connected')
		return map.running[state.connectionStatus.type];
	return map.running.connected[state.connectionStatus.communicationStatus.type];
};
