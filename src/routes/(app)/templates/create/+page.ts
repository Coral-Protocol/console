import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { browser } from '$app/environment';

export const load = ({ url }) => {
    
    const query = browser ? url.search : ""; 

    throw redirect(301, `${base}/workbench${query}`);
};