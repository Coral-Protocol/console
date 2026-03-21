<script lang="ts">
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Kbd from '@coral-os/component-library/ui/kbd/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import { toast } from 'svelte-sonner';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import Quickswitch from '$lib/components/dialogs/quickswitch.svelte';
	import DebugTools from '$lib/components/dialogs/debugtools.svelte';
	import Login from './Login.svelte';

	import IconFileArchive from 'phosphor-icons-svelte/IconFileArchiveRegular.svelte';
	import MoonIcon from 'phosphor-icons-svelte/IconMoonRegular.svelte';
	import SunIcon from 'phosphor-icons-svelte/IconSunRegular.svelte';
	import IconArrowsClockwise from 'phosphor-icons-svelte/IconArrowsClockwiseRegular.svelte';
	import IconRobot from 'phosphor-icons-svelte/IconRobotRegular.svelte';
	import IconSearch from 'phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte';
	import IconQuestion from 'phosphor-icons-svelte/IconQuestionRegular.svelte';
	import IconPackage from 'phosphor-icons-svelte/IconPackageRegular.svelte';
	import IconNotepad from 'phosphor-icons-svelte/IconNotepadRegular.svelte';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import IconFolder from 'phosphor-icons-svelte/IconFolderRegular.svelte';

	import * as Popover from '@coral-os/component-library/ui/popover/index.js';

	import { cn } from '$lib/utils';
	import { socketCtx } from '$lib/socket.svelte';
	import { toggleMode } from 'mode-watcher';

	import ServerSwitcher from './namespace-switcher.svelte';
	import NavBundle from './nav-bundle.svelte';
	import { SidebarLink, Tour } from '@coral-os/component-library';

	import { goto } from '$app/navigation';
	import Shortcuts from './dialogs/shortcuts.svelte';
	import { appContext } from '$lib/context';
	import { base } from '$app/paths';
	import { useDebounce, watch } from 'runed';
	import config from '$lib/config';
	import SessionSwitcher from './SessionSwitcher.svelte';
	import SidebarMenuSubItem from '@coral-os/component-library/components/ui/sidebar/sidebar-menu-sub-item.svelte';

	let ctx = appContext.get();
	let tools = socketCtx.get();
	let conn = $derived(ctx.session);

	let connecting = $state(false);
	let error: string | null = $state(null);

	const onNoAuth = useDebounce(() => {
		switch (config.PUBLIC_LOGIN_BEHAVIOUR) {
			case 'token':
				toast('You have been logged out. Please log in again.', {
					duration: Infinity,
					dismissable: false,
					richColors: true,
					id: 'server-disconnected',
					action: {
						label: 'Login',
						onClick: (e) => {
							e.preventDefault();
							loginOpen = true;
						}
					}
				});
				break;
			case 'reload':
				toast('You have been logged out. Please log in again.', {
					duration: Infinity,
					dismissable: false,
					richColors: true,
					description: 'You will lose your changes!',
					id: 'server-disconnected',
					action: {
						label: 'Login',
						onClick: (e) => {
							e.preventDefault();
							window.location.reload();
						}
					}
				});
				break;
			default:
				unreachable(config.PUBLIC_LOGIN_BEHAVIOUR);
				break;
		}
	}, 200);

	$effect(() => {
		ctx.server.onNoAuth = onNoAuth;
	});

	watch(
		() => ctx.server.alive,
		(alive) => {
			if (alive) {
				console.log('alive');
				toast.success('Connected to server.');
				toast.dismiss('server-disconnected');
				refreshAgents();
			}
		}
	);

	let loginOpen = $state(false);

	const refreshAgents = async () => {
		try {
			connecting = true;
			error = null;

			await ctx.server.fetchAll();
			ctx.server.alive = true;
			connecting = false;
			toast.success('Connection refreshed');
		} catch (e) {
			connecting = false;
			error = `${e}`;
			toast.error('Failed to refresh connection. ' + error);
			throw e;
		}
	};

	let feedbackVisible = $state(false);

	$effect(() => {
		const hasNewRequest = Object.values(tools.userInput.requests).some(
			(req) => req.userQuestion === undefined
		);
		if (hasNewRequest) {
			toast.info('New input request from an agent', {
				duration: 4000,
				id: 'new-user-input-message',
				action: {
					label: 'View',
					onClick: () => {
						goto(`${base}/tools/user-input`);
					}
				}
			});
		}
	});

	let openQuickswitch = $state(false),
		openShortcuts = $state(false),
		debugToolsOpen = $state(false),
		welcomeOpen = $state(false);

	const handleKeydown = (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null;
		if (target) {
			const tag = target.tagName;
			if (
				tag === 'INPUT' ||
				tag === 'TEXTAREA' ||
				tag === 'SELECT' ||
				(target.isContentEditable ?? false)
			) {
				return;
			}
		}

		const mod = event.ctrlKey || event.metaKey; // support Cmd on macOS

		if (mod && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			openQuickswitch = !openQuickswitch;
			return;
		}

		if (event.shiftKey) {
			const k = event.key.toLowerCase();
			if (k === 'd') {
				debugToolsOpen = !debugToolsOpen;
				return;
			}
			if (k === 'r') {
				toast.promise(refreshAgents(), {
					loading: `Refreshing agent configuration...`,
					success: `Agent configuration refreshed`,
					error: (err) => `Failed to refresh agent configuration, Error: ${err || err}`
				});
				return;
			}
			if (k === 'n') {
				if (window.location.pathname !== `${base}/workbench`) {
					goto(`${base}/workbench`);
					toast.info('Navigated to session creation page');
				}
				return;
			}
			if (k === '/') {
				openShortcuts = !openShortcuts;
				return;
			}
		}
	};

	function unreachable(PUBLIC_LOGIN_BEHAVIOUR: never) {
		throw new Error('Function not implemented.');
	}

	let namespaceSwitcher = $state(null) as unknown as HTMLButtonElement;
	let creator = $state(null) as unknown as HTMLButtonElement;
	let tourOpen = $state(false);
</script>

<Tour
	bind:open={tourOpen}
	items={[
		{
			target: namespaceSwitcher,
			side: 'right',
			text: "Welcome to Coral Studio!\n\nFirst, let's create a new Template"
		}
		// {
		// 	target: sessionSwitcher,
		// 	side: 'right',
		// 	text: 'Then, once connected:\n\nCreate a session here.'
		// }
	]}
/>

<svelte:window on:keydown={handleKeydown} />

<Login bind:open={loginOpen} />

<Quickswitch {ctx} bind:open={openQuickswitch} bind:debugMenu={debugToolsOpen} />
<Shortcuts bind:open={openShortcuts} />
<DebugTools bind:open={debugToolsOpen} />
<!-- <Welcome bind:open={welcomeOpen} bind:tourToggle={tourOpen} /> -->

<div class="fixed top-3 right-3 z-50 flex items-center gap-2">
	<button
		class="flex max-w-64 cursor-text items-center justify-between gap-6 rounded-md border p-2"
		onclick={() => (openQuickswitch = true)}
	>
		<div class="text-muted-foreground flex items-center gap-2">
			<IconSearch />
			<span class="text-sm">Search</span>
		</div>
		<Kbd.Group>
			<Kbd.Root>CTRL</Kbd.Root>
			<Kbd.Root>K</Kbd.Root>
		</Kbd.Group>
	</button>
	<Tooltip.Provider delayDuration={0}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class=" text-muted-foreground flex size-9 items-center justify-center rounded-md border"
						onclick={() => (welcomeOpen = true)}
					>
						<IconQuestion class="size-4" />
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>Help & Documentation</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>

<Sidebar.Root>
	<Sidebar.Header>
		<ServerSwitcher bind:ref={namespaceSwitcher} />
		<Sidebar.GroupLabel class="pr-0">
			<span
				class="text-muted-foreground w-full grow font-sans font-medium tracking-wide select-none"
				>Server</span
			>
			<Tooltip.Provider delayDuration={0}>
				<Tooltip.Root>
					<Tooltip.Trigger disabled={error === null}>
						<span
							class={cn(
								'text-muted-foreground font-normal',
								(error || !ctx.server.alive) && 'text-destructive'
							)}
						>
							{#if error || !ctx.server.alive}
								disconnected
							{:else}
								connected
							{/if}
						</span>
					</Tooltip.Trigger>
					<Tooltip.Content><p>{error}</p></Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
			<Button
				size="icon"
				variant="ghost"
				class="mx-1 size-7"
				disabled={connecting}
				onclick={() => refreshAgents()}
			>
				<IconArrowsClockwise class={cn('size-4', connecting && 'animate-spin')} />
			</Button>
		</Sidebar.GroupLabel>
		<Sidebar.GroupContent>
			<Sidebar.Menu>
				<!-- <SidebarLink url="{base}/" icon={IconHome} title="Home" /> -->
				<SidebarLink url="{base}/server/registry" icon={IconPackage} title="Agent Registry" />
				<SidebarLink url="{base}/server/logs" icon={IconNotepad} title="Logs" disabled />

				<Sidebar.MenuItem>
					<SidebarLink url="{base}/workbench" icon={IconCircuity} title="Workbench" />
					<Sidebar.MenuSub>
						<Sidebar.MenuSubItem>
							<SidebarLink url="{base}/workbench/templates/" icon={IconFolder} title="Templates" />
						</Sidebar.MenuSubItem>
					</Sidebar.MenuSub>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Header>
	<Sidebar.Content class="gap-0 overflow-hidden">
		<Sidebar.Group>
			<Sidebar.Separator />
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.GroupLabel class="text-muted-foreground">Session</Sidebar.GroupLabel>
					<SessionSwitcher />

					<NavBundle
						items={[
							{
								title: 'Threads',
								icon: IconFileArchive,
								sumBadges: true,
								items: conn
									? Object.values(conn.threads).map((thread) => ({
											id: thread.id,
											title: thread.name,
											url: `${base}/thread/#${thread.id}`,
											badge: thread.unread
										}))
									: []
							},
							{
								title: 'Agents',
								icon: IconRobot,
								items: conn
									? Object.entries(conn.agents).map(([title, agent]) => ({
											title,
											url: `${base}/agent/#${title}`,
											state: agent.status
										}))
									: []
							}
						]}
					/>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem class="flex justify-end gap-4">
				<Button onclick={toggleMode} variant="outline" size="icon">
					<SunIcon
						class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
					/>
					<MoonIcon
						class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
