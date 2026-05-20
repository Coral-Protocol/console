<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Header from '$lib/components/header.svelte';
	import * as UnderlineTabs from '@coral-os/component-library/ui/underline-tabs/index.js';
</script>

<Header />

<h1 class="text-muted-foreground m-auto">Welcome back</h1>
