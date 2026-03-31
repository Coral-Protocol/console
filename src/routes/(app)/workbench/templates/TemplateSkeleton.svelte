<script lang="ts">
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { Skeleton } from '@coral-os/component-library/ui/skeleton/index.js';
</script>

<li class="col-span-1">
	<Card.Root class="bg-background rounded-md border-0 p-0 shadow-none">
		<Card.Content class="flex flex-col p-0 ">
			<Skeleton class="bg-muted aspect-video w-full rounded-lg" />
			<Card.Footer class="flex justify-between gap-2 px-6 !py-4">
				<span class="flex flex-col gap-2">
					<Skeleton class="bg-muted h-4 w-32 rounded-lg" />
					<Skeleton class="bg-muted h-4 w-56 rounded-lg" />
				</span>
			</Card.Footer>
		</Card.Content>
	</Card.Root>
</li>
