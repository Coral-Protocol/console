<script lang="ts">
	/**
	 * Floating physics-control panel for {@link SessionGraph}.
	 *
	 * Exposes the underlying {@link SimParams} (repulsion, link strength,
	 * link distance, centre pull, damping, max velocity) as a row of
	 * paired slider + numeric inputs. Mutations are written back to the
	 * shared `$bindable` params object, so the running simulation picks
	 * them up on its next tick — i.e. changes reflect smoothly with no
	 * "apply" step.
	 */
	import { DEFAULT_SIM_PARAMS, type SimParams } from './layout';

	interface Props {
		params: SimParams;
	}
	// We mutate `params` in place — the parent uses `$state` so the
	// simulation picks the new values up on the next tick. No `bind:`
	// is required, and that lets the parent expose `params` as a const.
	let { params }: Props = $props();
	let open = $state(true);

	type Field = {
		key: keyof SimParams;
		label: string;
		min: number;
		max: number;
		step: number;
	};
	const fields: Field[] = [
		{ key: 'repulsion', label: 'Node charge', min: 0, max: 30000, step: 100 },
		{ key: 'linkStrength', label: 'Link strength', min: 0, max: 4, step: 0.01 },
		{ key: 'linkDistance', label: 'Link distance', min: 0.2, max: 4, step: 0.05 },
		{ key: 'centerStrength', label: 'Center pull', min: 0, max: 0.01, step: 0.0001 },
		{ key: 'damping', label: 'Damping', min: 0.5, max: 0.99, step: 0.005 },
		{ key: 'maxVelocity', label: 'Max velocity', min: 0.5, max: 20, step: 0.1 }
	];

	function reset() {
		Object.assign(params, DEFAULT_SIM_PARAMS);
	}
</script>

<div
	class="bg-background/85 absolute left-2 top-2 z-10 rounded-md border text-xs shadow-md backdrop-blur"
>
	<button
		type="button"
		class="flex w-full items-center justify-between gap-2 px-2 py-1 font-semibold"
		onclick={() => (open = !open)}
		aria-expanded={open}
	>
		<span>Physics</span>
		<span class="text-muted-foreground">{open ? '▾' : '▸'}</span>
	</button>
	{#if open}
		<div class="space-y-1.5 border-t p-2">
			{#each fields as f (f.key)}
				<div class="flex items-center gap-2">
					<label for="sgc-{f.key}" class="w-24 shrink-0 text-[11px]">{f.label}</label>
					<input
						id="sgc-{f.key}"
						type="range"
						min={f.min}
						max={f.max}
						step={f.step}
						bind:value={params[f.key]}
						class="h-1 flex-1 accent-emerald-500"
					/>
					<input
						type="number"
						min={f.min}
						max={f.max}
						step={f.step}
						bind:value={params[f.key]}
						class="bg-background w-16 rounded border px-1 py-0.5 text-right font-mono text-[10px]"
					/>
				</div>
			{/each}
			<div class="flex justify-end pt-1">
				<button
					type="button"
					class="hover:bg-muted rounded border px-2 py-0.5 text-[11px]"
					onclick={reset}
				>
					Reset
				</button>
			</div>
		</div>
	{/if}
</div>
