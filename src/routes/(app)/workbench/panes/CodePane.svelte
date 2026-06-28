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

	let { data = $bindable() }: { data?: string } = $props();

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
</script>

<!-- {#if !customPayload}
	<section class="absolute top-5 right-5 z-10 flex flex-col gap-2">
		<CopyButton value={payloadJson} />
		{#if jsonDirty}
			<span transition:fade={{ duration: 100 }}>
				<Tooltip.Root>
					<Tooltip.Trigger
						class={cn(buttonVariants({ size: 'icon' }), '')}
						onclick={() => {
							if (ctx?.importSession({ from: payloadJson })) {
								jsonDirty = false;
							}
						}}
					>
						<IconArrowsClockwise /></Tooltip.Trigger
					>
					<Tooltip.Content>Update session graph from JSON</Tooltip.Content>
				</Tooltip.Root>
			</span>
		{/if}
	</section>
{/if} -->
<ScrollArea class="size-full">
	<CodeMirror
		bind:value={data}
		lang={json()}
		tabSize={4}
		syntaxHighlighting
		{theme}
		lineWrapping={true}
		class="size-full [&_.cm-content]:p-0! [&>*]:size-full "
	/>
</ScrollArea>
