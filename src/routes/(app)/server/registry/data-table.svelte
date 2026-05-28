<script lang="ts" generics="TData, TValue">
	import {
		type ColumnDef,
		type PaginationState,
		type SortingState,
		type ColumnFiltersState,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		getFilteredRowModel
	} from '@tanstack/table-core';
	import {
		createSvelteTable,
		FlexRender
	} from '@coral-os/component-library/ui/data-table/index.js';
	import * as Table from '@coral-os/component-library/ui/table/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Accordion from '@coral-os/component-library/ui/accordion/index.js';
	import { rankItem, type RankingInfo } from '@tanstack/match-sorter-utils';
	import AgentMarketView from '$lib/components/dialogs/AgentMarketView.svelte';

	const fuzzyFilter = (
		row: { getValue: (arg0: any) => any },
		columnId: any,
		value: string,
		addMeta: (arg0: { itemRank: RankingInfo }) => void
	) => {
		const raw = row.getValue(columnId);

		const itemRank = rankItem(
			String(raw ?? ''), // ← critical fix
			value
		);

		addMeta({ itemRank });
		return itemRank.passed;
	};

	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
	};

	type DataTableRow<TData> = TData & { failed?: boolean };

	let { columns, data }: DataTableProps<TData, TValue> = $props();

	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,

		filterFns: {
			fuzzy: fuzzyFilter
		},

		globalFilterFn: fuzzyFilter,

		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),

		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},

		onColumnFiltersChange: (updater) => {
			columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
		},

		onGlobalFilterChange: (updater) => {
			globalFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
		},

		state: {
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get globalFilter() {
				return globalFilter;
			}
		}
	});

	let globalFilter = $state('');

	let dialogOpen = $state(false);

	type AgentDialogView = {
		id: string;
		name: string;
		developer?: string;
		version?: string;
		source?: 'linked' | 'local' | 'marketplace';
		failed: boolean;
		reason?: string;
		raw: unknown;
	};

	type SelectedRow = TData;
	let selectedRow: AgentDialogView | null = $state(null);

	const isFailed = (row: unknown): row is { failed: boolean } =>
		row != null && (row as any).failed === true;
</script>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="bg-card h-full max-h-4/5 max-w-4/5! overflow-hidden" showClose={false}>
		{#if selectedRow}
			<AgentMarketView
				agent={{
					name: selectedRow.name,
					versions: selectedRow.version ? [selectedRow.version] : [],
					source: selectedRow.source ? selectedRow.source : 'marketplace'
				}}
			/>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- <Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="bg-card h-full max-h-4/5 max-w-4/5! overflow-hidden">
		{#if selectedRow}
			<Dialog.Header class="shrink-0">
				<Dialog.Title>Agent Details</Dialog.Title>

				{#if !isFailed(selectedRow)}
					<Dialog.Description>Inspecting selected row data</Dialog.Description>
				{:else}
					<Dialog.Description class="text-destructive">
						Failed to load agent details: {(selectedRow as any).reason}
					</Dialog.Description>
				{/if}
			</Dialog.Header>

			<div class="min-h-0 flex-1 overflow-ellipsis">
				<div class="border-muted/30 bg-muted/5 mb-4 grid gap-3 rounded-lg border p-4 text-sm">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="font-semibold">Name</div>
							<div>{(selectedRow as any).name ?? 'Unknown'}</div>
						</div>
						<div>
							<div class="font-semibold">Developer</div>
							<div>{(selectedRow as any).developer ?? 'Unknown'}</div>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="font-semibold">Version</div>
							<div>{(selectedRow as any).version ?? 'Unknown'}</div>
						</div>
						<div>
							<div class="font-semibold">Source</div>
							<div>{(selectedRow as any).source ?? 'Unknown'}</div>
						</div>
					</div>
				</div>

				<Accordion.Root type="single">
					<Accordion.Item value="details">
						<Accordion.Trigger variant="compact">Raw data</Accordion.Trigger>

						<Accordion.Content>
							<pre class="text-xs break-words whitespace-pre-wrap">
								<code>
{JSON.stringify(selectedRow, null, 2)}
								</code>
							</pre>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root> -->

<div class="flex items-center py-4">
	<Input
		placeholder="Search all columns..."
		value={globalFilter ?? ''}
		oninput={(e: { currentTarget: { value: string } }) => {
			globalFilter = e.currentTarget.value; // ← REQUIRED
			table.setGlobalFilter(e.currentTarget.value);
		}}
		class="max-w-sm"
	/>
</div>

<div class="h-full overflow-y-scroll border">
	<Table.Root class="w-full table-fixed">
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row class=" overflow-ellipsis">
					{#each headerGroup.headers as header (header.id)}
						<Table.Head colspan={header.colSpan}>
							{#if !header.isPlaceholder}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#each table.getRowModel().rows as row (row.id)}
				{@const agent = row.original as any}
				<Table.Row
					data-state={row.getIsSelected() && 'selected'}
					onclick={() => {
						selectedRow = {
							id: agent.id,
							name: agent.name ?? agent.registryAgent?.info?.identifier?.name ?? 'Unknown',
							developer:
								agent.extension?.developer ??
								agent.registryAgent?.info?.links?.developer ??
								undefined,
							version: agent.version ?? agent.registryAgent?.info?.identifier?.version ?? undefined,
							source: agent.source ?? agent.registryAgent?.info?.identifier?.registrySourceId?.type,
							failed: agent.failed ?? false,
							reason: agent.reason,
							raw: agent
						};

						dialogOpen = true;
					}}
					class="odd:bg-muted/30 cursor-pointer overflow-ellipsis"
				>
					{#each row.getVisibleCells() as cell (cell.id)}
						<Table.Cell
							class="overflow-hidden overflow-ellipsis {agent.failed ? 'bg-destructive/10' : ''}"
						>
							<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
						</Table.Cell>
					{/each}
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
