/**
 * Build-time flag for the "Shared Session" variant of the console.
 *
 * When the app is built with `VITE_SHARED_SESSION=1` (see the
 * `build:shared` script in `package.json`), it ships as a stand-alone,
 * read-only viewer over a pre-baked `session.jsonl` file. In this mode the
 * console:
 *   - does not attempt to reach any Coral server / WebSocket,
 *   - hides the Namespace and Server sidebar groups (and all related
 *     features such as agent registry / logs / workbench),
 *   - hides the global Search and Help toolbar items,
 *   - rebrands the sidebar header from "Console" to "Shared Session",
 *   - hydrates a single imported `Session` from `${base}/session.jsonl`
 *     on boot and forces the user into the session view.
 */
export const isSharedMode: boolean =
	(import.meta.env.VITE_SHARED_SESSION ?? '') === '1' ||
	(import.meta.env.VITE_SHARED_SESSION ?? '') === 'true';
