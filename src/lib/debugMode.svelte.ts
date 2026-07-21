import { PersistedState } from 'runed';

export const debugMode = new PersistedState<boolean>('workbench:debugMode', false, {
	storage: 'session'
});
