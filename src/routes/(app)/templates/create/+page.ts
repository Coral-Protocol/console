import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export const load = ({ url }) => {
    const query = url.search; // includes leading "?" if present

    throw redirect(301, `${base}/workbench${query}`);
};