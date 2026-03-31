import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { browser } from '$app/environment';

export const load = ({ url }) => {
    if (!browser) return;
    
    const query = url.search; // includes leading "?" if present

    throw redirect(301, `${base}/workbench${query}`);
};