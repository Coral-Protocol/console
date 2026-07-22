<script lang="ts">
	import { TooltipLabel } from '@coral-os/component-library';
	import DurationInput from '../options/DurationInput.svelte';

	import { activeFile } from '$lib/activeFile.svelte';

	const runtimeSettings = $derived(
		activeFile.current?.execution?.mode === 'immediate'
			? activeFile.current.execution.runtimeSettings
			: undefined
	);

	const ttlError = $derived(activeFile.current?.errors?.session?.['execution.runtimeSettings.ttl']);

	function setTtl(totalMilliseconds: number) {
		if (!runtimeSettings) return;
		if (totalMilliseconds === 0) {
			delete runtimeSettings.ttl;
		} else {
			runtimeSettings.ttl = totalMilliseconds;
			activeFile.updateExecutionSettings({
				runtimeSettings: {
					ttl: totalMilliseconds,
					extendedEndReport: false
				}
			});
		}
	}
</script>

{#if activeFile.current && runtimeSettings}
	<section class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<TooltipLabel
				title="Time to live (TTL)"
				tooltip="Measured in milliseconds, the time to live is the maximum duration the session can last"
				extra={{ type: 'number' }}
				class="max-w-1/4 min-w-1/4"
			>
				Time to live
			</TooltipLabel>
			<DurationInput value={runtimeSettings.ttl ?? 0} onchange={setTtl} />
		</div>

		{#if ttlError && JSON.stringify(ttlError) !== '{}'}
			<span class="text-xs">
				{ttlError.message}
			</span>
		{/if}
	</section>
{/if}
