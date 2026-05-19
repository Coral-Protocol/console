#!/usr/bin/env node
/**
 * Build the "Shared Session" variant of the console.
 *
 * Usage:
 *   node scripts/build-shared.mjs <input.jsonl> <output-dir>
 *
 * Copies the input jsonl into `static/session.jsonl`, runs `vite build` with
 * `VITE_SHARED_SESSION=1` (and a relative base path) so the resulting static
 * site is self-contained, then moves `build/` to <output-dir>. The viewer
 * loads the bundled jsonl on boot and never reaches out to a Coral server.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
	console.error('usage: build-shared.mjs <input.jsonl> <output-dir>');
	process.exit(64);
}

const input = resolve(inputArg);
const outDir = resolve(outputArg);

if (!existsSync(input) || !statSync(input).isFile()) {
	console.error(`Input file not found: ${input}`);
	process.exit(1);
}

const staticDir = resolve(repoRoot, 'static');
const bundledJsonl = resolve(staticDir, 'session.jsonl');
mkdirSync(staticDir, { recursive: true });
copyFileSync(input, bundledJsonl);
console.log(`Copied ${input} -> ${bundledJsonl}`);

const buildDir = resolve(repoRoot, 'build');
if (existsSync(buildDir)) rmSync(buildDir, { recursive: true, force: true });

const env = {
	...process.env,
	VITE_SHARED_SESSION: '1',
	// Relative base path keeps the resulting site portable: any static
	// server (or even file://) can host the output without rewriting.
	BASE_PATH: ''
};

console.log('Running vite build...');
execSync('yarn build', { cwd: repoRoot, stdio: 'inherit', env });

mkdirSync(dirname(outDir), { recursive: true });
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
renameSync(buildDir, outDir);

console.log(`\nDone. Static site is at: ${outDir}`);
