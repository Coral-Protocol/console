import { PersistedState } from 'runed';
import type z from 'zod';
import {
	makeFormSchema,
	type CreateSessionRequest,
	type FormSchema
} from '$lib/sessionSchema/types';

export const sessionDraft = new PersistedState<CreateSessionRequest | null>(
	'sessionDraftData',
	null
);

export const recentSession = new PersistedState('recentSession', false, { storage: 'session' });
