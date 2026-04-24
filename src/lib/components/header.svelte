<script>
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 p-2">
	<Card.Root class="h-full w-full py-0">
		<Card.Content class="flex h-full items-center gap-2 px-3">
			<Sidebar.Trigger class="-ml-1" />
			<Separator orientation="vertical" class="mr-2 h-4" />
			<Breadcrumbs />
		</Card.Content>
	</Card.Root>
</header>
