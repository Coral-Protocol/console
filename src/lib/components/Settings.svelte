<script lang="ts">
	import { resetMode, setMode, userPrefersMode } from 'mode-watcher';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import { buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { Separator } from '@coral-os/component-library/components/ui/separator/index.js';
</script>

<section class="flex flex-col gap-2">
	<h1>Settings</h1>
	<Separator />
	<div class="flex w-full items-center justify-between">
		Theme
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class={buttonVariants({ variant: 'outline' })}
				>{userPrefersMode.current}</DropdownMenu.Trigger
			>
			<DropdownMenu.Content align="center">
				<DropdownMenu.Item onclick={() => setMode('light')}>Light</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => setMode('dark')}>Dark</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => resetMode()}>System</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</section>
