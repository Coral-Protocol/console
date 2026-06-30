import { Context } from 'runed';
import {
	makeFormSchema,
	type CreateSessionRequest,
	type FormSchema
} from '$lib/sessionSchema/types';
import type { CoralServer } from './CoralServer.svelte';
import { z } from 'zod';
import type { SuperForm, SuperFormData, SuperFormErrors } from 'sveltekit-superforms/client';

export type AgentSource = 'marketplace' | 'linked' | 'local';

export type SessionCreatorContext = {
	payload: CreateSessionRequest;
	importSession: (options: { success?: string; from: string }) => boolean;
	addAgent: (name: string, source: AgentSource, version: string) => Promise<void>;

	selectedAgentClientId: string | undefined | null;
	// detailedAgent: Awaited<ReturnType<CoralServer['lookupAgent']>> | null;
	availableAgents:
		| {
				name: string;
				versions: string[];
		  }[]
		| null;
	selectedAgentError: string | Error | null;

	form: SuperForm<z.output<FormSchema>>;
	formData: SuperFormData<z.output<FormSchema>>;
	errors: SuperFormErrors<z.output<FormSchema>>;
};

export const createSessionContext = new Context<SessionCreatorContext>('sessionCreator');

let _current: SessionCreatorContext | null = null;

export function setSessionContext(ctx: SessionCreatorContext) {
	_current = ctx;
	createSessionContext.set(ctx);
}

export function getSessionContext(): SessionCreatorContext {
	if (_current) return _current;
	return createSessionContext.get();
}
