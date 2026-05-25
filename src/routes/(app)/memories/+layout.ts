// Saved Memories live entirely in the browser (IndexedDB), and the editor
// route uses a dynamic id segment that the prerenderer can't enumerate. Opt
// the whole subtree out of prerendering so `vite build` succeeds and the
// pages are served as SPA shells.
export const prerender = false;
export const ssr = false;
