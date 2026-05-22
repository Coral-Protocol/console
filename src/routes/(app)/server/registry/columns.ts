import type { components } from '$generated/api';
import type { ColumnDef } from '@tanstack/table-core';
import DataTableActions from './data-table-actions.svelte';
import { renderComponent } from '@coral-os/component-library/ui/data-table/index.js';
import DataTableNameButton from './data-table-name-button.svelte';

export type Agent =
	| {
			failed: false;
			id: string;
			registryAgent: components['schemas']['RegistryAgent'];
			restrictions?: (
				| { type: 'linked'; linkedServerId: string }
				| { type: 'local' }
				| { type: 'remote' }
			)[];
			extension?: {
				type: 'marketplace';
				iconUrl?: string;
				developer?: string;
				publishedAt: string;
			};
	  }
	| {
			failed: true;
			id: string;
			name: string;
			reason?: string;
	  };

export const columns: ColumnDef<Agent>[] = [
	{
		id: 'name',
		header: ({ column }) =>
			renderComponent(DataTableNameButton, {
				onclick: column.getToggleSortingHandler()
			}),
		accessorKey: 'registryAgent.info.identifier.name',
		cell: ({ row }) => {
			const agent = row.original;

			if (agent.failed) {
				return `${agent.name}`;
			}

			return agent.registryAgent.info.identifier.name;
		}
	},

	{
		id: 'summary',
		header: 'summary',
		maxSize: 10,
		cell: ({ row }) => {
			const agent = row.original;

			if (agent.failed) return '-';

			return agent.registryAgent.info.summary ?? '-';
		}
	},

	{
		id: 'version',
		header: 'Version',
		cell: ({ row }) => {
			const agent = row.original;

			if (agent.failed) return '-';

			return agent.registryAgent.info.identifier.version;
		}
	},

	{
		id: 'source',
		header: 'Source',
		cell: ({ row }) => {
			const agent = row.original;

			if (agent.failed) return '-';

			return agent.registryAgent.info.identifier.registrySourceId.type;
		}
	},

	{
		id: 'developer',
		header: 'Developer',
		cell: ({ row }) => {
			const agent = row.original;

			if (agent.failed) return '-';

			return agent.extension?.developer ?? '-';
		}
	},

	{
		id: 'actions',
		cell: ({ row }) => {
			const agent = row.original;

			if (agent.failed) {
				return renderComponent(DataTableActions, {
					name: agent.name,
					developer: '',
					version: '',
					source: '',
					id: agent.id
				});
			}

			return renderComponent(DataTableActions, {
				name: agent.registryAgent.info.identifier.name,
				developer: agent.extension?.developer ?? '',
				version: agent.registryAgent.info.identifier.version,
				source: agent.registryAgent.info.identifier.registrySourceId.type,
				id: agent.id
			});
		}
	}
];
