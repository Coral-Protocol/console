<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import IconCrane from 'phosphor-icons-svelte/IconCraneRegular.svelte';
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link>Sessions</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Page>Overview</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>
<main class="flex grow flex-col items-center justify-center">
	<IconCrane class="size-14" />
	<h2 class="text-xl">This page is under construction!</h2>
</main>
