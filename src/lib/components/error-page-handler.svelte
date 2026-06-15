<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Alert from '@coral-os/component-library/ui/alert/index.js';
	import IconAlertCircle from 'phosphor-icons-svelte/IconWarningCircleRegular.svelte';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';
	import { base } from '$app/paths';

	let { error: propError, status: propStatus } = $props<{
		error?: string;
		status?: number;
	}>();

	let reload = $state(false);

	let finalError = $derived(propError ?? page.error ?? 'failed to fetch error');

	let finalStatus = $derived(propStatus ?? page.status ?? 500);

	let errorMessage = $derived(() => {
		if (typeof finalError === 'string') return finalError;
		return finalError?.message ?? 'failed to fetch error';
	});
</script>

<main
	class="absolute top-1/2 left-1/2 flex w-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4"
>
	<Alert.Root>
		<IconAlertCircle />
		<Alert.Title>Oops! Something went wrong.</Alert.Title>
		<Alert.Description>
			<h1>Status: <span class="text-destructive">{finalStatus}</span></h1>
			<p>Error: <span class="text-destructive">{errorMessage()}</span></p>
		</Alert.Description>
	</Alert.Root>

	<ol class="mt-4 flex gap-2">
		<Button href="{base}/">Go Home</Button>
		<Button onclick={() => window.history.back()}>Go Back</Button>
		<Button onclick={() => (window.location.reload(), (reload = true))} class="relative">
			<Spinner
				class="absolute top-1/2 left-1/2 flex w-1/2 -translate-x-1/2 -translate-y-1/2 {reload
					? 'opacity-100'
					: 'opacity-0'}"
			/>
			<span class={reload ? 'opacity-0' : 'opacity-100'}>Retry</span>
		</Button>
	</ol>
</main>
