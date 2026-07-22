<script lang="ts">
	import * as Alert from '@coral-os/component-library/ui/alert/index.js';
	import Login from '$lib/components/Login.svelte';
	import { Button } from '@coral-os/component-library/ui/button/index.js';

	let { open = $bindable() }: { open: boolean } = $props();

	let loginOpen = $state(false);
</script>

<Login bind:open={loginOpen} />
{#if open}
	<div class="absolute top-0 left-0 z-50 flex h-full w-full items-center justify-center">
		<Alert.Root class="z-51 w-fit {!loginOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}">
			<Alert.Title>Heads up!</Alert.Title>
			<Alert.Description>
				Not authenticated with the server! Please sign in to access the workbench.<Button
					onclick={() => ((loginOpen = true), (open = false))}
					type="button">Login</Button
				>
			</Alert.Description>
		</Alert.Root>
		<div class="absolute top-0 left-0 h-full w-full bg-black/50 backdrop-blur-xs"></div>
	</div>
{/if}
