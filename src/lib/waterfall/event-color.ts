/**
 * Static, hand-maintained mapping from the abstract palette name on an
 * `EventMeta` to the *exact* Tailwind class strings that need to appear in
 * the compiled bundle. Tailwind v4's JIT does static analysis, so any class
 * we construct via template literals would otherwise be tree-shaken away.
 *
 * Keeping the mapping in one place also lets us flip the entire palette for
 * a theme change (e.g. high-contrast mode) by swapping a single table.
 */
export interface ChipColorClasses {
	chip: string;
	icon: string;
	dot: string;
	headerActive: string;
	headerIdle: string;
}

const TABLE: Record<string, ChipColorClasses> = {
	emerald: {
		chip: 'bg-emerald-50 border-emerald-200 text-emerald-900 focus-visible:ring-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100',
		icon: 'text-emerald-600 dark:text-emerald-400',
		dot: 'bg-emerald-500',
		headerActive: 'border-emerald-300 dark:border-emerald-700',
		headerIdle: 'border-emerald-200/60 dark:border-emerald-800/40'
	},
	sky: {
		chip: 'bg-sky-50 border-sky-200 text-sky-900 focus-visible:ring-sky-400 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-100',
		icon: 'text-sky-600 dark:text-sky-400',
		dot: 'bg-sky-500',
		headerActive: 'border-sky-300 dark:border-sky-700',
		headerIdle: 'border-sky-200/60 dark:border-sky-800/40'
	},
	indigo: {
		chip: 'bg-indigo-50 border-indigo-200 text-indigo-900 focus-visible:ring-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-100',
		icon: 'text-indigo-600 dark:text-indigo-400',
		dot: 'bg-indigo-500',
		headerActive: 'border-indigo-300 dark:border-indigo-700',
		headerIdle: 'border-indigo-200/60 dark:border-indigo-800/40'
	},
	amber: {
		chip: 'bg-amber-50 border-amber-200 text-amber-900 focus-visible:ring-amber-400 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100',
		icon: 'text-amber-600 dark:text-amber-400',
		dot: 'bg-amber-500',
		headerActive: 'border-amber-300 dark:border-amber-700',
		headerIdle: 'border-amber-200/60 dark:border-amber-800/40'
	},
	violet: {
		chip: 'bg-violet-50 border-violet-200 text-violet-900 focus-visible:ring-violet-400 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-100',
		icon: 'text-violet-600 dark:text-violet-400',
		dot: 'bg-violet-500',
		headerActive: 'border-violet-300 dark:border-violet-700',
		headerIdle: 'border-violet-200/60 dark:border-violet-800/40'
	},
	fuchsia: {
		chip: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900 focus-visible:ring-fuchsia-400 dark:bg-fuchsia-950/40 dark:border-fuchsia-800 dark:text-fuchsia-100',
		icon: 'text-fuchsia-600 dark:text-fuchsia-400',
		dot: 'bg-fuchsia-500',
		headerActive: 'border-fuchsia-300 dark:border-fuchsia-700',
		headerIdle: 'border-fuchsia-200/60 dark:border-fuchsia-800/40'
	},
	cyan: {
		chip: 'bg-cyan-50 border-cyan-200 text-cyan-900 focus-visible:ring-cyan-400 dark:bg-cyan-950/40 dark:border-cyan-800 dark:text-cyan-100',
		icon: 'text-cyan-600 dark:text-cyan-400',
		dot: 'bg-cyan-500',
		headerActive: 'border-cyan-300 dark:border-cyan-700',
		headerIdle: 'border-cyan-200/60 dark:border-cyan-800/40'
	},
	teal: {
		chip: 'bg-teal-50 border-teal-200 text-teal-900 focus-visible:ring-teal-400 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-100',
		icon: 'text-teal-600 dark:text-teal-400',
		dot: 'bg-teal-500',
		headerActive: 'border-teal-300 dark:border-teal-700',
		headerIdle: 'border-teal-200/60 dark:border-teal-800/40'
	},
	blue: {
		chip: 'bg-blue-50 border-blue-200 text-blue-900 focus-visible:ring-blue-400 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-100',
		icon: 'text-blue-600 dark:text-blue-400',
		dot: 'bg-blue-500',
		headerActive: 'border-blue-300 dark:border-blue-700',
		headerIdle: 'border-blue-200/60 dark:border-blue-800/40'
	},
	rose: {
		chip: 'bg-rose-50 border-rose-200 text-rose-900 focus-visible:ring-rose-400 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-100',
		icon: 'text-rose-600 dark:text-rose-400',
		dot: 'bg-rose-500',
		headerActive: 'border-rose-300 dark:border-rose-700',
		headerIdle: 'border-rose-200/60 dark:border-rose-800/40'
	},
	slate: {
		chip: 'bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-slate-400 dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100',
		icon: 'text-slate-600 dark:text-slate-400',
		dot: 'bg-slate-500',
		headerActive: 'border-slate-300 dark:border-slate-700',
		headerIdle: 'border-slate-200/60 dark:border-slate-800/40'
	},
	zinc: {
		chip: 'bg-zinc-50 border-zinc-200 text-zinc-900 focus-visible:ring-zinc-400 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-100',
		icon: 'text-zinc-600 dark:text-zinc-400',
		dot: 'bg-zinc-500',
		headerActive: 'border-zinc-300 dark:border-zinc-700',
		headerIdle: 'border-zinc-200/60 dark:border-zinc-800/40'
	}
};

export function colorClasses(name: string): ChipColorClasses {
	return TABLE[name] ?? TABLE.zinc!;
}
