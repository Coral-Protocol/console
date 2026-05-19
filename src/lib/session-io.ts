/**
 * Session export / import.
 *
 * Sessions are exported as line-delimited JSON (jsonl). Every line carries a
 * `type` discriminator so the format can grow new line kinds without breaking
 * forward compatibility — importers must silently ignore lines whose `type`
 * they don't recognise.
 *
 * Line kinds currently emitted:
 *   - "header":   one per file, must be the first line; carries sessionId,
 *                 namespace, format version, and export timestamp.
 *   - "agent":    one per known agent (its current/last-seen state).
 *   - "lane":     one per agentLanes entry (preserves horizontal ordering).
 *   - "thread":   one per known thread, with participants flattened to an
 *                 array (the live representation is a SvelteSet).
 *   - "event":    one per event log entry, in arrival order.
 */

import type {
	AgentLane,
	ImportedSessionSnapshot,
	Session,
	SessionEventEntry
} from './session.svelte';
import type { SessionAgentState, SessionThread } from './session.svelte';

export const SESSION_EXPORT_VERSION = 1;

type ExportedThread = Omit<SessionThread, 'participants'> & {
	participants: string[];
	unread: number;
};

type HeaderLine = {
	type: 'header';
	version: number;
	sessionId: string;
	namespace: string;
	exportedAt: string;
};
type AgentLine = { type: 'agent'; name: string; state: SessionAgentState };
type LaneLine = { type: 'lane'; lane: AgentLane };
type ThreadLine = { type: 'thread'; thread: ExportedThread };
type EventLine = { type: 'event'; entry: SessionEventEntry };

type Line = HeaderLine | AgentLine | LaneLine | ThreadLine | EventLine;

/**
 * Serialize a live or imported `Session` to a JSONL string.
 *
 * The line order matters only for the header (must be first); everything
 * else is appended in iteration order for determinism, but importers should
 * not rely on it.
 */
export function exportSessionToJsonl(session: Session): string {
	const lines: Line[] = [];

	lines.push({
		type: 'header',
		version: SESSION_EXPORT_VERSION,
		sessionId: session.sessionId,
		namespace: session.namespace,
		exportedAt: new Date().toISOString()
	});

	for (const [name, state] of Object.entries(session.agents)) {
		lines.push({ type: 'agent', name, state });
	}

	for (const lane of Object.values(session.agentLanes)) {
		lines.push({ type: 'lane', lane });
	}

	for (const thread of Object.values(session.threads)) {
		const { participants, ...rest } = thread;
		lines.push({
			type: 'thread',
			thread: { ...rest, participants: Array.from(participants) }
		});
	}

	for (const entry of session.events) {
		lines.push({ type: 'event', entry });
	}

	return lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
}

function sanitizeId(sessionId: string): string {
	return sessionId.replace(/[^a-zA-Z0-9._-]/g, '_') || 'session';
}

function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Give the browser a tick to start the download before revoking.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Trigger a browser download for the given jsonl payload. Filename defaults
 * to a sanitized `<sessionId>.coral-session.jsonl`.
 */
export function downloadSessionExport(session: Session): void {
	const jsonl = exportSessionToJsonl(session);
	const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
	triggerDownload(blob, `${sanitizeId(session.sessionId)}.coral-session.jsonl`);
}

// --------------------------------------------------------------------------
// ZIP bundle export
// --------------------------------------------------------------------------

// Pre-computed CRC32 table.
const CRC32_TABLE: Uint32Array = (() => {
	const t = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[i] = c >>> 0;
	}
	return t;
})();

function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		const b = bytes[i] ?? 0;
		c = (CRC32_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
	name: string;
	data: Uint8Array;
	/** Unix mode bits, e.g. 0o100755 for executable files. */
	mode: number;
}

/**
 * Build a minimal ZIP archive (store / no compression) from the given
 * entries. Sufficient for our use case — payloads are small and the archive
 * just needs to be openable by stock `unzip` / OS tooling.
 */
function buildZip(entries: ZipEntry[]): Uint8Array {
	const enc = new TextEncoder();
	const localParts: Uint8Array[] = [];
	const centralParts: Uint8Array[] = [];
	let offset = 0;

	// Fixed DOS time/date — 1980-01-01 00:00:00. The viewer doesn't care.
	const dosTime = 0;
	const dosDate = (1 << 5) | 1; // month=1, day=1

	for (const e of entries) {
		const nameBytes = enc.encode(e.name);
		const crc = crc32(e.data);
		const size = e.data.length;

		const localHeader = new Uint8Array(30 + nameBytes.length);
		const lv = new DataView(localHeader.buffer);
		lv.setUint32(0, 0x04034b50, true); // local file header sig
		lv.setUint16(4, 20, true); // version needed
		lv.setUint16(6, 0, true); // flags
		lv.setUint16(8, 0, true); // method = store
		lv.setUint16(10, dosTime, true);
		lv.setUint16(12, dosDate, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, size, true); // compressed size
		lv.setUint32(22, size, true); // uncompressed size
		lv.setUint16(26, nameBytes.length, true);
		lv.setUint16(28, 0, true); // extra length
		localHeader.set(nameBytes, 30);

		localParts.push(localHeader, e.data);

		const centralHeader = new Uint8Array(46 + nameBytes.length);
		const cv = new DataView(centralHeader.buffer);
		cv.setUint32(0, 0x02014b50, true); // central dir sig
		cv.setUint16(4, 0x031e, true); // version made by (unix, zip 3.0)
		cv.setUint16(6, 20, true); // version needed
		cv.setUint16(8, 0, true); // flags
		cv.setUint16(10, 0, true); // method
		cv.setUint16(12, dosTime, true);
		cv.setUint16(14, dosDate, true);
		cv.setUint32(16, crc, true);
		cv.setUint32(20, size, true);
		cv.setUint32(24, size, true);
		cv.setUint16(28, nameBytes.length, true);
		cv.setUint16(30, 0, true); // extra length
		cv.setUint16(32, 0, true); // comment length
		cv.setUint16(34, 0, true); // disk number
		cv.setUint16(36, 0, true); // internal attrs
		cv.setUint32(38, (e.mode & 0xffff) << 16, true); // external attrs (unix mode in high word)
		cv.setUint32(42, offset, true); // local header offset
		centralHeader.set(nameBytes, 46);
		centralParts.push(centralHeader);

		offset += localHeader.length + e.data.length;
	}

	const centralSize = centralParts.reduce((a, b) => a + b.length, 0);
	const centralOffset = offset;

	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(4, 0, true); // disk
	ev.setUint16(6, 0, true); // disk w/ central dir
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, centralSize, true);
	ev.setUint32(16, centralOffset, true);
	ev.setUint16(20, 0, true); // comment length

	const total = localParts.reduce((a, b) => a + b.length, 0) + centralSize + end.length;
	const out = new Uint8Array(total);
	let p = 0;
	for (const part of localParts) {
		out.set(part, p);
		p += part.length;
	}
	for (const part of centralParts) {
		out.set(part, p);
		p += part.length;
	}
	out.set(end, p);
	return out;
}

const PREPARE_SH = `#!/usr/bin/env bash
# Build a stand-alone, read-only viewer for the session bundled alongside
# this script. Pass the path to a checkout of \`coral-studio\` as the first
# argument; the second argument is where the built static site should land
# (defaults to ./dist).
#
#   ./prepare.sh /path/to/coral-studio [./dist]
#
# After it finishes, run ./serve.sh to start a local web server.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <path-to-coral-studio-source> [output-dir]" >&2
  exit 64
fi

SRC="$1"
OUT="\${2:-./dist}"
HERE="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
JSONL="$HERE/session.jsonl"

if [[ ! -f "$JSONL" ]]; then
  echo "session.jsonl not found next to prepare.sh" >&2
  exit 1
fi

if [[ ! -d "$SRC" ]] || [[ ! -f "$SRC/package.json" ]]; then
  echo "'$SRC' does not look like a coral-studio source tree" >&2
  exit 1
fi

ABS_OUT="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
mkdir -p "$ABS_OUT"

pushd "$SRC" >/dev/null
yarn install --frozen-lockfile || yarn install
yarn build:shared "$JSONL" "$ABS_OUT"
popd >/dev/null

echo
echo "Build complete: $ABS_OUT"
echo "Start a local server with: ./serve.sh"
`;

const SERVE_SH = `#!/usr/bin/env bash
# Serve the static site produced by prepare.sh on http://localhost:8080.
# Tries a few common static-file servers in order.
set -euo pipefail

HERE="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
DIR="\${1:-$HERE/dist}"
PORT="\${PORT:-8080}"

if [[ ! -d "$DIR" ]]; then
  echo "Directory '$DIR' not found. Run ./prepare.sh first." >&2
  exit 1
fi

echo "Serving '$DIR' on http://localhost:\$PORT"
if command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -l "$PORT" "$DIR"
elif command -v python3 >/dev/null 2>&1; then
  cd "$DIR" && exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  cd "$DIR" && exec python -m SimpleHTTPServer "$PORT"
else
  echo "No suitable static file server found (tried npx serve, python3, python)." >&2
  exit 1
fi
`;

const README_MD = `# Shared Coral Session

This bundle contains a single Coral session exported from the Coral Studio
console, plus scripts that build a stand-alone viewer for it.

## Files

- \`session.jsonl\` — the exported session (threads, agents, lanes, events).
- \`prepare.sh\`    — builds a static viewer from a \`coral-studio\` source tree.
- \`serve.sh\`      — serves the built viewer locally over HTTP.

## Usage

\`\`\`bash
# 1. Build a viewer (requires a coral-studio checkout and yarn).
./prepare.sh /path/to/coral-studio ./dist

# 2. Serve it locally.
./serve.sh ./dist
\`\`\`

The viewer is fully offline: it does not connect to any Coral server and
exposes only the threads, agents and waterfall captured in the session.
`;

/**
 * Build a ZIP bundle containing the session export plus the helper scripts
 * needed to build and serve a stand-alone viewer for it, and trigger a
 * browser download.
 */
export function downloadSessionBundle(session: Session): void {
	const enc = new TextEncoder();
	const jsonl = exportSessionToJsonl(session);

	const entries: ZipEntry[] = [
		{ name: 'session.jsonl', data: enc.encode(jsonl), mode: 0o100644 },
		{ name: 'prepare.sh', data: enc.encode(PREPARE_SH), mode: 0o100755 },
		{ name: 'serve.sh', data: enc.encode(SERVE_SH), mode: 0o100755 },
		{ name: 'README.md', data: enc.encode(README_MD), mode: 0o100644 }
	];

	const zip = buildZip(entries);
	const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
	triggerDownload(blob, `${sanitizeId(session.sessionId)}.coral-session.zip`);
}

/**
 * Parse a jsonl string into an `ImportedSessionSnapshot`. Blank lines and
 * lines whose `type` we don't recognise are skipped. Throws if the header
 * line is missing or malformed.
 */
export function parseSessionJsonl(text: string): ImportedSessionSnapshot {
	const rawLines = text.split(/\r?\n/);
	let header: HeaderLine | null = null;
	const agents: ImportedSessionSnapshot['agents'] = {};
	const agentLanes: ImportedSessionSnapshot['agentLanes'] = {};
	const threads: ImportedSessionSnapshot['threads'] = {};
	const events: SessionEventEntry[] = [];

	for (const raw of rawLines) {
		const line = raw.trim();
		if (!line) continue;
		let parsed: Line;
		try {
			parsed = JSON.parse(line) as Line;
		} catch {
			throw new Error('Invalid jsonl: a line is not valid JSON.');
		}
		if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
			throw new Error('Invalid jsonl: missing `type` field on a line.');
		}
		switch (parsed.type) {
			case 'header':
				header = parsed;
				break;
			case 'agent':
				agents[parsed.name] = parsed.state;
				break;
			case 'lane':
				agentLanes[parsed.lane.name] = parsed.lane;
				break;
			case 'thread':
				threads[parsed.thread.id] = parsed.thread;
				break;
			case 'event':
				events.push(parsed.entry);
				break;
			default:
				// Unknown line type — skip for forward compatibility.
				break;
		}
	}

	if (!header) throw new Error('Invalid session export: missing header line.');

	// Sort events by seq for safety, since arrival order in the file is not
	// guaranteed if the producer ever reorders writes.
	events.sort((a, b) => a.seq - b.seq);

	return {
		sessionId: header.sessionId,
		namespace: header.namespace,
		agents,
		agentLanes,
		threads,
		events
	};
}
