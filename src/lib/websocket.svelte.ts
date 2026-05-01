import { browser } from '$app/environment';
import { config } from '$lib/config';

let cache: Record<string, WebSocket> = {};

export const createWebsocket = (path: `/ws/${string}`, cacheKey: string) => {
	if (!browser) return null;
	let url = config.PUBLIC_API_PATH;
	if (url[0] === '/') {
		url = `${window.location.protocol == 'https:' ? 'wss' : 'ws'}://${window.location.host}${url.replace(/\/$/, '')}`;
	} else if (url[0] === 'h') {
		url = url.replace(/^http/, 'ws').replace(/\/$/, '');
	} else {
		console.error('Bad PUBLIC_API_PATH!', { path: config.PUBLIC_API_PATH });
	}
	const ws = new WebSocket(url + path);

	const existing = cache[cacheKey];
	if (existing) {
		existing.close();
	}
	cache[cacheKey] = ws;

	return ws;
};
