<script lang="ts">
	// import * as Dialog from '$lib/components/ui/dialog/index.js';
	// import * as Tabs from '$lib/components/ui/tabs/index.js';
	//
	// import Arrow from 'phosphor-icons-svelte/IconArrowRightRegular.svelte';
	// import Chat from 'phosphor-icons-svelte/IconChatRegular.svelte';
	// import TextIndent from 'phosphor-icons-svelte/IconTextIndentRegular.svelte';
	// import GlobeSimple from 'phosphor-icons-svelte/IconGlobeSimpleRegular.svelte';
	// import CodeBlock from '$lib/components/code-block.svelte';
	// import Funnel from 'phosphor-icons-svelte/IconFunnelRegular.svelte';
	//
	// import { type paths, type components } from '../../../generated/api';
	// import type { Session } from '$lib/session.svelte';
	// import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	// import { Button } from '$lib/components/ui/button/index.js';
	// import Separator from '../ui/separator/separator.svelte';
	// import Telemetry from '$lib/components/telemetry-message.svelte';
	// import { Code, MessagesSquare } from '@lucide/svelte';
	// import { ScrollArea } from '../ui/scroll-area';
	// import * as Card from '../ui/card';
	// import * as Accordion from '../ui/accordion';
	// import { appContext } from '$lib/context';
	//
	// const filter = $state({
	// 	user: true,
	// 	assistant: true,
	// 	tool: true,
	// 	generic_assistant: true,
	// 	generic_user: true,
	// 	developer: true
	// });
	//
	// let ctx = appContext.get();
	//
	// let showActivityBar = $state(true);
	// let showPanel = $state(false);
	//
	// let {
	// 	open = $bindable(false),
	// 	session,
	// 	messageId,
	// 	threadId
	// }: {
	// 	open: boolean;
	// 	session: Session;
	// 	messageId: string;
	// 	threadId: string;
	// } = $props();
	//
	// // promise unresolved whilst waiting for data and resolved as undefined if there is no data (no telemetry data for the message,
	// // which will happen if it is currently being sent or the agent does not support telemetry (this is the majority of agents currently))
	// let dataPromise = $derived.by(async () => {
	// 	return (
	// 		await ctx.server.api.GET('/api/v1/telemetry/{sessionId}/{threadId}/{messageId}', {
	// 			params: {
	// 				path: {
	// 					messageId,
	// 					sessionId: session.sessionId,
	// 					threadId
	// 				}
	// 			}
	// 		})
	// 	).data;
	// });
</script>

<!---->
<!-- {#await dataPromise} -->
<!-- 	<p>waiting data!</p> -->
<!-- {:then data} -->
<!-- 	{#if data} -->
<!-- 		<Dialog.Root bind:open> -->
<!-- 			<Dialog.Content -->
<!-- 				class="mx-auto flex h-[80%] max-h-[80%] w-full max-w-2xl min-w-[80%] flex-col overflow-hidden" -->
<!-- 			> -->
<!-- 				<Tabs.Root value="messages" class="flex h-full flex-col gap-4"> -->
<!-- 					<Dialog.Header class="flex flex-col gap-4"> -->
<!-- 						<Dialog.Title class="h-fit font-[400]">Full Telemetry Data</Dialog.Title> -->
<!-- 						<span class="text-muted-foreground text-sm">{data.modelDescription} - {threadId}</span> -->
<!-- 						<Tabs.List > -->
<!-- 							<Tabs.Trigger value="messages"><Chat /> Message Events</Tabs.Trigger> -->
<!-- 							<Tabs.Trigger value="details"><TextIndent /> Thread Details</Tabs.Trigger> -->
<!-- 							<Tabs.Trigger value="hyperparameters"><GlobeSimple /> Hyperparameters</Tabs.Trigger> -->
<!-- 						</Tabs.List> -->
<!-- 					</Dialog.Header> -->
<!-- 					<ScrollArea class="min-h-0 flex-1 rounded-md pb-0"> -->
<!-- 						<Tabs.Content value="messages" class="h-full"> -->
<!-- 							<section -->
<!-- 								class="bg-background absolute top-0 right-0 left-0 z-10 flex items-center gap-4 pb-4" -->
<!-- 							> -->
<!-- 								<!-- <Button variant="outline" class="rounded-full" -->
<!-- 								><Arrow class="rotate-90" /> Expand all</Button -->
<!-- 							> --> -->
<!-- 								<DropdownMenu.Root> -->
<!-- 									<DropdownMenu.Trigger> -->
<!-- 										{#snippet child({ props })} -->
<!-- 											<Button {...props}><Funnel /> Filter</Button> -->
<!-- 										{/snippet} -->
<!-- 									</DropdownMenu.Trigger> -->
<!-- 									<DropdownMenu.Content class="w-56"> -->
<!-- 										<DropdownMenu.Group> -->
<!-- 											<!-- forgive me for my sins (the way event counts are counted) --> -->
<!-- 											<DropdownMenu.Label>Show messages</DropdownMenu.Label> -->
<!-- 											<DropdownMenu.Separator /> -->
<!-- 											<DropdownMenu.CheckboxItem closeOnSelect={false} bind:checked={filter.user}> -->
<!-- 												User <DropdownMenu.Shortcut -->
<!-- 													>{data.messages.data.filter((item) => item.role === 'user').length} -->
<!-- 												</DropdownMenu.Shortcut> -->
<!-- 											</DropdownMenu.CheckboxItem> -->
<!-- 											<DropdownMenu.CheckboxItem -->
<!-- 												closeOnSelect={false} -->
<!-- 												bind:checked={filter.assistant} -->
<!-- 												>Agent <DropdownMenu.Shortcut -->
<!-- 													>{data.messages.data.filter((item) => item.role === 'assistant').length} -->
<!-- 												</DropdownMenu.Shortcut></DropdownMenu.CheckboxItem -->
<!-- 											> -->
<!-- 											<DropdownMenu.CheckboxItem closeOnSelect={false} bind:checked={filter.tool} -->
<!-- 												>Tool <DropdownMenu.Shortcut -->
<!-- 													>{data.messages.data.filter((item) => item.role === 'tool').length} -->
<!-- 												</DropdownMenu.Shortcut></DropdownMenu.CheckboxItem -->
<!-- 											> -->
<!-- 											<DropdownMenu.CheckboxItem -->
<!-- 												closeOnSelect={false} -->
<!-- 												bind:checked={filter.developer} -->
<!-- 												>Developer <DropdownMenu.Shortcut -->
<!-- 													>{data.messages.data.filter((item) => item.role === 'developer').length} -->
<!-- 												</DropdownMenu.Shortcut></DropdownMenu.CheckboxItem -->
<!-- 											> -->
<!-- 										</DropdownMenu.Group> -->
<!-- 									</DropdownMenu.Content> -->
<!-- 								</DropdownMenu.Root> -->
<!-- 								<p class="text-muted-foreground text-sm"> -->
<!-- 									Showing {data.messages.data.filter((item) => filter[item.role]).length} of {data -->
<!-- 										.messages.data.length} events -->
<!-- 								</p> -->
<!-- 							</section> -->
<!-- 							<ul class="mt-16 flex flex-col px-4 [&_.separator:last-of-type]:hidden"> -->
<!-- 								{#each data.messages.data as message, i} -->
<!-- 									<Telemetry {message} {filter} /> -->
<!-- 								{/each} -->
<!-- 							</ul> -->
<!-- 						</Tabs.Content> -->
<!-- 						<Tabs.Content value="hyperparameters" class="p-2"> -->
<!-- 							<Card.Root> -->
<!-- 								<Card.Header> -->
<!-- 									<Card.Title>Additional parameters</Card.Title> -->
<!-- 								</Card.Header> -->
<!-- 								<Card.Content> -->
<!-- 									<CodeBlock -->
<!-- 										text={JSON.stringify(data.additionalParams, null, 2)} -->
<!-- 										class="overflow-scroll whitespace-pre-wrap" -->
<!-- 										language="json" -->
<!-- 									/> -->
<!-- 								</Card.Content> -->
<!-- 							</Card.Root> -->
<!-- 						</Tabs.Content> -->
<!-- 						<Tabs.Content value="details" class="flex w-full flex-col gap-4 p-2"> -->
<!-- 							<section class="grid grid-cols-2 gap-3"> -->
<!-- 								<!-- TODO: pop these all into a tiny component maybe? --> -->
<!-- 								<ol class="flex flex-col gap-3"> -->
<!-- 									<li> -->
<!-- 										<Card.Root> -->
<!-- 											<Card.Header> -->
<!-- 												<Card.Title>Model description</Card.Title> -->
<!-- 											</Card.Header> -->
<!-- 											<Card.Content> -->
<!-- 												<CodeBlock -->
<!-- 													text={JSON.stringify(data.modelDescription, null, 2)} -->
<!-- 													class="overflow-scroll whitespace-pre-wrap" -->
<!-- 													language="json" -->
<!-- 												/> -->
<!-- 											</Card.Content> -->
<!-- 										</Card.Root> -->
<!-- 									</li> -->
<!-- 									<li> -->
<!-- 										<Card.Root> -->
<!-- 											<Card.Header> -->
<!-- 												<Card.Title>Max tokens</Card.Title> -->
<!-- 											</Card.Header> -->
<!-- 											<Card.Content> -->
<!-- 												<CodeBlock -->
<!-- 													text={JSON.stringify(data.maxTokens, null, 2)} -->
<!-- 													class="overflow-scroll whitespace-pre-wrap" -->
<!-- 													language="json" -->
<!-- 												/> -->
<!-- 											</Card.Content> -->
<!-- 										</Card.Root> -->
<!-- 									</li> -->
<!---->
<!-- 									<li> -->
<!-- 										<Card.Root> -->
<!-- 											<Card.Header> -->
<!-- 												<Card.Title>Temperature</Card.Title> -->
<!-- 											</Card.Header> -->
<!-- 											<Card.Content> -->
<!-- 												<CodeBlock -->
<!-- 													text={JSON.stringify(data.temperature, null, 2)} -->
<!-- 													class="overflow-scroll whitespace-pre-wrap" -->
<!-- 													language="json" -->
<!-- 												/> -->
<!-- 											</Card.Content> -->
<!-- 										</Card.Root> -->
<!-- 									</li> -->
<!-- 								</ol> -->
<!-- 								<ol class="flex flex-col gap-2"> -->
<!-- 									<li> -->
<!-- 										<Card.Root> -->
<!-- 											<Card.Header> -->
<!-- 												<Card.Title>Resources</Card.Title> -->
<!-- 											</Card.Header> -->
<!-- 											<Card.Content> -->
<!-- 												<CodeBlock -->
<!-- 													text={JSON.stringify(data.resources, null, 2)} -->
<!-- 													class="overflow-scroll whitespace-pre-wrap" -->
<!-- 													language="json" -->
<!-- 												/> -->
<!-- 											</Card.Content> -->
<!-- 										</Card.Root> -->
<!-- 									</li> -->
<!-- 									<li> -->
<!-- 										<Card.Root> -->
<!-- 											<Card.Header> -->
<!-- 												<Card.Title>Preamble</Card.Title> -->
<!-- 											</Card.Header> -->
<!-- 											<Card.Content> -->
<!-- 												<CodeBlock -->
<!-- 													text={data.preamble} -->
<!-- 													class="overflow-scroll whitespace-pre-wrap" -->
<!-- 													language="json" -->
<!-- 												/> -->
<!-- 											</Card.Content> -->
<!-- 										</Card.Root> -->
<!-- 									</li> -->
<!-- 								</ol> -->
<!-- 							</section> -->
<!-- 							<Separator /> -->
<!-- 							<Card.Root> -->
<!-- 								<Accordion.Root type="single"> -->
<!-- 									<Accordion.Item value="item-1"> -->
<!-- 										<Card.Header> -->
<!-- 											<Accordion.Trigger> -->
<!-- 												<Card.Title>Raw telemetry payload</Card.Title> -->
<!-- 											</Accordion.Trigger> -->
<!-- 										</Card.Header> -->
<!-- 										<Accordion.Content> -->
<!-- 											<Card.Content> -->
<!-- 												<CodeBlock -->
<!-- 													text={JSON.stringify(data, null, 2)} -->
<!-- 													class=" overflow-scroll whitespace-pre-wrap" -->
<!-- 													language="json" -->
<!-- 												/> -->
<!-- 											</Card.Content> -->
<!-- 										</Accordion.Content> -->
<!-- 									</Accordion.Item> -->
<!-- 								</Accordion.Root> -->
<!-- 							</Card.Root> -->
<!-- 						</Tabs.Content> -->
<!-- 					</ScrollArea> -->
<!-- 				</Tabs.Root> -->
<!-- 			</Dialog.Content> -->
<!-- 		</Dialog.Root> -->
<!-- 	{/if} -->
<!-- {/await} -->
