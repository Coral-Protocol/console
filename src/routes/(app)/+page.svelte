<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Header from '$lib/components/header.svelte';
</script>

<Header />

<section class="m-auto">
	<h1>Welcome back</h1>
	<div>
		<p>Here's what's happening with your sessions today:</p>
		<ul>
			<li>You have 3 active sessions.</li>
			<li>Your most recent session was created 2 hours ago.</li>
			<li>You have 5 sessions that have completed their tasks.</li>
		</ul>
	</div>
	<div class="grid grid-cols-2 gap-4">
		<button onclick={() => goto(`${base}/workbench`)}>
			<Card.Root>
				<Card.Content>
					<p>Card Content</p>
				</Card.Content>
				<Card.Footer>
					<p>Workbench</p>
				</Card.Footer>
			</Card.Root>
		</button>
		<button onclick={() => goto(`${base}/workbench`)}>
			<Card.Root>
				<Card.Content>
					<p>Card Content</p>
				</Card.Content>
				<Card.Footer>
					<p>Workbench</p>
				</Card.Footer>
			</Card.Root>
		</button>
		<button onclick={() => goto(`${base}/workbench`)}>
			<Card.Root>
				<Card.Content>
					<p>Card Content</p>
				</Card.Content>
				<Card.Footer>
					<p>Workbench</p>
				</Card.Footer>
			</Card.Root>
		</button>
		<button onclick={() => goto(`${base}/workbench`)}>
			<Card.Root>
				<Card.Content>
					<p>Card Content</p>
				</Card.Content>
				<Card.Footer>
					<p>Workbench</p>
				</Card.Footer>
			</Card.Root>
		</button>
	</div>
</section>
