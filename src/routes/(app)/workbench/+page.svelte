<script lang="ts" module>
	import { Context } from 'runed';
	import type { SuperForm, SuperFormData, SuperFormErrors } from 'sveltekit-superforms/client';
	import type { FormSchema } from './schemas';
	import type z from 'zod';

	// FIXME: why is this hardcoded
	export type AgentSource = 'marketplace' | 'linked' | 'local';

	export type SessionCreatorContext = {
		payload: CreateSessionRequest | null;
		importSession: (options: { success?: string; from: string }) => boolean;
		addAgent: (name: string, source: AgentSource, version: string) => Promise<void>;

		selectedAgent: number | null;
		detailedAgent: Awaited<ReturnType<CoralServer['lookupAgent']>> | null;

		form: SuperForm<z.output<FormSchema>>;
		formData: SuperFormData<z.output<FormSchema>>;
		errors: SuperFormErrors<z.output<FormSchema>>;
	};

	export const createSessionContext = new Context<SessionCreatorContext>('sessionCreator');
</script>

<script lang="ts">
	import Header from '$lib/components/header.svelte';

	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Table from '@coral-os/component-library/ui/table/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import * as Popover from '@coral-os/component-library/ui/popover/index.js';
	import { Button, buttonVariants } from '@coral-os/component-library/ui/button/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';
	import * as DropdownMenu from '@coral-os/component-library/ui/dropdown-menu/index.js';

	import * as Card from '@coral-os/component-library/ui/card/index.js';

	import IconWrenchRegular from 'phosphor-icons-svelte/IconWrenchRegular.svelte';
	import IconUsersThreeRegular from 'phosphor-icons-svelte/IconUsersThreeRegular.svelte';
	import IconRobotRegular from '$lib/icons/robot.svelte';
	import IconCaretDown from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';
	import IconTrashRegular from 'phosphor-icons-svelte/IconTrashRegular.svelte';
	import IconStorefront from 'phosphor-icons-svelte/IconStorefrontRegular.svelte';

	import { Checkbox } from '@coral-os/component-library/ui/checkbox/index.js';
	import { Label } from '@coral-os/component-library/ui/label/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';

	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';
	import { Pip, TwostepButton } from '@coral-os/component-library';

	import SidebarTab from './SidebarTab.svelte';
	import Graph from '$lib/components/AgentGraph.svelte';

	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';

	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';

	import { toast } from 'svelte-sonner';
	import { PersistedState } from 'runed';

	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { Session } from '$lib/session.svelte';
	import { appContext } from '$lib/context';
	import { CoralServer, agentIdOf, type RegistryAgentIdentifier } from '$lib/CoralServer.svelte';

	import { makeFormSchema, type CreateSessionRequest } from './schemas/types';
	import { toPayload } from './schemas';
	import { importFromPayload } from './schemas';
	import AgentPicker from './AgentPicker.svelte';
	import TemplatePicker from './TemplatePicker.svelte';
	import CodePane from './panes/CodePane.svelte';
	import ToolsPane from './panes/ToolsPane.svelte';
	import GroupsPane from './panes/GroupsPane.svelte';
	import SessionPane from './panes/SessionPane.svelte';
	import AgentPane from './panes/AgentPane.svelte';
	import TemplateSaver from './TemplateSaver.svelte';
	import { getSessionDataFromTemplateName } from './templates/TemplateLib';
	import { tourTarget } from '$lib/components/tour/tourTarget';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { cn } from '$lib/utils';
	import MarketPane from './panes/MarketPane.svelte';
	import { Skeleton } from '@coral-os/component-library/components/ui/skeleton/index.js';

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

	const AGENT_REGEX = /^(marketplace|linked|local):(.+?)@(\d+\.\d+\.\d+)$/;

	let parsedAgents: ParsedAgent[] = [];

	onMount(async () => {
		const agentsQuery = page.url.searchParams.get('agents');
		const template = page.url.searchParams.get('template');
		if (agentsQuery) {
			toast('Parsing agents from URL...', { duration: 2000 });
			try {
				const result = parseAgentsQuery(agentsQuery);
				parsedAgents = result.agents;

				for (const agent of parsedAgents) {
					console.log(
						'following url instructions to add agent: ' +
							agent.name +
							'@' +
							agent.version +
							' from ' +
							agent.source +
							' '
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
	});
	interface ParsedAgent {
		source: AgentSource;
		name: string;
		version: string;
		raw: string;
	}

	const loadTemplate = (template: string) => {
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
	};

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

	let lastDeletedAgent: {
		agent: any;
		index: number;
	} | null = $state(null);

	const removeAgent = (index: number) => {
		if (index < 0 || index >= $formData.agents.length) return;

		const agent = $formData.agents[index];

		lastDeletedAgent = {
			agent,
			index
		};

		$formData.agents.splice(index, 1);
		$formData.agents = $formData.agents;

		// Maintain selection invariants
		if (sessCtx.selectedAgent !== null) {
			if (sessCtx.selectedAgent === index) {
				sessCtx.selectedAgent = 0;
			} else if (sessCtx.selectedAgent > index) {
				sessCtx.selectedAgent--;
			}
		}

		toast(`Agent "${lastDeletedAgent.agent.name}" deleted`, {
			action: {
				label: 'Undo',
				onClick: restoreAgent
			}
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

	let ctx = appContext.get();

	let formSchema = $derived(makeFormSchema(ctx.server));

	let currentTab = $state('agent');

	let sendingForm = $state(false);

	let templateSaverDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	let form = superForm(defaults(zod4(formSchema)), {
		SPA: true,
		dataType: 'json',
		validators: zod4(formSchema),
		validationMethod: 'onblur',
		resetForm: false,
		async onUpdate({ form: f }) {
			// console.log('[onUpdate]', {
			// 	form: f
			// });

			// console.trace('SUPERFORM onUpdate fired');

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
						.catch((e) => {
							console.error('Failed to close last session:', e);
						});
				}

				const body = await toPayload(ctx.server, $formData);
				const res = await ctx.server.api.POST('/api/v1/local/session', {
					body
				});

				if (res.error) {
					// todo @alan there should probably be an api class where we can generic-ify the handling of this error
					// with a proper type implementation too..!
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
			}
			sendingForm = false;
		}
	});

	// This is a workaround for not being able to call superForm in a $derived
	$effect(() => {
		form.options.validators = zod4(formSchema);
	});

	let { form: formData, errors, enhance } = $derived(form);

	let loadingAgent = $state(false);

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
			loadingAgent = true;

			const existingCount = $formData.agents.filter((a) => a.id.name === name).length;
			const registrySourceId = sourceToRegistryId(source as AgentSource);

			const detailed = await ctx.server.lookupAgent({
				name,
				version,
				registrySourceId
			});

			if (!detailed) {
				throw new Error('Agent not found');
			}

			$formData.agents.push({
				id: {
					name,
					version,
					registrySourceId
				},
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
				options: {}
			});

			sessCtx.detailedAgent = null;
			$formData.agents = $formData.agents;
			sessCtx.selectedAgent = $formData.agents.length - 1;
			loadingAgent = false;
		}
	}) as SessionCreatorContext;

	createSessionContext.set(sessCtx);

	$effect(() => {
		toPayload(ctx.server, $formData)
			.then((val) => {
				sessCtx.payload = val;
			})
			.catch(console.error);
	});
	$effect(() => {
		sessCtx.formData = formData;
		sessCtx.errors = errors;
		sessCtx.form = form;
	});

	let curAgent = $derived(
		sessCtx.selectedAgent !== null ? $formData.agents[sessCtx.selectedAgent] : undefined
	);

	let curAgentId = $derived(curAgent ? agentIdOf(curAgent.id) : null);
	$effect(() => {
		const id = curAgentId;
		let active = true;
		if (id) {
			untrack(() => {
				sessCtx.detailedAgent = null;
				getDetailed(curAgent!.id).then((d) => {
					if (active) {
						sessCtx.detailedAgent = d;
					}
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

	const isMobile = new IsMobile();

	let agentsListTabs: string = $state('table');

	$effect(() => {
		if ($formData.agents.length > 0) {
			if (currentTab === 'groups' && settings.current.enableAgentGraphView) {
				agentsListTabs = 'graph';
			} else {
				agentsListTabs = 'table';
			}
		}
	});

	type Settings = {
		enableAgentGraphView: boolean;
		columns: {
			name: boolean;
			version: boolean;
			registrySource: boolean;
			agent: boolean;
		};
	};

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

	function clearSession() {
		$formData = {
			groups: [],
			tools: {},
			sessionRuntimeSettings: {
				ttl: 50000
			},
			agents: []
		};
		sessCtx.selectedAgent = null;
	}
</script>

{#if sessCtx.payload}
	<TemplateSaver bind:open={templateSaverDialogOpen} data={JSON.stringify(sessCtx.payload)} />
{/if}

<Header />

<form
	method="POST"
	use:enhance
	class="flex h-full flex-col overflow-hidden"
	enctype="multipart/form-data"
	autocomplete="off"
>
	<Resizable.PaneGroup
		direction={isMobile.current ? 'vertical' : 'horizontal'}
		class="min-h-0 flex-1 flex-row-reverse overflow-hidden p-2 pt-0"
	>
		<Resizable.Pane defaultSize={75} minSize={25}>
			<Resizable.PaneGroup direction="vertical">
				<Resizable.Pane minSize={25} defaultSize={50}>
					<Card.Root class="h-full py-0">
						<Card.Content class="flex h-full flex-col px-0">
							<Menubar.Root class="bg-sidebar w-full border-0 border-b">
								<Menubar.Menu>
									<Menubar.Trigger class="gap-1">Session</Menubar.Trigger>
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
										<TemplatePicker
											server={ctx.server}
											onSelect={(template) => {
												loadTemplate(template);
											}}
										/>
									</Menubar.Content>
								</Menubar.Menu>
								<Menubar.Menu>
									<div use:tourTarget={'add-agents'} class="ml-auto">
										<Menubar.Trigger
											class={cn(
												buttonVariants({ size: 'sm' }),
												'relative h-full gap-2 transition-all',
												$formData.agents.length == 0 ? 'bg-sidebar' : ''
											)}
										>
											<IconPlusCircle class="size-5" />
											Add agents
										</Menubar.Trigger>
									</div>
									<Menubar.Content>
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
									</Menubar.Content>
								</Menubar.Menu>
							</Menubar.Root>

							seek and destory missing snippets...

							<Tabs.Root
								bind:value={agentsListTabs}
								class="h-full min-h-0 flex-1 grow overflow-hidden"
							>
								<Tabs.Content
									value="table"
									class="relative flex h-full min-h-0 flex-1 grow flex-col overflow-hidden "
								>
									<Table.Root class="w-full grow border-amber-100/50 text-sm ">
										<Table.Header>
											<Table.Row>
												<Table.Head class="w-12"><Checkbox /></Table.Head>
												<Table.Head>Name</Table.Head>
												<Table.Head>Version</Table.Head>
												<Table.Head>Registry source</Table.Head>
												<Table.Head>Agent</Table.Head>
												<Table.Head class="w-24">Actions</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#if $formData.agents.length == 0}
												{#each { length: 10 }, i}
													<Table.Row
														style={`opacity: ${1 - i * 0.1}; border-color: color-mix(in oklab, var(--color-border) ${100 - i * 10}%, transparent);`}
													>
														<Table.Cell>
															<Checkbox disabled class="cursor-default!" />
														</Table.Cell>
														{#each { length: 5 }}
															<Table.Cell>
																<Skeleton class="h-6 w-18 animate-none!" />
															</Table.Cell>
														{/each}
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
															<p class="truncate">{agent.id.version}</p>
														</Table.Cell>

														<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
															<p class="truncate">{agent.id.registrySourceId.type}</p>
														</Table.Cell>

														<Table.Cell onclick={() => (sessCtx.selectedAgent = i)}>
															<p class="truncate">{agent.id.name}</p>
														</Table.Cell>

														<Table.Cell class="flex gap-2">
															<Tooltip.Provider>
																<Tooltip.Root>
																	<Tooltip.Trigger>
																		<TwostepButton
																			disabled={sessCtx.selectedAgent === null}
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
										</Table.Body>
									</Table.Root>
								</Tabs.Content>
								<Tabs.Content value="graph" class="flex min-h-0 flex-1 overflow-hidden ">
									<Graph
										agents={$formData.agents}
										groups={$formData.groups}
										bind:selectedAgent={sessCtx.selectedAgent}
									/>
								</Tabs.Content>
							</Tabs.Root>
						</Card.Content>
					</Card.Root>
				</Resizable.Pane>
				<Resizable.Handle class="bg-background !h-2" />
				<Resizable.Pane minSize={25} defaultSize={50}>
					<Card.Root class=" h-full py-0">
						<Card.Content class="flex h-full min-h-0 flex-col px-0">
							<Tabs.Root value="editor" class="grow gap-0 overflow-hidden">
								<Tabs.List class="bg-sidebar flex w-full justify-start rounded-none border-b ">
									<Tabs.Trigger value="editor" class="grow-0">Session editor</Tabs.Trigger>
									<Tabs.Trigger value="session" class="grow-0">Session options</Tabs.Trigger>
								</Tabs.List>
								<Tabs.Content value="editor" class="relative overflow-hidden">
									<CodePane />
								</Tabs.Content>
								<Tabs.Content value="session" class="relative overflow-hidden">
									<SessionPane />
								</Tabs.Content>
							</Tabs.Root>
						</Card.Content>
					</Card.Root>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>
		<Resizable.Handle class="bg-background !w-2" />

		<Resizable.Pane defaultSize={50} minSize={25} class="bg-background flex min-h-0 flex-col gap-2">
			<Card.Root class="min-h-0 grow py-0">
				<Card.Content class="min-h-0 grow px-0">
					<Tabs.Root bind:value={currentTab} class="h-full overflow-hidden">
						<Tabs.List class="bg-sidebar flex w-full justify-start rounded-none border-b ">
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
						</Tabs.List>
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
						<Tabs.Content value="marketplace" class="flex h-full min-h-0 flex-col overflow-y-auto">
							<MarketPane />
						</Tabs.Content>
					</Tabs.Root>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content class="items-right flex gap-4">
					<Tooltip.Provider>
						<div class="my-auto mr-auto flex items-center">
							<Tooltip.Root>
								<Tooltip.Trigger class="my-auto">
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

						<Tooltip.Root>
							<Tooltip.Trigger class="flex gap-2">
								<Button
									onclick={() => (templateSaverDialogOpen = true)}
									disabled={sendingForm || $formData.agents.length === 0}
									class={sendingForm ? '' : 'bg-accent/80'}>Save template</Button
								>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Save to templates for quick reuse</p>
							</Tooltip.Content>
						</Tooltip.Root>

						<span class="flex gap-1">
							<Tooltip.Root delayDuration={30}>
								<Tooltip.Trigger class="flex">
									<Form.Button disabled={sendingForm || $formData.agents.length === 0}>
										{#if sendingForm}
											<Spinner />
										{/if}Create session</Form.Button
									>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>
										{$formData.agents.length === 0
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
</form>
