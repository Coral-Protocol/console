<script lang="ts">
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Kbd from '@coral-os/component-library/ui/kbd/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as ContextMenu from '@coral-os/component-library/ui/context-menu/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';

	import { toast } from 'svelte-sonner';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import Quickswitch from '$lib/components/dialogs/quickswitch.svelte';
	import DebugTools from '$lib/components/dialogs/debugtools.svelte';
	import Login from './Login.svelte';
	import Welcome from './dialogs/welcome.svelte';

	import IconFileArchive from 'phosphor-icons-svelte/IconFileArchiveRegular.svelte';
	import MoonIcon from 'phosphor-icons-svelte/IconMoonRegular.svelte';
	import SunIcon from 'phosphor-icons-svelte/IconSunRegular.svelte';
	import IconArrowsClockwise from 'phosphor-icons-svelte/IconArrowsClockwiseRegular.svelte';
	import IconArrowDownRegular from 'phosphor-icons-svelte/IconArrowDownRegular.svelte';
	import IconArrowLeft from 'phosphor-icons-svelte/IconArrowLeftRegular.svelte';
	import IconCaretDownRegular from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconRobot from '$lib/icons/robot.svelte';
	import IconSearch from 'phosphor-icons-svelte/IconMagnifyingGlassRegular.svelte';
	import IconQuestion from 'phosphor-icons-svelte/IconQuestionRegular.svelte';
	import IconPackage from 'phosphor-icons-svelte/IconPackageRegular.svelte';
	import IconNotepad from 'phosphor-icons-svelte/IconNotepadRegular.svelte';
	import IconCircuity from 'phosphor-icons-svelte/IconCircuitryRegular.svelte';
	import IconFolder from 'phosphor-icons-svelte/IconFolderRegular.svelte';
	import IconPlus from 'phosphor-icons-svelte/IconPlusRegular.svelte';
	import IconHome from 'phosphor-icons-svelte/IconHouseRegular.svelte';
	import IconXRegular from 'phosphor-icons-svelte/IconXRegular.svelte';
	import IconGhost from 'phosphor-icons-svelte/IconGhostRegular.svelte';
	import IconEnvelopeOpen from 'phosphor-icons-svelte/IconEnvelopeOpenRegular.svelte';
	import IconDotsThree from 'phosphor-icons-svelte/IconDotsThreeRegular.svelte';
	import IconCheckRegular from 'phosphor-icons-svelte/IconCheckRegular.svelte';

	import * as Popover from '@coral-os/component-library/ui/popover/index.js';

	import { cn } from '$lib/utils';
	import { socketCtx } from '$lib/socket.svelte';
	import { toggleMode } from 'mode-watcher';

	import NamespaceSwitcher from './namespace-switcher.svelte';
	import NavBundle from './nav-bundle.svelte';
	import { SidebarLink, Tour } from '@coral-os/component-library';

	import { goto } from '$app/navigation';
	import Shortcuts from './dialogs/shortcuts.svelte';
	import { appContext } from '$lib/context';
	import { base } from '$app/paths';
	import { useDebounce, watch } from 'runed';
	import config from '$lib/config';
	import SessionSwitcher from './SessionSwitcher.svelte';
	import { fade } from 'svelte/transition';
	import { Badge } from '@coral-os/component-library/components/ui/badge/index.js';
	import CreateThreadForm from './CreateThreadForm.svelte';
	import { tourTarget } from './tour/tourTarget';

	import Logo from '$lib/icons/logo.svelte';
	import type { WithElementRef } from 'bits-ui';

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
				toast.success('Connected to server.');
				toast.dismiss('server-disconnected');
				refreshAgents(false);
			}
		}
	);

	let loginOpen = $state(false);

	const refreshAgents = async (notify?: boolean) => {
		try {
			connecting = true;
			error = null;

			await ctx.server.fetchAll();
			ctx.server.alive = true;
			connecting = false;
			if (notify) {
				toast.success('Connection refreshed');
			}
		} catch (e) {
			connecting = false;
			error = `${e}`;
			toast.error('Failed to refresh connection. ' + error);
			throw e;
		}
	};

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

	let tourOpen = $state(false);

	let threadCreateOpen = $state(false);

	let namespaces = $derived(ctx.server.namespaces.filter((ns) => ns !== 'default'));

	watch([() => ctx.server.namespaces], () => {
		if (!(ctx.server.namespace in ctx.server.sessions)) {
			ctx.server.namespace = 'default';
		}
	});

	let dialogOpen = $state(false);

	let newNamespace = $state('Untitled Namespace');
	let duplicate = $derived(newNamespace === 'default' || newNamespace in ctx.server.namespaces);

	let { ref = $bindable(null) }: WithElementRef<{}, HTMLButtonElement> = $props();
</script>

<svelte:window on:keydown={handleKeydown} />

<Login bind:open={loginOpen} />

<Quickswitch {ctx} bind:open={openQuickswitch} bind:debugMenu={debugToolsOpen} />
<Shortcuts bind:open={openShortcuts} />
<DebugTools bind:open={debugToolsOpen} />
<Welcome bind:open={welcomeOpen} bind:tourToggle={tourOpen} />

<div
	class="fixed top-3.5 right-3 z-1 flex items-center justify-end gap-1"
	use:tourTarget={'quick-switch'}
>
	<Button
		class="flex w-full max-w-64 cursor-text items-center justify-between gap-6 "
		variant="ghost"
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
	</Button>

	<Separator orientation="vertical" class="!h-6" />

	<Button size="icon" variant="ghost" onclick={() => (welcomeOpen = true)}>
		<IconQuestion class="size-4" />
	</Button>

	<Separator orientation="vertical" class="!h-6" />

	<Button onclick={toggleMode} variant="ghost" size="icon">
		<SunIcon
			class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
		/>
		<MoonIcon
			class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
</div>

<Sidebar.Root class="">
	<Sidebar.Header class="mb-2 p-0">
		<div class="flex items-center justify-between">
			<a href="{base}/" class="flex p-2">
				<div>
					<Logo class="text-foreground size-10" />
				</div>
				<div class="flex flex-col gap-0.5 text-lg leading-none">
					<span class="font-[Oxanium] font-semibold tracking-widest"
						>Coral<span class="text-brand-primary font-bold tracking-normal">OS</span>
					</span>
					<span class="text-brand-primary font-sans text-sm">Console</span>
				</div>
			</a>
			{#if config.PUBLIC_DEPLOYMENT === 'cloud'}
				<Button
					variant="ghost"
					onclick={() => {
						window.location.href = '/';
					}}><IconArrowLeft /> Return to Cloud</Button
				>
			{/if}
		</div>

		<Sidebar.Group>
			<Sidebar.GroupLabel class="text-muted-foreground">Namespace</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem class="flex">
						<NamespaceSwitcher />
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Header>
	<Sidebar.Content class="gap-0 overflow-hidden">
		<Sidebar.Group>
			<Sidebar.GroupLabel class="pr-0">
				<span
					class="text-muted-foreground w-full grow font-sans font-medium tracking-wide select-none"
					>Server</span
				>
				<Tooltip.Root delayDuration={0}>
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
					<SidebarLink url="{base}/" icon={IconHome} title="Home" />
					<div use:tourTarget={'registry'}>
						<SidebarLink url="{base}/server/registry" icon={IconPackage} title="Agent Registry" />
					</div>
					<!-- <div use:tourTarget={'logs'}>
						<SidebarLink url="{base}/server/logs" icon={IconNotepad} title="Logs" disabled />
					</div> -->

					<div use:tourTarget={'workbench'}>
						<SidebarLink url="{base}/workbench" icon={IconCircuity} title="Workbench" />
					</div>
					<Sidebar.MenuSub>
						<div use:tourTarget={'templates'}>
							<SidebarLink url="{base}/workbench/templates/" icon={IconFolder} title="Templates" />
						</div>
					</Sidebar.MenuSub>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group>
			<Sidebar.GroupLabel class="text-muted-foreground">Session</Sidebar.GroupLabel>

			<Sidebar.GroupContent>
				<div use:tourTarget={'session-section'}>
					<Sidebar.Menu class="relative">
						<SessionSwitcher />
						{#if ctx.session?.possessed}
							{@const agent = ctx.session.possessed}
							<section
								transition:fade={{ duration: 100 }}
								class="text-muted-foreground mx-2 -mt-1 mb-2 flex items-center gap-2 text-xs"
							>
								Acting as <Badge href="{base}/agent/#{agent}">{agent}</Badge>
								<Button
									size="icon"
									variant="ghost"
									class="size-5"
									onclick={() => {
										if (!ctx.session) return;
										ctx.session.possessed = null;
									}}><IconXRegular /></Button
								>
							</section>
						{/if}
						<NavBundle
							title="Threads"
							icon={IconFileArchive}
							items={conn
								? Object.values(conn.threads).map((thread) => ({
										id: thread.id,
										title: thread.name,
										url: `${base}/thread/#${thread.id}`,
										badge: thread.unread
									}))
								: []}
							emptyLabel="No threads."
						>
							{#snippet itemContextMenu({ item })}
								{@const thread = item.id !== undefined ? ctx.session?.threads[item.id] : undefined}
								<ContextMenu.Item
									disabled={!thread || thread.unread === 0}
									onSelect={() => {
										if (!ctx.session || !item.id || !(item.id in ctx.session.threads)) return;
										ctx.session.threads[item.id]!.unread = 0;
									}}><IconEnvelopeOpen /> Mark as read</ContextMenu.Item
								>
							{/snippet}
							{#snippet actions()}
								<Popover.Root bind:open={threadCreateOpen}>
									<Tooltip.Root disabled={!ctx.session || ctx.session.possessed !== null}>
										<Tooltip.Trigger>
											{#snippet child({ props }: any)}
												<Popover.Trigger
													{...props}
													disabled={!ctx.session || !ctx.session?.possessed}
													onclick={(e: any) => {
														e.stopPropagation();
													}}
													class={cn(buttonVariants({ size: 'icon', variant: 'ghost' }), 'size-6')}
												>
													<IconPlus />
												</Popover.Trigger>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content
											><span>You must be possessing an agent to create a thread!</span
											></Tooltip.Content
										>
									</Tooltip.Root>
									<Popover.Content>
										{@const agent =
											ctx.session?.possessed && ctx.session?.agents[ctx.session?.possessed]}
										{#if ctx.session && agent}
											<CreateThreadForm
												{agent}
												session={ctx.session}
												onCreate={() => {
													threadCreateOpen = false;
												}}
											/>
										{/if}
									</Popover.Content>
								</Popover.Root>
							{/snippet}
						</NavBundle>
						<NavBundle
							title="Agents"
							icon={IconRobot}
							items={conn
								? Object.entries(conn.agents).map(([title, agent]) => ({
										id: title,
										title,
										url: `${base}/agent/#${title}`,
										state: agent.status
									}))
								: []}
							emptyLabel="No agents."
						>
							{#snippet itemContextMenu({ item })}
								<ContextMenu.Item
									onSelect={() => {
										if (!ctx.session) return;
										ctx.session.possessed = item.id ?? null;
									}}><IconGhost /> Possess</ContextMenu.Item
								>
								<!-- <ContextMenu.Item -->
								<!-- 	class="bg-destructive/50 hover:bg-destructive dark:hover:bg-destructive" -->
								<!-- 	onSelect={async () => { -->
								<!-- 		if (!ctx.session || !item.id) return; -->
								<!-- 		try { -->
								<!-- 			await ctx.server.killAgent(ctx.session.sessionId, item.id); -->
								<!-- 			toast.success(`Agent '${item.id}' killed.`); -->
								<!-- 		} catch (e) { -->
								<!-- 			toast.error(`${e}`); -->
								<!-- 		} -->
								<!-- 	}}><IconSkull /> Kill</ContextMenu.Item -->
								<!-- > -->
							{/snippet}
							{#snippet itemActions({ item })}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props }: any)}
											<Button {...props} variant="ghost" size="icon"><IconDotsThree /></Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content class="w-56" align="start">
										<DropdownMenu.Item
											onSelect={() => {
												if (!ctx.session) return;
												ctx.session.possessed = item.id ?? null;
											}}
											><IconGhost /> Possess
										</DropdownMenu.Item>
										<!-- <DropdownMenu.Item -->
										<!-- 	class="bg-destructive/50 hover:bg-destructive dark:hover:bg-destructive" -->
										<!-- 	onSelect={async () => { -->
										<!-- 		if (!ctx.session || !item.id) return; -->
										<!-- 		try { -->
										<!-- 			await ctx.server.killAgent(ctx.session.sessionId, item.id); -->
										<!-- 			toast.success(`Agent '${item.id}' killed.`); -->
										<!-- 		} catch (e) { -->
										<!-- 			toast.error(`${e}`); -->
										<!-- 		} -->
										<!-- 	}}><IconSkull /> Kill</DropdownMenu.Item -->
										<!-- > -->
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/snippet}
						</NavBundle>
					</Sidebar.Menu>
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<Sidebar.Rail />
	</Sidebar.Content>
</Sidebar.Root>
