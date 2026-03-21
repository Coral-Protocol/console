<script lang="ts" module>
	import type { LanguageType } from 'svelte-highlight';

	import javascript from 'svelte-highlight/languages/javascript';
	import python from 'svelte-highlight/languages/python';

	const toJsObjectLiteral = (value: unknown, indent = 0, indentSize = 4): string =>
		JSON.stringify(value, null, indentSize)
			// unquote valid JS identifiers
			.replace(/"([a-zA-Z_$][\w$]*)":/g, '$1:')
			// single quotes for strings (optional, stylistic)
			.replace(/"/g, "'")
			// nest block by `indent` amount
			.replace(/^/gm, ' '.repeat(indentSize * indent));
	export const snippets = {
		javascript: {
			language: javascript,
			comment: '//',
			code: (body) => `
await fetch(\`http://\${BASE}/api/v1/local/session\`, {
    method: 'POST'
    headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${CORAL_BEARER_TOKEN}\`,
    },
    body: JSON.stringify(${toJsObjectLiteral(body, 1).trim()}),
});         
`
		},
		python: {
			language: python,
			comment: '#',
			code: (body) => `
import requests

requests.post(
    f'http://{BASE}/api/v1/local/session',
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {CORAL_BEARER_TOKEN}',
    },
    json = ${toJsObjectLiteral(body, 1).trim()}
)
`
		}
	} satisfies {
		[lang: string]: {
			language: LanguageType<string>;
			code: (body: object) => string;
			comment: string;
		};
	};
</script>

<script lang="ts">
	import { CopyButton } from '@coral-os/component-library';
	import { Highlight } from 'svelte-highlight';
	import type { CreateSessionRequest } from '../schemas/types';
	let {
		snippet: snippetName,
		body
	}: { snippet: keyof typeof snippets; body: CreateSessionRequest } = $props();
	let snippet = $derived(snippets[snippetName]);
	let code = $derived.by(() => {
		try {
			return snippet.code(body).trim();
		} catch (e) {
			console.error('Failed to generate code snippet:', e);
			return `${snippet.comment} Could not generate snippet - does your session contain invalid data?`;
		}
	});
</script>

<section class="absolute top-5 right-5 z-10 flex flex-col gap-2">
	<CopyButton value={code} />
</section>

<Highlight
	class="absolute inset-0 text-xs leading-relaxed [&>code]:size-full"
	language={snippet.language}
	{code}
></Highlight>
