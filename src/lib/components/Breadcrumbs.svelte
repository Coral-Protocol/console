<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { lookupPage } from '$lib/pages';
	import { cn } from '$lib/utils';
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';

	let parts = $derived(lookupPage(page.url.pathname));
	let { override }: { override?: string } = $props();
</script>

<Breadcrumb.Root class="flex-grow">
	<Breadcrumb.List>
		{#if override}
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Page>{override}</Breadcrumb.Page>
			</Breadcrumb.Item>
		{:else}
			{#each parts as part, i}
				<Breadcrumb.Item class={cn(i < parts.length - 1 && 'hidden md:block')}>
					{#if i == parts.length - 1}
						<Breadcrumb.Page>{part.label}</Breadcrumb.Page>
					{:else}
						<Breadcrumb.Link href={part.href && `${base}${part.href}`}>{part.label}</Breadcrumb.Link
						>
					{/if}
				</Breadcrumb.Item>
				{#if i != parts.length - 1}
					<Breadcrumb.Separator class="hidden md:block" />
				{/if}
			{/each}
		{/if}
	</Breadcrumb.List>
</Breadcrumb.Root>
