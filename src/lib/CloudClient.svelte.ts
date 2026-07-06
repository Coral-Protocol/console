import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';
import config from './config';

export type Balance = { total: number; sessionReserved: number };

export type ApiResponse<T> = { error: true; message: string } | { error: false; body: T };

export default class CloudClient {
	public balance: Balance | null = $state(null);

	protected async fetch<T>(
		method: 'GET' | 'POST',
		url: `/${string}`,
		body?: { [K: string]: any }
	): Promise<ApiResponse<T>> {
		if (!browser) {
			return { error: true, message: 'cannot hydrate' };
		}
		try {
			const res = await fetch(config.PUBLIC_CLOUD_API_PATH + url, {
				method,
				body: body && JSON.stringify(body),
				credentials: 'include'
			});
			const data = await res.json();
			if (res.ok) {
				return { error: false, body: data };
			}
			return { error: true, message: data.message };
		} catch (e) {
			return { error: true, message: `${e}` };
		}
	}

	public async getBalance() {
		const res = await this.fetch<Balance>('GET', '/balance');
		if (res.error) {
			toast.error(`Failed to fetch Cloud balance - ${res.message}`);
		} else {
			this.balance = {
				total: res.body.total / 100,
				sessionReserved: res.body.sessionReserved / 100
			};
		}
	}
}
