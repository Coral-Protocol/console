<script lang="ts" module>
	import { Context } from 'runed';
	import type { SuperForm, SuperFormData, SuperFormErrors } from 'sveltekit-superforms/client';
	import type { FormSchema } from './schemas';
	import type z from 'zod';

	export type SessionCreatorContext = {
		payload: CreateSessionRequest | null;
		importSession: (options: { success?: string; from: string }) => boolean;

		selectedAgent: number | null;
		detailedAgent: Awaited<ReturnType<CoralServer['lookupAgent']>> | null;

		form: SuperForm<z.output<FormSchema>>;
		formData: SuperFormData<z.output<FormSchema>>;
		errors: SuperFormErrors<z.output<FormSchema>>;
	};

	export const createSessionContext = new Context<SessionCreatorContext>('sessionCreator');
</script>

<script lang="ts">
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';
	import * as Resizable from '@coral-os/component-library/ui/resizable/index.js';
	import * as Tabs from '@coral-os/component-library/ui/tabs/index.js';
	import * as Menubar from '@coral-os/component-library/ui/menubar/index.js';
	import * as Table from '@coral-os/component-library/ui/table/index.js';
	import * as Form from '@coral-os/component-library/ui/form/index.js';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import * as Tooltip from '@coral-os/component-library/ui/tooltip/index.js';

	import IconWrenchRegular from 'phosphor-icons-svelte/IconWrenchRegular.svelte';
	import IconUsersThreeRegular from 'phosphor-icons-svelte/IconUsersThreeRegular.svelte';
	import IconRobotRegular from 'phosphor-icons-svelte/IconRobotRegular.svelte';
	import IconTrashRegular from 'phosphor-icons-svelte/IconTrashSimpleRegular.svelte';
	import IconCaretDown from 'phosphor-icons-svelte/IconCaretDownRegular.svelte';
	import IconPlusCircle from 'phosphor-icons-svelte/IconPlusCircleRegular.svelte';

	import { Checkbox } from '@coral-os/component-library/ui/checkbox/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';

	import { Spinner } from '@coral-os/component-library/ui/spinner/index.js';
	import { Pip, TwostepButton } from '@coral-os/component-library';

	import SidebarTab from './SidebarTab.svelte';
	import Graph from '$lib/components/AgentGraph.svelte';

	import { superForm, defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';

	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import { toast } from 'svelte-sonner';
	import { PersistedState } from 'runed';

	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { Session } from '$lib/session.svelte';
	import { appContext } from '$lib/context';
	import { CoralServer, type RegistryAgentIdentifier } from '$lib/CoralServer.svelte';

	import { makeFormSchema, type CreateSessionRequest } from './schemas/types';
	import { toPayload } from './schemas';
	import { importFromPayload } from './schemas';
	import AgentPicker from './AgentPicker.svelte';
	import CodePane from './panes/CodePane.svelte';
	import GroupsPane from './panes/GroupsPane.svelte';
	import SessionPane from './panes/SessionPane.svelte';
	import AgentPane from './panes/AgentPane.svelte';
	import TemplateSaver from './TemplateSaver.svelte';
	import { getSessionDataFromTemplateName } from './templates/TemplateLib';
	import TemplatePicker from './TemplatePicker.svelte';

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

	const addAgent = async (name: string, source: any, version: string) => {
		try {
			const existingCount = $formData.agents.filter((a) => a.id.name === name).length;
			const registrySourceId = sourceToRegistryId(source as AgentSource);
			const detailed = await ctx.server
				.lookupAgent({ name, version, registrySourceId })
				.catch((e) => {
					toast.error(`${e}`);
					console.error(e);
					return null;
				});
			if (detailed) {
				try {
					$formData.agents.push({
						id: {
							name,
							version,
							registrySourceId
						},
						name: name + (existingCount > 0 ? `-${existingCount}` : ''),
						description: '',
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
				} catch (error) {
					console.error('Failed to add agent:', error);
				}
			}
		} catch (error) {
			console.error('Failed to lookup agent:', error);
		}
	};

	const AGENT_REGEX = /^(marketplace|linked|local):(.+?)@(\d+\.\d+\.\d+)$/;

	type AgentSource = 'marketplace' | 'linked' | 'local';
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
					await addAgent(agent.name, agent.source, agent.version);
				}
			} catch (err) {
				console.error('Failed to parse agents:', err);
			}
		}
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
	});
	interface ParsedAgent {
		source: AgentSource;
		name: string;
		version: string;
		raw: string;
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
		// svelte-ignore state_referenced_locally
		validators: zod4(formSchema),
		validationMethod: 'onblur',
		resetForm: false,

		async onUpdate({ form: f }) {
			console.log('[onUpdate]', {
				form: f
			});

			if (!f.valid) {
				toast.error('Please fix all errors in the form.');
				console.error({ errors: f.errors });
				return;
			}
			try {
				sendingForm = true;
				const body = await toPayload(ctx.server, $formData);
				const res = await ctx.server.api.POST('/api/v1/local/session', {
					body
				});
				sendingForm = false;

				if (res.error) {
					// todo @alan there should probably be an api class where we can generic-ify the handling of this error
					// with a proper type implementation too..!
					let error: { message?: string; stackTrace?: string[] } = res.error;
					console.error(error.stackTrace);

					toast.error(`Failed to create session: ${error.message}`, { duration: Infinity });
					return;
				}
				if (res.data) {
					ctx.session = new Session({
						sessionId: res.data.sessionId,
						namespace: ctx.server.namespace,
						server: ctx.server
					});
				} else {
					sendingForm = false;
					throw new Error('no data received');
				}
			} catch (e) {
				console.log(e);
				toast.error(`Failed to create session: ${e}`, { duration: Infinity });
				sendingForm = false;
			}
		}
	});

	// This is a workaround for not being able to call superForm in a $derived
	$effect(() => {
		form.options.validators = zod4(formSchema);
	});

	let { form: formData, errors, enhance } = $derived(form);

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

	$effect(() => {
		if (curAgent) {
			getDetailed(curAgent.id).then((d) => {
				sessCtx.detailedAgent = d;
			});
		}
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

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link>Workbench</Breadcrumb.Link>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>
<form
	method="POST"
	use:enhance
	class="flex h-full flex-col overflow-hidden"
	enctype="multipart/form-data"
>
	<Resizable.PaneGroup
		direction={isMobile.current ? 'vertical' : 'horizontal'}
		class="min-h-0 flex-1 flex-row-reverse overflow-hidden"
	>
		<Resizable.Pane defaultSize={75} minSize={25}>
			<Resizable.PaneGroup direction="vertical">
				<Resizable.Pane minSize={25} defaultSize={50}>
					<Resizable.PaneGroup direction="horizontal" class="min-h-0 flex-1 overflow-hidden">
						<Resizable.Pane
							class="relative flex min-h-0 flex-col overflow-hidden"
							minSize={25}
							defaultSize={50}
						>
							<Menubar.Root class="bg-sidebar border-0 border-b">
								<Menubar.Menu>
									<Menubar.Trigger class="gap-2">Session <IconCaretDown /></Menubar.Trigger>
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
									<Menubar.Trigger class="gap-2">View <IconCaretDown /></Menubar.Trigger>
									<Menubar.Content>
										<Menubar.CheckboxItem bind:checked={settings.current.enableAgentGraphView}
											>Always Switch to Graph</Menubar.CheckboxItem
										>
										<Menubar.Separator />
										<Menubar.Sub>
											<Menubar.SubTrigger disabled class="opacity-50">Columns</Menubar.SubTrigger>
											<Menubar.SubContent>
												<Menubar.CheckboxItem>Agent Name</Menubar.CheckboxItem>
												<Menubar.CheckboxItem>Version</Menubar.CheckboxItem>
												<Menubar.CheckboxItem>Source</Menubar.CheckboxItem>
												<Menubar.CheckboxItem>Agent</Menubar.CheckboxItem>
											</Menubar.SubContent>
										</Menubar.Sub>
									</Menubar.Content>
								</Menubar.Menu>
								<Menubar.Menu>
									<Menubar.Trigger class="gap-2">Templates <IconCaretDown /></Menubar.Trigger>
									<Menubar.Content>
										<TemplatePicker
											server={ctx.server}
											onSelect={(agent, catalogId) => {
												addAgent(agent.name, catalogId.type, agent.versions[0]!);
											}}
										/>
									</Menubar.Content>
								</Menubar.Menu>
								<Menubar.Menu>
									<Menubar.Trigger class="relative ml-auto gap-2">
										<IconPlusCircle class="size-5" />
										Add agents
									</Menubar.Trigger>
									<Menubar.Content>
										<AgentPicker
											server={ctx.server}
											onSelect={(agent, catalogId) => {
												addAgent(agent.name, catalogId.type, agent.versions[0]!);
											}}
										/>
									</Menubar.Content>
								</Menubar.Menu>
							</Menubar.Root>
							<Tabs.Root bind:value={agentsListTabs} class="min-h-0 flex-1 overflow-hidden">
								<Tabs.Content value="table" class="flex min-h-0 flex-1 overflow-hidden ">
									<Table.Root class="w-full">
										<Table.Header>
											<Table.Row>
												<Table.Head class="w-12"><Checkbox /></Table.Head>
												<Table.Head>Name</Table.Head>
												<Table.Head>Version</Table.Head>
												<Table.Head>Source</Table.Head>
												<Table.Head>Agent</Table.Head>
												<Table.Head class="w-24"></Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
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
														<TwostepButton
															disabled={sessCtx.selectedAgent === null}
															class="m-auto"
															variant="ghost"
															onclick={() => removeAgent(i)}
															><span class="sr-only">remove agent</span><IconTrashRegular
															></IconTrashRegular></TwostepButton
														>
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</Tabs.Content>
								<Tabs.Content value="graph" class="flex min-h-0 flex-1 overflow-hidden ">
									{#if $formData.agents.length !== 0}
										<Graph
											agents={$formData.agents}
											groups={$formData.groups}
											bind:selectedAgent={sessCtx.selectedAgent}
										/>
									{:else}
										<p>
											No agents added yet. Use the "Add agents" menu to add agents to your session.
										</p>
									{/if}
								</Tabs.Content>
							</Tabs.Root>
						</Resizable.Pane>
					</Resizable.PaneGroup>
				</Resizable.Pane>
				<Resizable.Handle withHandle />
				<Resizable.Pane
					class=" flex h-full min-h-0 flex-col !overflow-y-scroll"
					minSize={25}
					defaultSize={50}
				>
					<CodePane />
					<footer class="bg-sidebar flex justify-end gap-2 border-t p-4">
						{#if sendingForm || !$formData.agents.length}
							<Tooltip.Provider>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Form.Button disabled={sendingForm || $formData.agents.length === 0}>
											{#if sendingForm}
												<Spinner />
											{/if}Run</Form.Button
										>
										<Button disabled={sendingForm || $formData.agents.length === 0}
											>Save template</Button
										>
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p>You need to add at least one agent first!</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						{:else}
							<Form.Button
								disabled={sendingForm || $formData.agents.length === 0}
								class={sendingForm ? '' : 'bg-accent/80'}
							>
								{#if sendingForm}
									<Spinner />
								{/if}Run</Form.Button
							>
							<Button
								onclick={() => ((templateSaverDialogOpen = true), console.log('aa'))}
								disabled={sendingForm || $formData.agents.length === 0}
								class={sendingForm ? '' : 'bg-accent/80'}>Save template</Button
							>
						{/if}
					</footer>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>
		<Resizable.Handle withHandle />
		<Resizable.Pane defaultSize={50} minSize={25} class="bg-background flex min-h-0 flex-col gap-4">
			<Tabs.Root bind:value={currentTab} class="w-full grow overflow-hidden">
				<Tabs.List class="bg-sidebar flex w-full rounded-none border-b *:rounded-none">
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
						value="session"
						icon={IconWrenchRegular}
						invalid={Object.values($errors?.sessionRuntimeSettings ?? {}).length > 0}
						>Session</SidebarTab
					>
				</Tabs.List>
				{#key sessCtx.selectedAgent}
					<Tabs.Content value="agent" class="flex min-h-0 flex-col gap-2 overflow-y-scroll ">
						<AgentPane />
					</Tabs.Content>
				{/key}
				<Tabs.Content value="session" class="flex flex-col gap-4 ">
					<SessionPane />
				</Tabs.Content>
				<Tabs.Content value="groups" class="flex flex-col">
					<GroupsPane />
				</Tabs.Content>
			</Tabs.Root>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</form>
