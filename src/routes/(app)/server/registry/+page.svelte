<script lang="ts">
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Avatar from '@coral-os/component-library/ui/avatar/index.js';

	import IconCrane from 'phosphor-icons-svelte/IconCraneRegular.svelte';
	import { appContext } from '$lib/context';
	import IconMagnifyingGlassRegular from 'phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte';
	import { fade } from 'svelte/transition';
	import { Badge } from '@coral-os/component-library/ui/badge/index.js';
	import { Skeleton } from '@coral-os/component-library/ui/skeleton/index.js';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';

	import DataTable from './data-table.svelte';
	import { columns, type Agent } from './columns.js';

	import Header from '$lib/components/header.svelte';
	import { Spinner } from '@coral-os/component-library/components/ui/spinner/index.js';

	let ctx = appContext.get();

	let CatalogData = $derived(
		Object.values(ctx.server.catalogs).map((catalog) => {
			return { ...catalog, agents: Object.values(catalog.agents) };
		})
	);

	let AgentData = $derived.by(async () => {
		const lookups = CatalogData.flatMap((catalog) =>
			catalog.agents.map((agent) =>
				ctx.server
					.lookupAgent({
						name: agent.name,
						version: agent.versions[0]!,
						registrySourceId: catalog.identifier
					})
					.then((value) => ({
						failed: false as const,
						data: value
					}))
					.catch((err: unknown) => ({
						failed: true as const,
						reason: err instanceof Error ? err.message : 'Unknown error',
						name: agent.name
					}))
			)
		);

		const results = await Promise.all(lookups);

		const mapped: Agent[] = results.map((result) => {
			if (!result.failed && 'data' in result) {
				return {
					...result.data,
					id: `${result.data.registryAgent.info.identifier.name}@${result.data.registryAgent.info.identifier.version}`,
					failed: false
				};
			}

			return {
				failed: true,
				reason: result.reason,
				id: `failed-${result.name}`,
				name: result.name
			};
		});

		return mapped;
	});
</script>

<Header />

<main class="main relative flex h-full min-h-0 w-full grow flex-col overflow-hidden p-2">
	{#await AgentData}
		<Spinner class="absolute top-0 right-0 bottom-0 left-0 m-auto" />
	{:then agents}
		<DataTable data={agents} {columns} />
	{:catch}
		Errored loading data
	{/await}
</main>
