export type PageTree = { [id: string]: Page };
export type Page = { label: string; href?: string | null; pages?: PageTree } | string;

export const pageTree = {
	server: {
		label: 'Server',
		href: null,
		pages: {
			registry: 'Registry'
		}
	},
	workbench: {
		label: 'Workbench',
		pages: {
			templates: 'Templates'
		}
	}
} as const satisfies PageTree;

export type ResolvedPage = { label: string; href: string | null };
export const lookupPage = (path: string): ResolvedPage[] => {
	let tree: PageTree | undefined = pageTree;

	let pages: ResolvedPage[] = [];
	let href = '';
	for (const node of path.split('/')) {
		if (node.length === 0) continue;
		if (!tree) {
			pages.push({ label: '??', href: null });
			break;
		}
		const p: Page | undefined = tree[node];
		if (p === undefined) {
			pages.push({ label: '??', href: null });
			break;
		}
		tree = typeof p === 'string' ? undefined : p?.pages;
		href += `/${node}`;
		const pHref = typeof p === 'string' ? undefined : p.href;
		pages.push({
			label: typeof p === 'string' ? p : p.label,
			href: pHref === undefined ? href : null
		});
	}

	return pages;
};
