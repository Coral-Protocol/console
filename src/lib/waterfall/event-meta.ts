import type { Component } from 'svelte';

import Plug from '@lucide/svelte/icons/plug';
import PlugOff from '@lucide/svelte/icons/unplug';
import Moon from '@lucide/svelte/icons/moon';
import Sun from '@lucide/svelte/icons/sun';
import Hourglass from '@lucide/svelte/icons/hourglass';
import HourglassOff from '@lucide/svelte/icons/timer-off';
import MessageSquare from '@lucide/svelte/icons/message-square';
import MessagesSquare from '@lucide/svelte/icons/messages-square';
import Brain from '@lucide/svelte/icons/brain';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Container from '@lucide/svelte/icons/container';
import Power from '@lucide/svelte/icons/power';
import PowerOff from '@lucide/svelte/icons/power-off';
import UserPlus from '@lucide/svelte/icons/user-plus';
import UserMinus from '@lucide/svelte/icons/user-minus';
import FilePlus from '@lucide/svelte/icons/file-plus';
import FileX from '@lucide/svelte/icons/file-x';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import ArrowDown from '@lucide/svelte/icons/arrow-down';
import Zap from '@lucide/svelte/icons/zap';

import type { SessionEvent, SessionEventType } from '../session.svelte';

/**
 * Visual metadata for a single event type. Kept intentionally declarative so
 * the waterfall renderer doesn't have to switch on event types itself — the
 * meta table is the single source of truth for icon, color, and category.
 */
export interface EventMeta {
	type: SessionEventType;
	/** Primary icon shown inside the chip. */
	icon: Component;
	/** Short, human-friendly label used in filter pills and tooltips. */
	label: string;
	/** Tailwind text/background color suffixes (e.g. `'sky'`, `'amber'`). */
	color: string;
	/**
	 * Coarse category used by the default filter UI; lets users toggle whole
	 * groups (lifecycle / messaging / llm / runtime) at once.
	 */
	category: 'lifecycle' | 'messaging' | 'llm' | 'runtime' | 'thread';
}

/**
 * Static map of every known SessionEvent type to its visual metadata. New
 * event types added to the API should be registered here; falling back to
 * `defaultEventMeta` keeps the UI functional in the meantime.
 */
export const eventMetaByType: Record<SessionEventType, EventMeta> = {
	agent_connected: {
		type: 'agent_connected',
		icon: Plug,
		label: 'Agent connected',
		color: 'emerald',
		category: 'lifecycle'
	},
	agent_sleep_start: {
		type: 'agent_sleep_start',
		icon: Moon,
		label: 'Sleep start',
		color: 'indigo',
		category: 'lifecycle'
	},
	agent_sleep_stop: {
		type: 'agent_sleep_stop',
		icon: Sun,
		label: 'Sleep stop',
		color: 'amber',
		category: 'lifecycle'
	},
	agent_wait_start: {
		type: 'agent_wait_start',
		icon: Hourglass,
		label: 'Wait start',
		color: 'sky',
		category: 'lifecycle'
	},
	agent_wait_stop: {
		type: 'agent_wait_stop',
		icon: HourglassOff,
		label: 'Wait stop',
		color: 'sky',
		category: 'lifecycle'
	},
	detailed_llm_proxy_request: {
		type: 'detailed_llm_proxy_request',
		icon: ArrowUp,
		label: 'LLM request',
		color: 'violet',
		category: 'llm'
	},
	detailed_llm_proxy_response: {
		type: 'detailed_llm_proxy_response',
		icon: ArrowDown,
		label: 'LLM response',
		color: 'violet',
		category: 'llm'
	},
	llm_proxy_call: {
		type: 'llm_proxy_call',
		icon: Brain,
		label: 'LLM call',
		color: 'fuchsia',
		category: 'llm'
	},
	docker_container_created: {
		type: 'docker_container_created',
		icon: Container,
		label: 'Container created',
		color: 'cyan',
		category: 'runtime'
	},
	docker_container_removed: {
		type: 'docker_container_removed',
		icon: Container,
		label: 'Container removed',
		color: 'slate',
		category: 'runtime'
	},
	runtime_started: {
		type: 'runtime_started',
		icon: Power,
		label: 'Runtime started',
		color: 'emerald',
		category: 'runtime'
	},
	runtime_stopped: {
		type: 'runtime_stopped',
		icon: PowerOff,
		label: 'Runtime stopped',
		color: 'rose',
		category: 'runtime'
	},
	thread_created: {
		type: 'thread_created',
		icon: FilePlus,
		label: 'Thread created',
		color: 'teal',
		category: 'thread'
	},
	thread_closed: {
		type: 'thread_closed',
		icon: FileX,
		label: 'Thread closed',
		color: 'slate',
		category: 'thread'
	},
	thread_message_sent: {
		type: 'thread_message_sent',
		icon: MessageSquare,
		label: 'Message',
		color: 'blue',
		category: 'messaging'
	},
	thread_participant_added: {
		type: 'thread_participant_added',
		icon: UserPlus,
		label: 'Participant added',
		color: 'teal',
		category: 'thread'
	},
	thread_participant_removed: {
		type: 'thread_participant_removed',
		icon: UserMinus,
		label: 'Participant removed',
		color: 'slate',
		category: 'thread'
	}
};

/** Fallback meta used when we encounter an event type the UI doesn't know. */
export const defaultEventMeta: EventMeta = {
	type: 'agent_connected',
	icon: Zap,
	label: 'Event',
	color: 'zinc',
	category: 'lifecycle'
};

export function metaFor(event: SessionEvent): EventMeta {
	return eventMetaByType[event.type] ?? defaultEventMeta;
}

/**
 * Build the brief, primary text shown inside the chip. We keep this very
 * short — the chip body is meant to be scannable, with details deferred to
 * the hover card and dialog.
 */
export function chipPrimaryText(event: SessionEvent): string {
	switch (event.type) {
		case 'thread_message_sent':
			return event.message.threadId.slice(0, 8);
		case 'thread_created':
			return event.thread.name || event.thread.id.slice(0, 8);
		case 'thread_closed':
		case 'thread_participant_added':
		case 'thread_participant_removed':
			return event.threadId.slice(0, 8);
		case 'detailed_llm_proxy_request':
		case 'llm_proxy_call':
			return event.modelName;
		case 'detailed_llm_proxy_response':
			return event.requestId.slice(0, 8);
		case 'docker_container_created':
		case 'docker_container_removed':
			return event.containerId.slice(0, 12);
		default:
			return '';
	}
}

/**
 * Compact list of secondary indicator icons rendered inside the chip after
 * the primary icon. Returning icon-only descriptors lets the chip stay tiny
 * while still surfacing important state (muted message, failed call, etc.).
 */
export interface ChipBadge {
	icon: Component;
	title: string;
}

export function chipBadges(event: SessionEvent): ChipBadge[] {
	const out: ChipBadge[] = [];
	switch (event.type) {
		case 'thread_message_sent':
			if (event.message.mentionNames.length === 0) {
				out.push({ icon: PlugOff, title: 'No mentions (silent)' });
			} else if (event.message.mentionNames.length > 1) {
				out.push({ icon: MessagesSquare, title: `${event.message.mentionNames.length} mentions` });
			}
			break;
		case 'llm_proxy_call':
			if (event.statusCode >= 400) {
				out.push({ icon: Zap, title: `HTTP ${event.statusCode}` });
			}
			break;
		case 'detailed_llm_proxy_request':
			if (event.streaming) out.push({ icon: Sparkles, title: 'Streaming' });
			break;
		default:
			break;
	}
	return out;
}

/** Ordered list of all known event types, used to seed filter UIs. */
export const allEventTypes: SessionEventType[] = Object.keys(
	eventMetaByType
) as SessionEventType[];
