<script lang="ts">
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconArrowsClockwise from 'phosphor-icons-svelte/IconArrowsClockwiseRegular.svelte';
	import CodeMirror from 'svelte-codemirror-editor';
	import { json } from '@codemirror/lang-json';
	import { atomone } from '@uiw/codemirror-theme-atomone';
	import { quietlight } from '@uiw/codemirror-theme-quietlight';
	import { mode } from 'mode-watcher';
	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { cn } from '$lib/utils';
	import { CopyButton } from '@coral-os/component-library';
	import { fade } from 'svelte/transition';
	import { getSessionContext, type SessionCreatorContext } from '$lib/sessionCreatorContext';

	let {
		data = $bindable(''),
		onchange
	}: {
		data?: string;
		onchange: (value: string) => void;
	} = $props();

	let theme = $derived.by(() => {
		switch (mode.current) {
			case 'light':
				return quietlight;
			case 'dark':
				return atomone;
			default:
				return atomone;
		}
	});

	// Fire onchange whenever `data` changes, but skip the initial run so
	// mounting/tab-switching (which sets `data` from outside) doesn't
	// trigger a spurious change event.
</script>

<ScrollArea class="size-full">
	<CodeMirror
		bind:value={data}
		lang={json()}
		tabSize={4}
		onchange={(value) => {
			if (value != undefined) {
				onchange(value);
			}
		}}
		syntaxHighlighting
		{theme}
		lineWrapping={true}
		class="size-full [&_.cm-content]:p-0! [&>*]:size-full "
	/>
</ScrollArea>
