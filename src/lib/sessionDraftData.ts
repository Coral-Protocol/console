import { type FormSchema } from '$lib/sessionSchema/types';
import { PersistedState } from 'runed';
import type z from 'zod';

export const sessionDraft = new PersistedState<z.output<FormSchema> | null>(
	'sessionDraftData',
	null
);

export const recentSession = new PersistedState('recentSession', false, { storage: 'session' });
