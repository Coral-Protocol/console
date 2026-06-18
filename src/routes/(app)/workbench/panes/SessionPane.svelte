<script lang="ts">
	import * as Item from '@coral-os/component-library/ui/item/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';

	import IconTrash from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import * as InputGroup from '@coral-os/component-library/ui/input-group/index.js';

	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';

	import { ScrollArea } from '@coral-os/component-library/ui/scroll-area/index.js';
	import { Toggle } from '@coral-os/component-library/ui/toggle/index.js';
	import * as ToggleGroup from '@coral-os/component-library/ui/toggle-group/index.js';
	import * as ButtonGroup from '@coral-os/component-library/ui/button-group/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import IconInfo from 'phosphor-icons-svelte/IconInfoRegular.svelte';
	import * as Alert from '@coral-os/component-library/components/ui/alert/index.js';
	import * as Card from '@coral-os/component-library/components/ui/card/index.js';
	import * as Accordion from '@coral-os/component-library/components/ui/accordion/index.js';

	import * as Label from '@coral-os/component-library/ui/label/index.js';

	import { Context } from 'runed';

	import { TooltipLabel, TwostepButton } from '@coral-os/component-library';

	import { randomAdjective, randomAnimal } from '$lib/words';
	import { getSessionContext } from '$lib/sessionCreatorContext';
	import { cn } from '$lib/utils';
	import DurationInout from '../options/DurationInout.svelte';

	let ctx = getSessionContext();

	let form = $derived(ctx?.form as any);
	let errors = $derived(ctx?.errors as any);
	let formData = $derived(ctx.formData);

	function formatMsToHHMMSS(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
	}
</script>

{#if ctx && $formData}
	<section class="flex h-full min-h-0 grow flex-col gap-2 overflow-y-auto p-4">
		<p>
			Providing the optional time to live value results in the Session being terminated when the
			duration has elapsed.
		</p>
		<Form.ElementField {form} name="sessionRuntimeSettings.ttl" class="flex items-center gap-2 ">
			<Form.Control>
				{#snippet children({ props })}
					<TooltipLabel
						title="Time to live (TTL)"
						tooltip="Measured in milliseconds, the time to live is the maximum duration the session can last"
						extra={{
							type: 'number'
						}}
						class="max-w-1/4 min-w-1/4"
					>
						Time to live
					</TooltipLabel>

					<DurationInout
						value={$formData.sessionRuntimeSettings.ttl ?? 0}
						onchange={(totalMilliseconds) => {
							$formData.sessionRuntimeSettings.ttl = totalMilliseconds;
						}}
					/>
				{/snippet}
			</Form.Control>
		</Form.ElementField>

		{#if $errors?.sessionRuntimeSettings?.ttl && JSON.stringify($errors.sessionRuntimeSettings?.ttl) !== '{}' && JSON.stringify($errors.sessionRuntimeSettings?.ttl) !== '{}'}
			<span class="text-xs">
				{$errors?.sessionRuntimeSettings?.ttl}
			</span>
		{/if}
	</section>
{/if}
