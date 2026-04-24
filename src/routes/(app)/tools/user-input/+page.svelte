<script lang="ts">
	import * as Card from '@coral-os/component-library/ui/card/index.js';
	import * as Breadcrumb from '@coral-os/component-library/ui/breadcrumb/index.js';
	import * as Sidebar from '@coral-os/component-library/ui/sidebar/index.js';

	import IconRobot from 'phosphor-svelte/lib/RobotIcon';
	import { Input } from '@coral-os/component-library/ui/input/index.js';
	import { Separator } from '@coral-os/component-library/ui/separator/index.js';

	import { socketCtx } from '$lib/socket.svelte';
	import { Button } from '@coral-os/component-library/ui/button/index.js';
	import { Badge } from '@coral-os/component-library/ui/badge/index.js';

	let searchTerm = $state('');

	interface Request {
		id: string;
		agentId: string;
		agentRequest: string;
		userQuestion?: string;
		agentAnswer?: string;
		timestamp: string | number | Date;
		sessionId?: string;
	}

	interface AgentSummary {
		agentId: string;
		latestRequest: Request;
		latestTimestamp: string | number | Date;
		totalMessages: number;
	}

	interface AgentGroups {
		[agentId: string]: Request[];
	}

	let ctx = socketCtx.get();
	let userResponse: Record<string, string> = $state({});
	let selectedAgentId: string | null = $state(null);
	let requests = $derived(Object.values(ctx.userInput.requests ?? {}) as Request[]);

	let agentGroups = $derived.by(() => {
		const groups: AgentGroups = {};

		for (const request of requests) {
			if (!Array.isArray(groups[request.agentId])) {
				groups[request.agentId] = [];
			}
			groups[request.agentId]!.push(request);
		}

		for (const agentId in groups) {
			if (groups[agentId]) {
				groups[agentId].sort((a: Request, b: Request) => {
					const timeA = new Date(a.timestamp || 0).getTime();
					const timeB = new Date(b.timestamp || 0).getTime();
					return timeA - timeB;
				});
			}
		}

		return groups;
	});

	let agentList = $derived.by(() => {
		const entries = Object.entries(agentGroups);
		const mapped = entries.map(([agentId, agentRequests]: [string, Request[]]) => {
			const latestRequest = agentRequests[agentRequests.length - 1];
			if (!latestRequest) {
				return null;
			}

			const summary: AgentSummary = {
				agentId,
				latestRequest: latestRequest,
				latestTimestamp: latestRequest.timestamp,
				totalMessages: agentRequests.length
			};
			return summary;
		});

		const filtered = mapped.filter((agent): agent is AgentSummary => agent !== null);

		return filtered.sort((a: AgentSummary, b: AgentSummary) => {
			const timeA = new Date(a.latestTimestamp).getTime();
			const timeB = new Date(b.latestTimestamp).getTime();
			return timeB - timeA;
		});
	});

	let selectedAgentMessages = $derived.by(() => {
		if (!selectedAgentId || !agentGroups[selectedAgentId]) {
			return [] as Request[];
		}
		return (agentGroups[selectedAgentId]?.slice() as Request[]) ?? [];
	});

	let currentPendingRequest = $derived.by(() => {
		return selectedAgentMessages.findLast(
			(req: Request) =>
				req.userQuestion === undefined &&
				selectedAgentMessages.indexOf(req) === selectedAgentMessages.length - 1
		);
	});

	$effect(() => {
		for (const request of requests) {
			if (request.userQuestion !== undefined) {
				userResponse[request.id] = request.userQuestion;
			}
		}
	});

	// this is a bit awful but it works and is simple enough for now, it colours the agent icon bg based off their ID
	function stringToColor(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		let color = (hash >>> 0).toString(16);
		return '#' + color.padStart(6, '0').slice(0, 6);
	}

	// formats timestamp to a readable time, i want to use date-fns in the future tho
	function formatTimestamp(timestamp: string | number | Date): string {
		try {
			return new Date(timestamp).toLocaleTimeString();
		} catch {
			return '';
		}
	}

	function sendResponse(): void {
		if (!currentPendingRequest) return;

		const response = userResponse[currentPendingRequest.id];
		if (response) {
			ctx.userInput.respond(currentPendingRequest.id, response);
			userResponse[currentPendingRequest.id] = '';
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			sendResponse();
		}
	}
</script>

<header class="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4">
	<Sidebar.Trigger class="-ml-1" />
	<Separator orientation="vertical" class="mr-2 h-4" />
	<Breadcrumb.Root class="flex-grow">
		<Breadcrumb.List>
			<Breadcrumb.Item class="hidden md:block">
				<Breadcrumb.Link>Tools</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator class="hidden md:block" />
			<Breadcrumb.Item>
				<Breadcrumb.Page>User Input Tool</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>
</header>

<section class="grid h-full grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
	<section class="flex h-full w-full flex-col gap-4">
		<nav class="flex w-full flex-col gap-2">
			<h1 class="text-lg font-medium">{agentList.length} Agents</h1>
			<section class="flex w-full gap-2">
				<Input placeholder="Filter agents" class="grow" bind:value={searchTerm} />
			</section>
		</nav>

		{#if agentList.length === 0}
			<p class="text-muted-foreground col-span-full text-center text-sm">
				No agents have requested user input.
			</p>
		{:else}
			{#each agentList.filter((agent) => agent.agentId
					.toLowerCase()
					.includes(searchTerm.toLowerCase())) as agent (agent.agentId)}
				<Card.Root
					class="hover:bg-muted cursor-pointer transition-colors {selectedAgentId === agent.agentId
						? 'bg-muted'
						: ''}"
					onclick={() => (selectedAgentId = agent.agentId)}
					role="button"
					tabindex={0}
				>
					<Card.Content class="flex w-full flex-col gap-2 ">
						<div class="flex w-full items-center gap-2">
							<div
								class="flex h-12 min-w-12 items-center justify-center rounded-md"
								style="background-color: {stringToColor(agent.agentId)}"
							>
								<IconRobot class="size-6 text-white" />
							</div>
							<section class="flex w-full min-w-0 flex-col gap-1">
								<span class="flex w-full items-center">
									<span class="grow truncate font-medium">{agent.agentId}</span>
									{#if agent.latestRequest.userQuestion === undefined}
										<Badge>waiting for response</Badge>
									{/if}
								</span>
								<div class="flex items-center justify-between">
									<p class="text-muted-foreground flex-1 truncate text-sm">
										{agent.latestRequest.agentRequest}
									</p>
									<span class="text-muted-foreground ml-2 text-xs">
										{formatTimestamp(agent.latestTimestamp)}
									</span>
								</div>
							</section>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</section>

	<section class="relative col-span-3 min-h-0 w-full">
		{#if selectedAgentId}
			<Card.Root class="absolute top-0 right-0 left-0 flex h-full flex-col overflow-hidden">
				<Card.Header class="flex-shrink-0">
					<Card.Title class="flex w-full items-center gap-2">
						<div
							class="flex h-12 min-w-12 items-center justify-center rounded-md"
							style="background-color: {stringToColor(selectedAgentId)}"
						>
							<IconRobot class="size-6 text-white" />
						</div>
						<span class="grow">{selectedAgentId}</span>
						<span class="text-muted-foreground text-sm">
							{selectedAgentMessages?.length ?? '0'} messages
						</span>
					</Card.Title>
				</Card.Header>

				<Separator />

				<Card.Content class="flex-1 overflow-y-auto">
					<ol class="flex flex-col gap-4 p-4">
						{#each selectedAgentMessages as request, i (request.id)}
							<li
								class="border-card flex h-min flex-col gap-2 rounded-e-md border-l-2 transition-colors {request.id ===
								currentPendingRequest?.id
									? 'bg-muted border-muted-foreground '
									: 'hover:bg-secondary rounded-s-md '}"
							>
								<button
									onclick={() => (currentPendingRequest = request)}
									class="flex flex-col gap-2 p-4 {i !== selectedAgentMessages.length - 1 &&
									!request.userQuestion
										? 'opacity-50'
										: ''} "
								>
									<div class="flex gap-4">
										<div
											class="flex h-8 min-w-8 items-center justify-center rounded-md"
											style="background-color: {stringToColor(request.agentId)}"
										>
											<IconRobot class="size-4 text-white" />
										</div>
										<div
											class="bg-input min-h-8 max-w-[50%] rounded-md p-2 text-start wrap-break-word"
										>
											<p class="text-sm select-text">{request.agentRequest}</p>
											<span class="text-muted-foreground text-xs">
												{formatTimestamp(request.timestamp)}
											</span>
										</div>
									</div>

									<!-- User Response (if exists) -->

									{#if request.userQuestion}
										<div class="flex items-start justify-end gap-4">
											<div
												class="bg-input text-primary-foreground min-h-8 max-w-[50%] rounded-md p-2 text-left wrap-break-word"
											>
												<p class="text-sm select-text">{request.userQuestion}</p>
											</div>
											<div
												class="bg-input flex h-9 min-w-9 items-center justify-center rounded-full"
											>
												<span class="text-xs">You</span>
											</div>
										</div>
									{/if}

									{#if request.agentAnswer}
										<div class="flex gap-4">
											<div
												class="flex h-8 min-w-8 items-center justify-center rounded-md"
												style="background-color: {stringToColor(request.agentId)}"
											>
												<IconRobot class="size-4 text-white" />
											</div>
											<div class="bg-input min-h-8 max-w-[70%] rounded-md p-2">
												<p class="text-sm">{request.agentAnswer}</p>
											</div>
										</div>
									{/if}
								</button>

								{#if currentPendingRequest && request.id === currentPendingRequest.id && !request.userQuestion && i === selectedAgentMessages.length - 1}
									<div class="flex flex-shrink-0 gap-2 p-4">
										<Input
											bind:value={userResponse[currentPendingRequest.id]}
											placeholder="Enter your reply..."
											class="w-full grow"
											onkeydown={handleKeydown}
										/>
										<Button onclick={sendResponse}>Send</Button>
									</div>
								{:else if currentPendingRequest && request.id === currentPendingRequest.id && !request.userQuestion}
									<div class="flex flex-shrink-0 gap-2 p-4">
										<Input
											bind:value={userResponse[currentPendingRequest.id]}
											placeholder="This request is no longer active or has timed out"
											class="w-full grow"
											onkeydown={handleKeydown}
											disabled
										/>
										<Button disabled>Send</Button>
									</div>
								{/if}
							</li>
							<Separator class="w-1/2" />
						{/each}
					</ol>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="flex h-full items-center justify-center">
				<Card.Content>
					<div class="text-muted-foreground text-center">
						<IconRobot class="mx-auto mb-4 h-12 w-12" />
						<p>Select an agent to view the conversation</p>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</section>
</section>
