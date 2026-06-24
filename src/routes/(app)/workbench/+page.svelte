<script lang="ts">
	// ─── UI Component Library ─────────────────────────────────────────────────
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Table from '@coral-os/component-library/ui/table/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';
	import * as AlertDialog from '@coral-os/component-library/ui/alert-dialog/index.js';
	import * as Dialog from '@coral-os/component-library/ui/dialog/index.js';
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as UnderlineTabs from '@coral-os/component-library/ui/underline-tabs/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import { Checkbox } from '@coral-os/component-library/ui/checkbox/index.js';
	import { Label } from '@coral-os/component-library/ui/label/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';
	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';
	import { Pip, TwostepButton } from '@coral-os/component-library';
	import { Skeleton } from '@coral-os/component-library/components/ui/skeleton/index.js';
	import { Input } from '@coral-os/component-library/ui/input/index.js';

	import { TooltipLabel } from '@coral-os/component-library';

	// ─── Icons ────────────────────────────────────────────────────────────────
	import IconWrenchRegular from 'phosphor-icons-svelte/IconWrenchRegular.svelte';
	import IconUsersThreeRegular from 'phosphor-icons-svelte/IconUsersThreeRegular.svelte';
	import IconRobotRegular from '$lib/icons/robot.svelte';
	import IconCaretDown from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconTrashRegular from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconStorefront from 'phosphor-icons-svelte/IconStorefrontRegular.svelte';
	import IconFileText from 'phosphor-icons-svelte/IconFileTextRegular.svelte';

	// ─── Local Components ─────────────────────────────────────────────────────
	import Header from '$lib/components/header.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import Graph from '$lib/components/Graph/Graph.svelte';
	import LoggedOutWarning from './LoggedOutWarning.svelte';
	import SidebarTab from './SidebarTab.svelte';
	import AgentPicker from './AgentPicker.svelte';
	import TemplatePicker from './TemplatePicker.svelte';
	import TemplateSaver from './TemplateSaver.svelte';
	import Bool from './options/Bool.svelte';

	// ─── Panes ────────────────────────────────────────────────────────────────
	import CodePane from './panes/CodePane.svelte';
	import ToolsPane from './panes/ToolsPane.svelte';
	import GroupsPane from './panes/GroupsPane.svelte';
	import BudgetPane from './panes/BudgetPane.svelte';
	import SessionPane from './panes/SessionPane.svelte';
	import AgentPane from './panes/AgentPane.svelte';
	import MarketPane from './panes/MarketPane.svelte';

	// ─── Third-party Libraries ────────────────────────────────────────────────
	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import { PersistedState } from 'runed';
	import { toast } from 'svelte-sonner';
	import { string } from 'zod';
	import { z } from 'zod';
	import { Context, Debounced, useDebounce } from 'runed';

	// ─── Svelte / SvelteKit ───────────────────────────────────────────────────
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';

	// ─── App Internals ────────────────────────────────────────────────────────
	import { appContext } from '$lib/context';
	import { CoralServer, agentIdOf, type RegistryAgentIdentifier } from '$lib/CoralServer.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { Session } from '$lib/session.svelte';
	import {
		makeFormSchema,
		type CreateSessionRequest,
		type FormSchema
	} from '$lib/sessionSchema/types';
	import { toPayload, importFromPayload } from '$lib/sessionSchema';
	import { sessionDraft, recentSession } from '$lib/sessionDraftData';
	import {
		setSessionContext,
		type SessionCreatorContext,
		type AgentSource
	} from '$lib/sessionCreatorContext';
	import { getSessionDataFromTemplateName } from './templates/TemplateLib';
	import { tourTarget } from '$lib/components/tour/tourTarget';
	import { cn } from '$lib/utils';
	import config from '$lib/config';

	// ─── Types ────────────────────────────────────────────────────────────────

	interface ParsedAgent {
		source: AgentSource;
		name: string;
		version: string;
		raw: string;
	}

	type Settings = {
		enableAgentGraphView: boolean;
		columns: {
			name: boolean;
			version: boolean;
			registrySource: boolean;
			agent: boolean;
		};
	};

	// ─── Constants ────────────────────────────────────────────────────────────

	const AGENT_REGEX = /^(marketplace|linked|local):(.+?)@(\d+\.\d+\.\d+)$/;

	// ─── Helpers ──────────────────────────────────────────────────────────────

	function sourceToRegistryId(source: AgentSource): RegistryAgentIdentifier['registrySourceId'] {
		switch (source) {
			case 'local':
				return { type: 'local' };
			case 'marketplace':
				return { type: 'marketplace' };
			case 'linked':
				return { type: 'linked', linkedServerId: 'default' };
		}
	}

	function parseAgentsQuery(query: string | null) {
		if (!query) return { agents: [], errors: [] as string[] };

		const agentsFromQuery: ParsedAgent[] = [];
		const errors: string[] = [];

		for (const raw of query.split(',')) {
			const trimmed = raw.trim();
			if (!trimmed) continue;

			const match = trimmed.match(AGENT_REGEX);
			if (!match) {
				errors.push(`Invalid agent format: "${trimmed}"`);
				continue;
			}

			const [, source, name, version] = match;
			agentsFromQuery.push({
				source: source as AgentSource,
				name: name ?? '',
				version: version ?? '',
				raw: trimmed
			});
		}

		return { agents: agentsFromQuery, errors };
	}

	// ─── App Context & Schema ─────────────────────────────────────────────────

	let ctx = appContext.get();
	let formSchema = $derived(makeFormSchema(ctx.server));

	// ─── Persisted State ──────────────────────────────────────────────────────

	const settings = new PersistedState<Settings>('appSettings', {
		enableAgentGraphView: true,
		columns: {
			name: true,
			version: true,
			registrySource: true,
			agent: true
		}
	});

	const lastSession = new PersistedState<{
		sessionId: string | null;
		namespace: string | null;
		closeLastSession: boolean;
	}>('lastSession', {
		sessionId: null,
		namespace: null,
		closeLastSession: true
	});

	// ─── UI State ─────────────────────────────────────────────────────────────

	let currentTab = $state('agent');
	let agentsListTabs: string = $state('table');
	let sendingForm = $state(false);
	let loadingAgent = $state(false);
	let templateSaverDialogOpen = $state(false);
	let loggedOutDialog = $state(false);
	let view = $state('workbench');
	let overwriteDraft = $state({ template: '', override: false });
	let lastDeletedAgent: { agent: any; index: number } | null = $state(null);
	let parsedAgents: ParsedAgent[] = [];
	let initialised = $state(false);

	// ─── Form Setup ───────────────────────────────────────────────────────────

	// svelte-ignore state_referenced_locally
	let form = superForm(defaults(zod4(formSchema)), {
		SPA: true,
		dataType: 'json',
		validators: zod4(formSchema),
		validationMethod: 'onblur',
		resetForm: false,
		async onUpdate({ form: f }) {
			if (!f.valid) {
				toast.error('Please fix all errors in the form.');
				console.error({ errors: f.errors });
				return;
			}
			try {
				sendingForm = true;

				if (
					lastSession.current.closeLastSession &&
					lastSession.current.sessionId &&
					lastSession.current.namespace
				) {
					await ctx.server.api
						.DELETE('/api/v1/local/session/{namespace}/{sessionId}', {
							params: {
								path: {
									namespace: lastSession.current.namespace,
									sessionId: lastSession.current.sessionId
								}
							}
						})
						.catch((e) => console.error('Failed to close last session:', e));
				}

				const body = await toPayload(ctx.server, $formData);
				const res = await ctx.server.api.POST('/api/v1/local/session', { body });

				if (res.error) {
					let error: { message?: string; stackTrace?: string[] } = res.error;
					console.error(error.stackTrace);
					toast.error(`Failed to create session: ${error.message}`, { duration: Infinity });
					return;
				}

				if (res.data) {
					lastSession.current.sessionId = res.data.sessionId;
					lastSession.current.namespace = ctx.server.namespace;
					ctx.session = new Session({
						sessionId: res.data.sessionId,
						namespace: ctx.server.namespace,
						server: ctx.server
					});
				} else {
					throw new Error('no data received');
				}
			} catch (e) {
				console.log(e);
				toast.error(`Failed to create session: ${e}`, { duration: Infinity });
			} finally {
				sendingForm = false;
			}
		}
	});

	// Workaround: superForm validators can't be set in a $derived
	$effect(() => {
		form.options.validators = zod4(formSchema);
	});

	let { form: formData, errors, enhance } = $derived(form);

	// ─── Session Context ──────────────────────────────────────────────────────

	let sessCtx = $state({
		// svelte-ignore state_referenced_locally
		formData,
		// svelte-ignore state_referenced_locally
		errors,
		form,
		payload: null,
		selectedAgent: null,
		detailedAgent: null,

		importSession: ({
			success = 'Session JSON updated successfully',
			from
		}: {
			success?: string;
			from: string;
		}): boolean => {
			try {
				$formData = importFromPayload(from);
				sessCtx.selectedAgent = $formData.agents.length > 0 ? 0 : null;
				toast.success(success);
				return true;
			} catch (e) {
				console.error(e);
				toast.error('Failed to update session from JSON: ' + e);
				return false;
			}
		},

		addAgent: async (name: string, source: any, version: string) => {
			if (loadingAgent) throw new Error('Already adding an agent, please wait');
			loadingAgent = true;

			const existingCount = $formData.agents.filter((a) => a.id.name === name).length;
			const registrySourceId = sourceToRegistryId(source as AgentSource);

			try {
				const detailed = await ctx.server.lookupAgent({ name, version, registrySourceId });
				if (!detailed) {
					loadingAgent = false;
					throw new Error('Agent not found');
				}

				$formData.agents.push({
					id: { name, version, registrySourceId },
					name: name + (existingCount > 0 ? `-${existingCount}` : ''),
					description: detailed.registryAgent.info.description,
					providerType: 'local',
					provider: {
						runtime: Object.keys(detailed.registryAgent.runtimes)[0] as any,
						remote_request: {
							maxCost: { type: 'micro_coral', amount: 1000 },
							serverSource: { type: 'servers', servers: [] }
						}
					},
					customToolAccess: new Set(),
					blocking: false,
					budgetSettings: {
						budget: 0,
						exhaustionBehavior: { type: 'consume_session' }
					},
					options: {}
				});

				$formData.agents = $formData.agents;
				sessCtx.selectedAgent = $formData.agents.length - 1;
			} catch (error) {
				throw error as Error;
			} finally {
				loadingAgent = false;
			}
		}
	}) as SessionCreatorContext;

	setSessionContext(sessCtx);

	$effect(() => {
		sessCtx.formData = formData;
		sessCtx.errors = errors;
		sessCtx.form = form;
	});

	$effect(() => {
		ctx.server.namespace;
		toPayload(ctx.server, $formData)
			.then((val) => {
				sessCtx.payload = val;
			})
			.catch(console.error);
	});

	// ─── Agent Selection & Detail ─────────────────────────────────────────────

	let curAgent = $derived(
		sessCtx.selectedAgent !== null ? $formData.agents[sessCtx.selectedAgent] : undefined
	);

	let curAgentId = $derived(curAgent ? agentIdOf(curAgent.id) : null);

	$effect(() => {
		const id = curAgentId;
		sessCtx.selectedAgent; // track so effect re-runs when same agent is added again
		let active = true;

		if (id) {
			untrack(() => {
				sessCtx.detailedAgent = null;
				getDetailed(curAgent!.id).then((d) => {
					if (active) sessCtx.detailedAgent = d;
				});
			});
		} else {
			sessCtx.detailedAgent = null;
		}

		return () => {
			active = false;
		};
	});

	const getDetailed = async (agentId: RegistryAgentIdentifier) => {
		return await ctx.server.lookupAgent(agentId).catch((e) => {
			toast.error(`${e}`);
			console.error(e);
			return null;
		});
	};

	// ─── Agent CRUD ───────────────────────────────────────────────────────────

	const removeAgent = (index: number) => {
		if (index < 0 || index >= $formData.agents.length) return;

		const agent = $formData.agents[index];
		lastDeletedAgent = { agent, index };
		$formData.agents.splice(index, 1);
		$formData.agents = $formData.agents;

		if (sessCtx.selectedAgent !== null) {
			if (sessCtx.selectedAgent === index) {
				sessCtx.selectedAgent = 0;
			} else if (sessCtx.selectedAgent > index) {
				sessCtx.selectedAgent--;
			}
		}

		toast(`Agent "${lastDeletedAgent.agent.name}" deleted`, {
			action: { label: 'Undo', onClick: restoreAgent }
		});
	};

	const restoreAgent = () => {
		if (!lastDeletedAgent) return;

		$formData.agents.splice(lastDeletedAgent.index, 0, lastDeletedAgent.agent);
		$formData.agents = $formData.agents;
		toast.success('Agent "' + lastDeletedAgent.agent.name + '" restored');
		sessCtx.selectedAgent = lastDeletedAgent.index;
		lastDeletedAgent = null;
	};

	// ─── Session Lifecycle ────────────────────────────────────────────────────

	function clearSession() {
		$formData = {
			groups: [],
			tools: {},
			sessionRuntimeSettings: { ttl: 50000 },
			sessionBudgetSettings: {
				budget: 100000000,
				exhaustionBehavior: { type: 'kill_session', minimum: 1000000 }
			},
			agents: [],

			annotations: {}
		};
		sessCtx.selectedAgent = null;
	}

	let debouncedFormData = new Debounced(() => $formData, 100);

	$effect(() => {
		const data = debouncedFormData.current;
		if (!initialised || !data) return;

		toPayload(ctx.server, data)
			.then((payload) => {
				untrack(() => {
					sessCtx.payload = payload;
					sessionDraft.current = payload;
				});
			})
			.catch(console.error);
	});

	let emptySession = $derived(!loadingAgent && $formData.agents.length === 0);

	// ─── Template Handling ────────────────────────────────────────────────────

	const loadTemplate = (template: string, override?: boolean) => {
		if (
			sessionDraft.current &&
			sessionDraft.current.agentGraphRequest?.agents.length > 0 &&
			!override
		) {
			overwriteDraft = { template, override: true };
		} else {
			if (template) {
				toast('Loading template...', { duration: 2000 });
				try {
					const templateSessionData = getSessionDataFromTemplateName(template);
					sessCtx.importSession({
						from: templateSessionData,
						success: 'Template loaded successfully'
					});
				} catch (err) {
					console.error('Failed to load template:', err);
					toast.error('Failed to load template: ' + err);
				}
			}
		}
	};

	// ─── Auth / Login ─────────────────────────────────────────────────────────

	$effect(() => {
		ctx.server.onNoAuth = onNoAuth;
	});

	const onNoAuth = useDebounce(() => {
		switch (config.PUBLIC_LOGIN_BEHAVIOUR) {
			case 'token':
				loggedOutDialog = true;
				break;
			case 'reload':
				break;
			default:
				loggedOutDialog = true;
				break;
		}
	}, 500);

	// ─── Misc Hooks ───────────────────────────────────────────────────────────

	const isMobile = new IsMobile();

	// ─── Mount ────────────────────────────────────────────────────────────────

	onMount(async () => {
		if (sessionDraft.current && sessionDraft.current.agentGraphRequest.agents.length >= 0) {
			sessCtx.importSession({
				from: JSON.stringify(sessionDraft.current),
				success: 'Loaded previous workbench draft'
			});
		}

		const agentsQuery = page.url.searchParams.get('agents');
		const template = page.url.searchParams.get('template');

		if (agentsQuery) {
			toast('Parsing agents from URL...', { duration: 2000 });
			try {
				const result = parseAgentsQuery(agentsQuery);
				parsedAgents = result.agents;

				for (const agent of parsedAgents) {
					console.log(
						`following url instructions to add agent: ${agent.name}@${agent.version} from ${agent.source}`
					);
					toast.promise(sessCtx.addAgent(agent.name, agent.source, agent.version), {
						loading: 'Adding agent...',
						success: 'Agent added successfully',
						error: (err: any) => `Failed: ${err.message || err}`
					});
				}
			} catch (err) {
				console.error('Failed to parse agents:', err);
			}
		}

		if (template) {
			loadTemplate(template);
		}

		initialised = true;
	});
</script>

<Dialog.Root bind:open={overwriteDraft.override}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Overwrite current session?</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. This will delete any unsaved progress in the Workbench.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>Close</Dialog.Close>
			<Button
				onclick={() => (
					loadTemplate(overwriteDraft.template, true), (overwriteDraft.override = false)
				)}>Continue</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#if sessCtx.payload}
	<TemplateSaver bind:open={templateSaverDialogOpen} data={JSON.stringify(sessCtx.payload)} />
{/if}

<LoggedOutWarning bind:open={loggedOutDialog} />

<Header>
	<Menubar.Root class="bg-sidebar m-0 w-full border-0 p-0 shadow-none">
		<Menubar.Menu>
			<Menubar.Trigger class="gap-1">File</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item onSelect={clearSession}>Clear session</Menubar.Item>
				<Menubar.Separator />
				<Menubar.Item
					onSelect={async () => {
						sessCtx.importSession({
							from: await navigator.clipboard.readText(),
							success: 'Session updated from clipboard'
						});
					}}>Import JSON from clipboard</Menubar.Item
				>
				<Menubar.Item
					disabled={!sessCtx.payload}
					onSelect={() => (
						navigator.clipboard.writeText(
							sessCtx.payload ? JSON.stringify(sessCtx.payload, null, 4) : ''
						),
						toast.success('Session JSON copied to clipboard')
					)}>Export JSON to clipboard</Menubar.Item
				>
			</Menubar.Content>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger class="gap-1">View</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.CheckboxItem bind:checked={settings.current.enableAgentGraphView}
					>Enable graph in groups</Menubar.CheckboxItem
				>
				<Menubar.Separator />
				<Menubar.Sub>
					<Menubar.SubTrigger disabled class="opacity-50">Columns</Menubar.SubTrigger>
					<Menubar.SubContent>
						<Menubar.CheckboxItem>Name</Menubar.CheckboxItem>
						<Menubar.CheckboxItem>Version</Menubar.CheckboxItem>
						<Menubar.CheckboxItem>Registry Source</Menubar.CheckboxItem>
						<Menubar.CheckboxItem>Agent</Menubar.CheckboxItem>
					</Menubar.SubContent>
				</Menubar.Sub>
			</Menubar.Content>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger class="gap-1">Templates</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item onSelect={() => (templateSaverDialogOpen = true)} disabled={sendingForm}
					>Save as template</Menubar.Item
				>
				<Menubar.Sub>
					<Menubar.SubTrigger>Load template...</Menubar.SubTrigger>
					<Menubar.SubContent>
						<TemplatePicker
							server={ctx.server}
							onSelect={(template) => {
								loadTemplate(template);
							}}
						/>
					</Menubar.SubContent>
				</Menubar.Sub>
			</Menubar.Content>
		</Menubar.Menu>
	</Menubar.Root>
</Header>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
	method="POST"
	use:enhance
	class="flex h-full flex-col gap-2 overflow-hidden p-2 pt-0"
	enctype="multipart/form-data"
	autocomplete="off"
	onkeydown={(e) => {
		if (e.isComposing) return;
		if (e.key !== 'Enter') return;

		const el = document.activeElement;

		if (el instanceof HTMLInputElement) {
			e.preventDefault();
			el.blur();
		}
	}}
	onsubmit={(e) => e.preventDefault()}
>
	{#if view === 'workbench'}
		<Resizable.PaneGroup
			direction={isMobile.current ? 'vertical' : 'horizontal'}
			class="min-h-0 flex-1 flex-row-reverse overflow-hidden "
		>
			<Resizable.Pane defaultSize={75} minSize={25}>
				<Resizable.PaneGroup direction="vertical">
					<Resizable.Pane minSize={25} defaultSize={70} class="relative">
						{#if emptySession && initialised}
							<div
								class="absolute z-10 m-auto flex h-full w-full flex-col items-center justify-center gap-2"
							>
								<Card.Root>
									<Card.Header>
										<Card.Title>Start a new session</Card.Title>
										<Card.Description>
											Get started creating a new session by <span class="font-medium"
												>adding an agent</span
											>
											or choosing a <span class="font-medium">template</span>.
										</Card.Description>
									</Card.Header>
									<Card.Content>
										<Popover.Root>
											<Popover.Trigger class="{buttonVariants({ variant: 'outline' })}, w-42"
												><IconFileText /> Load template</Popover.Trigger
											>
											<Popover.Content class="p-1">
												<TemplatePicker
													server={ctx.server}
													onSelect={(template) => {
														loadTemplate(template);
													}}
												/>
											</Popover.Content>
										</Popover.Root>
										<Popover.Root>
											<Popover.Trigger class="{buttonVariants()}, w-42">
												<IconPlusCircle /> Add agent</Popover.Trigger
											>
											<Popover.Content class="p-1">
												<AgentPicker
													server={ctx.server}
													onSelect={(agent, catalogId) => {
														toast.promise(
															sessCtx.addAgent(agent.name, catalogId.type, agent.versions[0]!),
															{
																loading: 'Adding agent...',
																success: 'Agent added successfully',
																error: (err: any) => `Failed: ${err.message || err}`
															}
														);
													}}
												/>
											</Popover.Content>
										</Popover.Root>
									</Card.Content>
								</Card.Root>
							</div>
						{:else if !initialised}
							<Spinner class="m-full absolute top-0 bottom-0 z-50 m-auto size-5 w-full" />
						{/if}
						<Card.Root class="h-full gap-0 py-0">
							<Card.Content class=" flex h-full flex-col px-0">
								<UnderlineTabs.Root
									bind:value={agentsListTabs}
									class="h-full min-h-0 flex-1 grow gap-0 overflow-hidden"
								>
									<UnderlineTabs.List
										class="bg-sidebar mt-1 flex w-full justify-start gap-2 rounded-none px-1 "
									>
										<UnderlineTabs.Trigger value="table" class="h-full grow-0"
											>Table view</UnderlineTabs.Trigger
										>

										<UnderlineTabs.Trigger value="graph" class="h-full grow-0"
											>Graph view</UnderlineTabs.Trigger
										>
										<Popover.Root>
											<Popover.Trigger
												class={cn(
													buttonVariants({ size: 'sm' }),
													'relative  -mt-1.5 ml-auto gap-2 transition-all',
													emptySession ? 'bg-card text-card-foreground' : ''
												)}
											>
												<IconPlusCircle class="size-5" />
												Add agents</Popover.Trigger
											>
											<Popover.Content class="p-0"
												><AgentPicker
													server={ctx.server}
													onSelect={(agent, catalogId) => {
														toast.promise(
															sessCtx.addAgent(agent.name, catalogId.type, agent.versions[0]!),
															{
																loading: 'Adding agent...',
																success: 'Agent added successfully',
																error: (err: any) => `Failed: ${err.message || err}`
															}
														);
													}}
												/></Popover.Content
											>
										</Popover.Root>
									</UnderlineTabs.List>

									<UnderlineTabs.Content
										value="table"
										class="relative flex h-full min-h-0 flex-1 grow flex-col overflow-hidden "
									>
										<Table.Root class="relative w-full grow border-amber-100/50 text-sm">
											<Table.Header>
												<Table.Row class="*:text-muted-foreground">
													<Table.Head class="w-12"><Checkbox /></Table.Head>
													<Table.Head>Name</Table.Head>
													<Table.Head>Agent</Table.Head>
													<Table.Head>Version</Table.Head>
													<Table.Head>Source</Table.Head>
													<Table.Head>Budget</Table.Head>

													<Table.Head class="w-24">Actions</Table.Head>
												</Table.Row>
											</Table.Header>
											<Table.Body>
												{#if emptySession}
													{#each { length: 10 }, i}
														<Table.Row
															class="hover:bg-transparent"
															style={`opacity: ${1 - i * 0.1}; border-color: color-mix(in oklab, var(--color-border) ${100 - i * 10}%, transparent);`}
														>
															<Table.Cell>
																<Checkbox disabled class="cursor-default!" />
															</Table.Cell>
														</Table.Row>
													{/each}
												{:else}
													{#each $formData.agents as agent, i}
														<Table.Row
															class="cursor-pointer {i === sessCtx.selectedAgent ? 'bg-muted' : ''}"
														>
															<Table.Cell>
																<p class="truncate font-medium"><Checkbox /></p>
															</Table.Cell>
															<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
																<p class="truncate font-medium">{agent.name}</p>
															</Table.Cell>
															<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
																<p class="truncate">{agent.id.name}</p>
															</Table.Cell>

															<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
																<p class="truncate">{agent.id.version}</p>
															</Table.Cell>

															<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
																<p class="truncate">{agent.id.registrySourceId.type}</p>
															</Table.Cell>

															<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
																<p class="truncate">
																	{#if !agent.budgetSettings?.budget}
																		default
																	{:else}
																		${agent.budgetSettings?.budget / 100000000}
																	{/if}
																</p>
															</Table.Cell>

															<Table.Cell class="flex gap-2">
																<Tooltip.Provider>
																	<Tooltip.Root>
																		<Tooltip.Trigger>
																			<TwostepButton
																				class="m-auto"
																				variant="ghost"
																				onclick={() => removeAgent(i)}
																				><span class="sr-only">remove agent</span><IconTrashRegular
																				></IconTrashRegular></TwostepButton
																			>
																		</Tooltip.Trigger>
																		<Tooltip.Content>Remove agent</Tooltip.Content>
																	</Tooltip.Root>
																</Tooltip.Provider>
															</Table.Cell>
														</Table.Row>
													{/each}
												{/if}
												{#if loadingAgent}
													<Table.Row>
														<Table.Cell>
															<p class="truncate font-medium"><Checkbox /></p>
														</Table.Cell>
														<Table.Cell>
															<p class="truncate font-medium"><Spinner class="h-9 w-9" /></p>
														</Table.Cell>

														<Table.Cell>
															<p class="truncate"></p>
														</Table.Cell>

														<Table.Cell>
															<p class="truncate"></p>
														</Table.Cell>

														<Table.Cell>
															<p class="truncate"></p>
														</Table.Cell>
													</Table.Row>
												{/if}
											</Table.Body>
										</Table.Root>
									</UnderlineTabs.Content>
									<UnderlineTabs.Content value="graph" class="flex min-h-0 flex-1 overflow-hidden ">
										<SvelteFlowProvider>
											<Graph
												agents={$formData.agents}
												groups={$formData.groups}
												bind:selectedAgent={sessCtx.selectedAgent}
												controls
												fitDefault={false}
											/>
										</SvelteFlowProvider>
									</UnderlineTabs.Content>
								</UnderlineTabs.Root>
							</Card.Content>
						</Card.Root>
					</Resizable.Pane>
					<Resizable.Handle class="bg-background !h-2" />
					<Resizable.Pane minSize={25} defaultSize={30}>
						<Card.Root class=" h-full border-0 py-0">
							<Tabs.Root value="budget" class="grow gap-0 overflow-hidden">
								<Tabs.List variant="seamless" class="min-h-9! ">
									<Tabs.Trigger value="budget" class="grow-0">Budget settings</Tabs.Trigger>
									<Tabs.Trigger value="session" class="grow-0">Session settings</Tabs.Trigger>
									<Tabs.Trigger value="" class="pointer-events-none min-w-0 flex-1 p-0"
									></Tabs.Trigger>
								</Tabs.List>
								<Card.Content class="min-h-0 grow overflow-y-auto border border-t-0 px-0 pt-4">
									<Tabs.Content
										value="budget"
										class="pb-4 {emptySession
											? '**:text-muted-foreground! text-muted-foreground!'
											: ''}  relative overflow-hidden transition-colors"
									>
										<BudgetPane />
									</Tabs.Content>
									<Tabs.Content value="session" class="relative overflow-hidden">
										<SessionPane />
									</Tabs.Content>
								</Card.Content>
							</Tabs.Root>
						</Card.Root>
					</Resizable.Pane>
				</Resizable.PaneGroup>
			</Resizable.Pane>
			<Resizable.Handle class="bg-background !w-2" />

			<Resizable.Pane
				defaultSize={50}
				minSize={25}
				class="bg-background flex min-h-0 flex-col gap-2"
			>
				<Card.Root class="min-h-0 grow border-0 py-0">
					<Tabs.Root bind:value={currentTab} class="h-full overflow-hidden">
						<Tabs.List variant="seamless" class="min-h-9!">
							<SidebarTab
								value="agent"
								icon={IconRobotRegular}
								invalid={Object.values($errors?.agents ?? {}).length > 0}>Agent</SidebarTab
							>
							<SidebarTab
								value="groups"
								icon={IconUsersThreeRegular}
								invalid={Object.values($errors?.groups ?? {}).length > 0}>Groups</SidebarTab
							>
							<SidebarTab
								value="tools"
								icon={IconWrenchRegular}
								invalid={Object.values($errors?.sessionRuntimeSettings ?? {}).length > 0}
								>Tools</SidebarTab
							>
							<SidebarTab value="marketplace" icon={IconStorefront}>Market</SidebarTab>
							<Tabs.Trigger value="" class="pointer-events-none min-w-0 flex-1 p-0"></Tabs.Trigger>
						</Tabs.List>
						<Card.Content class="min-h-0 grow border border-t-0 px-0 pt-4">
							{#key sessCtx.selectedAgent}
								<Tabs.Content
									value="agent"
									class="flex h-full min-h-0 flex-col gap-2 overflow-y-auto"
								>
									<AgentPane />
								</Tabs.Content>
							{/key}
							<Tabs.Content value="tools" class="flex h-full min-h-0 flex-col overflow-y-auto ">
								<ToolsPane />
							</Tabs.Content>
							<Tabs.Content value="groups" class="flex h-full min-h-0 flex-col overflow-y-auto">
								<GroupsPane />
							</Tabs.Content>
							<Tabs.Content
								value="marketplace"
								class="flex h-full min-h-0 flex-col overflow-y-auto"
							>
								<MarketPane />
							</Tabs.Content>
						</Card.Content>
					</Tabs.Root>
				</Card.Root>
				<Card.Root>
					<Card.Content class="items-right flex gap-4">
						<Tooltip.Provider>
							<div class="my-auto mr-auto flex items-center">
								<Tooltip.Root>
									<Tooltip.Trigger class="my-auto">
										{#snippet child()}
											<div class=" flex h-full items-center gap-2">
												<Checkbox
													id="close-last-session"
													bind:checked={lastSession.current.closeLastSession}
												/>
												<Label
													for="close-last-session"
													class="cursor-pointer text-left text-sm leading-none font-medium"
													>Terminate previous session</Label
												>
											</div>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p>
											Closes the last session made in Console, if it is still open. This will kill
											each of its agents.
										</p>
										{#if lastSession.current.sessionId !== ''}
											<p>Session id: {lastSession.current.sessionId ?? ''}</p>
										{/if}
									</Tooltip.Content>
								</Tooltip.Root>
							</div>

							<Form.ElementField {form} name="annotations.name" class="flex items-center gap-2 ">
								<Form.Control>
									{#snippet children({ props })}
										<TooltipLabel
											title="Session name"
											tooltip="Adds annotations to the session, such as a name, with no effect on functionality. In Coral Console, sessions without a name will be identified by their ID instead"
											extra={{
												type: 'string'
											}}
										>
											<Input
												bind:value={$formData.annotations.name}
												placeholder="session name"
												onblur={(e: FocusEvent) => {
													const value = (e.target as HTMLInputElement).value;
													if (value === '') {
														delete $formData.annotations.name;
														$formData.annotations = $formData.annotations;
													}
												}}
											/>
										</TooltipLabel>
									{/snippet}
								</Form.Control>
							</Form.ElementField>

							<Button variant="outline" onclick={() => (view = 'raw')}>Edit as JSON</Button>

							<span class="flex gap-1">
								<Tooltip.Root delayDuration={30}>
									<Tooltip.Trigger class="flex">
										{#snippet child()}
											<Form.Button disabled={sendingForm || emptySession}>
												{#if sendingForm}
													<Spinner />
												{/if}Create session</Form.Button
											>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p>
											{emptySession
												? 'Cannot create a session without any agents'
												: ' Create a session in the active namespace'}
										</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</span>
						</Tooltip.Provider>
					</Card.Content>
				</Card.Root>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	{:else}
		<Card.Root class="h-full w-full p-0">
			<Card.Content class="relative h-full w-full p-0">
				<CodePane />
			</Card.Content>
			{JSON.stringify(toPayload(ctx.server, $formData), null, 4)}
		</Card.Root>
		<Card.Root
			class="absolute right-4 bottom-4 w-fit py-4 opacity-75 transition-opacity hover:opacity-100"
		>
			<Card.Content class="items-right flex gap-4 px-4">
				<Tooltip.Provider>
					<div class="my-auto mr-auto flex items-center">
						<Tooltip.Root>
							<Tooltip.Trigger class="my-auto">
								{#snippet child()}
									<div class=" flex h-full items-center gap-2">
										<Checkbox
											id="close-last-session"
											bind:checked={lastSession.current.closeLastSession}
										/>
										<Label
											for="close-last-session"
											class="cursor-pointer text-left text-sm leading-none font-medium"
											>Terminate previous session</Label
										>
									</div>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>
									Closes the last session made in Console, if it is still open. This will kill each
									of its agents.
								</p>
								{#if lastSession.current.sessionId !== ''}
									<p>Session id: {lastSession.current.sessionId ?? ''}</p>
								{/if}
							</Tooltip.Content>
						</Tooltip.Root>
					</div>

					<Form.ElementField {form} name="annotations.name" class="flex items-center gap-2 ">
						<Form.Control>
							{#snippet children({ props })}
								<TooltipLabel
									title="Session name"
									tooltip="Utilise annotations to name and describe sessions. In Coral Console, sessions without a name will be identified by their unqiue ID, instead."
									extra={{
										type: 'string'
									}}
								>
									<Input
										bind:value={$formData.annotations.name}
										placeholder="session name"
										onblur={(e: FocusEvent) => {
											const value = (e.target as HTMLInputElement).value;
											if (value === '') {
												delete $formData.annotations.name;
												$formData.annotations = $formData.annotations;
											}
										}}
									/>
								</TooltipLabel>
							{/snippet}
						</Form.Control>
					</Form.ElementField>

					<Button variant="outline" onclick={() => (view = 'workbench')}>Return to editor</Button>

					<span class="flex gap-1">
						<Tooltip.Root delayDuration={30}>
							<Tooltip.Trigger class="flex">
								{#snippet child()}
									<Form.Button disabled={sendingForm || emptySession}>
										{#if sendingForm}
											<Spinner />
										{/if}Create session</Form.Button
									>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>
									{emptySession
										? 'Cannot create a session without any agents'
										: ' Create a session in the active namespace'}
								</p>
							</Tooltip.Content>
						</Tooltip.Root>
					</span>
				</Tooltip.Provider>
			</Card.Content>
		</Card.Root>
	{/if}
</form>
