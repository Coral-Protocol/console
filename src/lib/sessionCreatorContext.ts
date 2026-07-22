import { Context } from 'runed';
import type { SessionRequest } from '$generated/api.zod';

export type AgentSource = 'marketplace' | 'linked' | 'local';

export type SessionCreatorContext = {
	payload: SessionRequest;
	importSession: (options: { success?: string; from: string }) => boolean;
	addAgent: (name: string, source: AgentSource, version: string) => Promise<void>;

	selectedAgentIds: string[];
	graphSelectionDragging: boolean;
	// detailedAgent: Awaited<ReturnType<CoralServer['lookupAgent']>> | null;
	availableAgents:
		| {
				name: string;
				versions: string[];
		  }[]
		| null;
	selectedAgentError: string | Error | null;
};

const createSessionContext = new Context<SessionCreatorContext>('sessionCreator');

let _current: SessionCreatorContext | null = null;

export function setSessionContext(ctx: SessionCreatorContext) {
	_current = ctx;
	createSessionContext.set(ctx);
}

export function getSessionContext(): SessionCreatorContext {
	if (_current) return _current;
	return createSessionContext.get();
}
