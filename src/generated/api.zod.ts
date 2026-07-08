import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";




const RegistryAgentIdentifier = z.object({ name: z.string(), version: z.string(), registrySourceId: z.union([z.object({ type: z.literal("linked"), linkedServerId: z.string() }).passthrough(), z.object({ type: z.literal("local") }).passthrough(), z.object({ type: z.literal("marketplace") }).passthrough()]) }).passthrough();
const RuntimeId = z.enum(["executable", "docker", "function", "prototype"]);
const GraphAgentServerAttributeType = z.enum(["geographic_location", "attested_by"]);
const GraphAgentServer = z.object({ address: z.string(), port: z.number().int().gte(0).lte(65535), secure: z.boolean(), attributes: z.array(z.union([z.object({ format: z.literal("boolean"), type: GraphAgentServerAttributeType, value: z.boolean() }).passthrough(), z.object({ format: z.literal("number"), type: GraphAgentServerAttributeType, value: z.number() }).passthrough(), z.object({ format: z.literal("string"), type: GraphAgentServerAttributeType, value: z.string() }).passthrough()])) }).passthrough();
const flat = z.object({ weight: z.number() }).passthrough();
const GraphAgentServerScorerEffect = z.union([z.object({ weight: z.number() }).passthrough(), z.object({ weight: z.number() }).passthrough()]);
const X402BudgetedResource = z.object({ priority: z.number().int(), resource: z.string(), remainingBudget: z.number().int() }).passthrough();
const GraphAgentProxyRequest = z.object({ configurationName: z.string(), modelName: z.string() }).passthrough();
const GraphAgentBudgetSettings = z.object({ budget: z.number().int(), claimTypeCosts: z.record(z.number().int()), exhaustionBehavior: z.union([z.object({ type: z.literal("consume_session") }).passthrough(), z.object({ type: z.literal("kill"), minimum: z.number().int(), force: z.boolean(), forceDelay: z.string().optional() }).passthrough()]) }).partial().passthrough();
const GraphAgentRequest = z.object({ id: RegistryAgentIdentifier, name: z.string(), description: z.string().optional(), options: z.record(z.union([z.object({ type: z.literal("blob"), value: z.string() }).passthrough(), z.object({ type: z.literal("list[blob]"), value: z.array(z.string()) }).passthrough(), z.object({ type: z.literal("bool"), value: z.boolean() }).passthrough(), z.object({ type: z.literal("i8"), value: z.number().int().gte(-128).lte(127) }).passthrough(), z.object({ type: z.literal("list[i8]"), value: z.array(z.number().int().gte(-128).lte(127)) }).passthrough(), z.object({ type: z.literal("f64"), value: z.number() }).passthrough(), z.object({ type: z.literal("list[f64]"), value: z.array(z.number()) }).passthrough(), z.object({ type: z.literal("f32"), value: z.number() }).passthrough(), z.object({ type: z.literal("list[f32]"), value: z.array(z.number()) }).passthrough(), z.object({ type: z.literal("i32"), value: z.number().int() }).passthrough(), z.object({ type: z.literal("list[i32]"), value: z.array(z.number().int()) }).passthrough(), z.object({ type: z.literal("i64"), value: z.number().int() }).passthrough(), z.object({ type: z.literal("list[i64]"), value: z.array(z.number().int()) }).passthrough(), z.object({ type: z.literal("i16"), value: z.number().int().gte(-32768).lte(32767) }).passthrough(), z.object({ type: z.literal("list[i16]"), value: z.array(z.number().int().gte(-32768).lte(32767)) }).passthrough(), z.object({ type: z.literal("string"), value: z.string() }).passthrough(), z.object({ type: z.literal("list[string]"), value: z.array(z.string()) }).passthrough(), z.object({ type: z.literal("u8"), value: z.number().int().gte(0).lte(255) }).passthrough(), z.object({ type: z.literal("list[u8]"), value: z.array(z.number().int().gte(0).lte(255)) }).passthrough(), z.object({ type: z.literal("u32"), value: z.number().int().gte(0).lte(4294967295) }).passthrough(), z.object({ type: z.literal("list[u32]"), value: z.array(z.number().int().gte(0).lte(4294967295)) }).passthrough(), z.object({ type: z.literal("u64"), value: z.string() }).passthrough(), z.object({ type: z.literal("list[u64]"), value: z.array(z.string()) }).passthrough(), z.object({ type: z.literal("u16"), value: z.number().int().gte(0).lte(65535) }).passthrough(), z.object({ type: z.literal("list[u16]"), value: z.array(z.number().int().gte(0).lte(65535)) }).passthrough()])).optional(), systemPrompt: z.string().optional(), blocking: z.boolean().optional(), customToolAccess: z.array(z.string()).optional(), plugins: z.array(z.object({ type: z.literal("close_session_tool") }).passthrough()).optional(), provider: z.union([z.object({ type: z.literal("linked"), linkedServerName: z.string(), runtime: RuntimeId }).passthrough(), z.object({ type: z.literal("local"), runtime: RuntimeId }).passthrough(), z.object({ type: z.literal("remote"), server: GraphAgentServer, runtime: RuntimeId, wallet: z.string(), maxCost: z.union([z.object({ type: z.literal("coral"), amount: z.number() }).passthrough(), z.object({ type: z.literal("micro_coral"), amount: z.number().int() }).passthrough(), z.object({ type: z.literal("usd"), amount: z.number() }).passthrough()]), paymentSessionId: z.string() }).passthrough(), z.object({ type: z.literal("remote_request"), runtime: RuntimeId, maxCost: z.union([z.object({ type: z.literal("coral"), amount: z.number() }).passthrough(), z.object({ type: z.literal("micro_coral"), amount: z.number().int() }).passthrough(), z.object({ type: z.literal("usd"), amount: z.number() }).passthrough()]), serverSource: z.union([z.object({ type: z.literal("org.coralprotocol.coralserver.agent.graph.server.GraphAgentServerSource.Indexer"), indexer: z.string() }).passthrough(), z.object({ type: z.literal("servers"), servers: z.array(GraphAgentServer) }).passthrough()]), serverScoring: z.union([z.object({ type: z.literal("custom"), scorers: z.array(z.union([z.object({ op: z.literal("is_false"), type: GraphAgentServerAttributeType, effect: flat }).passthrough(), z.object({ op: z.literal("is_not_present"), type: GraphAgentServerAttributeType, effect: flat }).passthrough(), z.object({ op: z.literal("is_present"), type: GraphAgentServerAttributeType, effect: GraphAgentServerScorerEffect }).passthrough(), z.object({ op: z.literal("is_true"), type: GraphAgentServerAttributeType, effect: flat }).passthrough(), z.object({ op: z.literal("string_equal"), type: GraphAgentServerAttributeType, string: z.string(), effect: flat }).passthrough(), z.object({ op: z.literal("string_not_equal"), type: GraphAgentServerAttributeType, string: z.string(), effect: flat }).passthrough()])) }).passthrough(), z.object({ type: z.literal("default") }).passthrough()]).optional() }).passthrough()]), x402Budgets: z.array(X402BudgetedResource).optional(), proxies: z.record(GraphAgentProxyRequest).optional(), budgetSettings: GraphAgentBudgetSettings.optional(), annotations: z.record(z.string()).optional() }).passthrough();
const JsonElement = z.object({  }).partial().passthrough();
const ToolSchema = z.object({ properties: z.record(JsonElement).optional(), required: z.array(z.string()).optional(), "$defs": z.record(JsonElement).optional(), type: z.string() }).passthrough();
const ToolAnnotations = z.object({ title: z.string(), readOnlyHint: z.boolean(), destructiveHint: z.boolean(), idempotentHint: z.boolean(), openWorldHint: z.boolean() }).partial().passthrough();
const GraphAgentTool = z.object({ transport: z.object({ type: z.literal("http"), url: z.string(), signatureHeader: z.string().optional() }).passthrough(), inputSchema: ToolSchema, outputSchema: ToolSchema, description: z.string().optional(), title: z.string().optional(), annotations: ToolAnnotations.optional() }).passthrough();
const AgentGraphRequest = z.object({ agents: z.array(GraphAgentRequest), groups: z.array(z.array(z.string())).optional(), customTools: z.record(GraphAgentTool).optional() }).passthrough();
const SessionNamespaceRequest = z.object({ name: z.string(), deleteOnLastSessionExit: z.boolean(), annotations: z.record(z.string()) }).passthrough();
const SessionEndWebhook = z.object({ url: z.string() }).passthrough();
const SessionWebhooks = z.object({ sessionEnd: SessionEndWebhook }).partial().passthrough();
const SessionRuntimeSettings = z.object({ ttl: z.number().int().optional(), extendedEndReport: z.boolean(), persistenceMode: z.union([z.object({ mode: z.literal("hold_after_exit"), duration: z.number().int() }).passthrough(), z.object({ mode: z.literal("minimum_time"), time: z.number().int() }).passthrough(), z.object({ mode: z.literal("none") }).passthrough()]).optional(), webhooks: SessionWebhooks.optional() }).passthrough();
const SessionBudgetSettings = z.object({ budget: z.number().int(), exhaustionBehavior: z.union([z.object({ type: z.literal("ignore") }).passthrough(), z.object({ type: z.literal("kill_agent"), minimum: z.number().int(), force: z.boolean(), forceDelay: z.string().optional() }).passthrough(), z.object({ type: z.literal("kill_session"), minimum: z.number().int(), delay: z.string().optional() }).passthrough()]) }).partial().passthrough();
const SessionRequest = z.object({ agentGraphRequest: AgentGraphRequest, namespaceProvider: z.union([z.object({ type: z.literal("create_if_not_exists"), namespaceRequest: SessionNamespaceRequest }).passthrough(), z.object({ type: z.literal("use_existing"), name: z.string() }).passthrough()]), execution: z.union([z.object({ mode: z.literal("defer") }).passthrough(), z.object({ mode: z.literal("immediate"), runtimeSettings: SessionRuntimeSettings.optional() }).passthrough()]).optional(), budgetSettings: SessionBudgetSettings.optional(), annotations: z.record(z.string()).optional() }).passthrough();
const SessionIdentifier = z.object({ namespace: z.string(), sessionId: z.string() }).passthrough();
const RouteException = z.object({ message: z.string() }).passthrough();
const SessionNamespaceStateBase = z.object({ name: z.string(), deleteOnLastSessionExit: z.boolean(), annotations: z.record(z.string()) }).passthrough();
const SessionStateBase = z.object({ id: z.string(), timestamp: z.string(), namespace: z.string(), status: z.union([z.object({ type: z.literal("closing"), executionTime: z.string(), closingTime: z.string() }).passthrough(), z.object({ type: z.literal("pending_execution") }).passthrough(), z.object({ type: z.literal("executed"), executionTime: z.string() }).passthrough()]), annotations: z.record(z.string()) }).passthrough();
const SessionRunningBudget = z.object({ startBudget: z.number().int(), clamp: z.boolean(), remaining: z.number().int(), overclaim: z.number().int() }).passthrough();
const SessionAgentState = z.object({ name: z.string(), registryAgentIdentifier: RegistryAgentIdentifier, status: z.union([z.object({ type: z.literal("running"), connectionStatus: z.union([z.object({ type: z.literal("connected"), communicationStatus: z.union([z.object({ type: z.literal("sleeping") }).passthrough(), z.object({ type: z.literal("thinking") }).passthrough(), z.object({ type: z.literal("waiting_message") }).passthrough()]) }).passthrough(), z.object({ type: z.literal("not_connected") }).passthrough()]), startTime: z.string() }).passthrough(), z.object({ type: z.literal("stopped"), startTime: z.string().optional() }).passthrough(), z.object({ type: z.literal("waiting") }).passthrough()]), description: z.string().optional(), links: z.array(z.string()), runningBudget: SessionRunningBudget, budgetSettings: GraphAgentBudgetSettings, annotations: z.record(z.string()) }).passthrough();
const SessionThreadMessage = z.object({ id: z.string(), threadId: z.string(), text: z.string(), senderName: z.string(), mentionNames: z.array(z.string()), timestamp: z.string() }).passthrough();
const SessionThread = z.object({ id: z.string(), name: z.string(), creatorName: z.string(), participants: z.array(z.string()), messages: z.array(SessionThreadMessage), state: z.union([z.object({ state: z.literal("closed"), summary: z.string(), timestamp: z.string() }).passthrough(), z.object({ state: z.literal("open") }).passthrough()]), timestamp: z.string() }).passthrough();
const RegistryAgentClaimType = z.object({ name: z.string(), description: z.string(), dependency: z.string(), cost: z.number().int().optional() }).passthrough();
const SessionAgentClaimReceipt = z.object({ claim: z.union([z.object({ type: z.literal("llm_proxy_claim"), timestamp: z.string(), inputTokenCount: z.number().int(), inputTokenCost: z.number().int(), outputTokenCount: z.number().int(), outputTokenCost: z.number().int() }).passthrough(), z.object({ type: z.literal("rpc_claim"), timestamp: z.string(), claimType: RegistryAgentClaimType, quantity: z.number().int().gte(0).lte(4294967295), additionalDescription: z.string().optional() }).passthrough()]), cost: z.number().int(), id: z.number().int() }).passthrough();
const SessionStateExtended = z.object({ base: SessionStateBase, agents: z.array(SessionAgentState), threads: z.array(SessionThread), runningBudget: SessionRunningBudget, budgetSettings: SessionBudgetSettings, agentClaimReceipts: z.array(SessionAgentClaimReceipt) }).passthrough();
const SessionNamespaceStateExtended = z.object({ base: SessionNamespaceStateBase, sessions: z.array(SessionStateBase) }).passthrough();
const RegistryAgentCatalog = z.object({ name: z.string(), versions: z.array(z.string()) }).passthrough();
const AgentRegistrySource = z.object({ identifier: z.union([z.object({ type: z.literal("linked"), linkedServerId: z.string() }).passthrough(), z.object({ type: z.literal("local") }).passthrough(), z.object({ type: z.literal("marketplace") }).passthrough()]), timestamp: z.string(), name: z.string(), agents: z.array(RegistryAgentCatalog) }).passthrough();
const AgentCapability = z.enum(["resources", "tool_refreshing"]);
const RegistryAgentInfo = z.object({ capabilities: z.array(AgentCapability), identifier: RegistryAgentIdentifier, description: z.string(), readme: z.string(), summary: z.string(), license: z.union([z.object({ type: z.literal("spdx"), expression: z.string() }).passthrough(), z.object({ type: z.literal("text"), text: z.string() }).passthrough()]), keywords: z.array(z.string()).optional(), links: z.record(z.string()).optional() }).passthrough();
const McpTransportType = z.enum(["sse", "streamable_http"]);
const executable = z.object({ path: z.string(), arguments: z.array(z.string()), transport: McpTransportType }).passthrough();
const docker = z.object({ image: z.string(), transport: McpTransportType, command: z.array(z.string()).optional() }).passthrough();
const FunctionRuntime = z.object({ transport: McpTransportType }).passthrough();
const PrototypeString = z.object({  }).partial().passthrough();
const PrototypeClient = z.enum(["openai", "openrouter", "anthropic"]);
const PrototypeInteger = z.object({  }).partial().passthrough();
const PrototypeSystemPrompt = z.object({ base: PrototypeString, extra: PrototypeString.optional() }).passthrough();
const PrototypeLoopInitialPrompt = z.object({ base: PrototypeString, extra: PrototypeString.optional() }).passthrough();
const PrototypeLoopPrompt = z.object({ initial: PrototypeLoopInitialPrompt, followup: PrototypeString }).passthrough();
const PrototypePrompts = z.object({ system: PrototypeSystemPrompt, loop: PrototypeLoopPrompt }).passthrough();
const PrototypeRuntime = z.object({ volatile: z.boolean(), proxy: PrototypeString, client: PrototypeClient.optional(), iterations: PrototypeInteger, delay: PrototypeInteger, prompts: PrototypePrompts, tools: z.array(z.union([z.object({ type: z.literal("mcp_sse"), url: PrototypeString, auth: z.union([z.object({ type: z.literal("authorization_header"), header: PrototypeString }).passthrough(), z.object({ type: z.literal("bearer"), token: PrototypeString }).passthrough(), z.object({ type: z.literal("none") }).passthrough()]) }).passthrough(), z.object({ type: z.literal("mcp_streamable_http"), url: PrototypeString, auth: z.union([z.object({ type: z.literal("authorization_header"), header: PrototypeString }).passthrough(), z.object({ type: z.literal("bearer"), token: PrototypeString }).passthrough(), z.object({ type: z.literal("none") }).passthrough()]) }).passthrough()])) }).passthrough();
const runtime = z.object({ executable: executable, docker: docker, function: FunctionRuntime, prototype: PrototypeRuntime }).partial().passthrough();
const ByteSize = z.object({  }).partial().passthrough();
const BlobAgentOptionValidation = z.object({ min_size: ByteSize, max_size: ByteSize }).partial().passthrough();
const AgentOptionDisplay = z.object({ label: z.string(), description: z.string(), group: z.string(), multiline: z.boolean() }).partial().passthrough();
const AgentOptionTransport = z.enum(["env", "fs"]);
const ByteAgentOptionValidation = z.object({ variants: z.array(z.number().int().gte(-128).lte(127)), min: z.number().int().gte(-128).lte(127), max: z.number().int().gte(-128).lte(127) }).partial().passthrough();
const DoubleAgentOptionValidation = z.object({ variants: z.array(z.number()), min: z.number(), max: z.number() }).partial().passthrough();
const FloatAgentOptionValidation = z.object({ variants: z.array(z.number()), min: z.number(), max: z.number() }).partial().passthrough();
const IntAgentOptionValidation = z.object({ variants: z.array(z.number().int()), min: z.number().int(), max: z.number().int() }).partial().passthrough();
const LongAgentOptionValidation = z.object({ variants: z.array(z.number().int()), min: z.number().int(), max: z.number().int() }).partial().passthrough();
const ShortAgentOptionValidation = z.object({ variants: z.array(z.number().int().gte(-32768).lte(32767)), min: z.number().int().gte(-32768).lte(32767), max: z.number().int().gte(-32768).lte(32767) }).partial().passthrough();
const StringAgentOptionValidation = z.object({ variants: z.array(z.string()), min_length: z.number().int(), max_length: z.number().int(), regex: z.string() }).partial().passthrough();
const UByteAgentOptionValidation = z.object({ variants: z.array(z.number().int().gte(0).lte(255)), min: z.number().int().gte(0).lte(255), max: z.number().int().gte(0).lte(255) }).partial().passthrough();
const UIntAgentOptionValidation = z.object({ variants: z.array(z.number().int().gte(0).lte(4294967295)), min: z.number().int().gte(0).lte(4294967295), max: z.number().int().gte(0).lte(4294967295) }).partial().passthrough();
const ULongAgentOptionValidation = z.object({ variants: z.array(z.number().int()), min: z.number().int(), max: z.number().int() }).partial().passthrough();
const UShortAgentOptionValidation = z.object({ variants: z.array(z.number().int().gte(0).lte(65535)), min: z.number().int().gte(0).lte(65535), max: z.number().int().gte(0).lte(65535) }).partial().passthrough();
const AgentLlmProxyRequest = z.object({ name: z.string(), format: z.union([z.object({ type: z.literal("Anthropic") }).passthrough(), z.object({ type: z.literal("OpenAI") }).passthrough()]), models: z.array(z.string()) }).passthrough();
const AgentLlmConfig = z.object({ proxies: z.array(AgentLlmProxyRequest) }).passthrough();
const RegistryAgentMarketplacePricingRecommendations = z.object({ min: z.number(), max: z.number() }).passthrough();
const RegistryAgentMarketplacePricing = z.object({ description: z.string(), recommendations: RegistryAgentMarketplacePricingRecommendations, currency: z.string().optional() }).passthrough();
const Erc8004Endpoint = z.object({ name: z.string(), endpoint: z.string() }).passthrough();
const RegistryAgentMarketplaceIdentityErc8004 = z.object({ wallet: z.string(), endpoints: z.array(Erc8004Endpoint).optional() }).passthrough();
const RegistryAgentMarketplaceIdentities = z.object({ erc8004: RegistryAgentMarketplaceIdentityErc8004 }).partial().passthrough();
const RegistryAgentMarketplaceSettings = z.object({ keywords: z.array(z.string()), pricing: RegistryAgentMarketplacePricing, identities: RegistryAgentMarketplaceIdentities }).partial().passthrough();
const RegistryAgentDependency = z.object({ name: z.string(), options: z.array(z.string()) }).passthrough();
const RegistryAgent = z.object({ info: RegistryAgentInfo, edition: z.number().int(), runtimes: runtime, options: z.record(z.union([z.object({ type: z.literal("blob"), default: z.string().optional(), validation: BlobAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[blob]"), default: z.array(z.string()).optional(), validation: BlobAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("bool"), default: z.boolean().optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("i8"), default: z.number().int().gte(-128).lte(127).optional(), validation: ByteAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[i8]"), default: z.array(z.number().int().gte(-128).lte(127)).optional(), validation: ByteAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("f64"), default: z.number().optional(), validation: DoubleAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[f64]"), default: z.array(z.number()).optional(), validation: DoubleAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("f32"), default: z.number().optional(), validation: FloatAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[f32]"), default: z.array(z.number()).optional(), validation: FloatAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("i32"), default: z.number().int().optional(), validation: IntAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[i32]"), default: z.array(z.number().int()).optional(), validation: IntAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("i64"), default: z.number().int().optional(), validation: LongAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[i64]"), default: z.array(z.number().int()).optional(), validation: LongAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("i16"), default: z.number().int().gte(-32768).lte(32767).optional(), validation: ShortAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[i16]"), default: z.array(z.number().int().gte(-32768).lte(32767)).optional(), validation: ShortAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("string"), default: z.string().optional(), validation: StringAgentOptionValidation.optional(), base64: z.boolean().optional(), secret: z.boolean().optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[string]"), default: z.array(z.string()).optional(), validation: StringAgentOptionValidation.optional(), base64: z.boolean().optional(), secret: z.boolean().optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("u8"), default: z.number().int().gte(0).lte(255).optional(), validation: UByteAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[u8]"), default: z.array(z.number().int().gte(0).lte(255)).optional(), validation: UByteAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("u32"), default: z.number().int().gte(0).lte(4294967295).optional(), validation: UIntAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[u32]"), default: z.array(z.number().int().gte(0).lte(4294967295)).optional(), validation: UIntAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("u64"), default: z.string().optional(), validation: ULongAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[u64]"), default: z.array(z.string()).optional(), validation: ULongAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("u16"), default: z.number().int().gte(0).lte(65535).optional(), validation: UShortAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough(), z.object({ type: z.literal("list[u16]"), default: z.array(z.number().int().gte(0).lte(65535)).optional(), validation: UShortAgentOptionValidation.optional(), required: z.boolean().optional(), display: AgentOptionDisplay.optional(), transport: AgentOptionTransport.optional() }).passthrough()])), llm: AgentLlmConfig.optional(), marketplace: RegistryAgentMarketplaceSettings.optional(), dependencies: z.array(RegistryAgentDependency), claimTypes: z.array(RegistryAgentClaimType) }).passthrough();
const RestrictedRegistryAgent = z.object({ registryAgent: RegistryAgent, restrictions: z.array(z.union([z.object({ type: z.literal("linked"), linkedServerId: z.string() }).passthrough(), z.object({ type: z.literal("local") }).passthrough(), z.object({ type: z.literal("remote") }).passthrough()])), extension: z.object({ type: z.literal("marketplace"), iconUrl: z.string().optional(), developer: z.string().optional(), publishedAt: z.string() }).passthrough().optional() }).passthrough();
const CreateThreadInput = z.object({ threadName: z.string(), participantNames: z.array(z.string()) }).passthrough();
const CreateThreadOutput = z.object({ thread: SessionThread }).passthrough();
const CloseThreadInput = z.object({ threadId: z.string(), summary: z.string() }).passthrough();
const SendMessageInput = z.object({ threadId: z.string(), content: z.string(), mentions: z.array(z.string()) }).passthrough();
const SendMessageOutput = z.object({ status: z.string(), message: SessionThreadMessage }).passthrough();
const AddParticipantInput = z.object({ threadId: z.string(), participantName: z.string() }).passthrough();
const RemoveParticipantInput = z.object({ threadId: z.string(), participantName: z.string() }).passthrough();
const AgentClaimRequest = z.object({ claimTypeName: z.string(), quantity: z.number().int().gte(0).lte(4294967295).optional(), additionalDescription: z.string().optional(), autoKill: z.boolean() }).passthrough();
const AgentClaimResult = z.object({ claimId: z.number().int(), requestedAmount: z.number().int(), fulfilledAmount: z.number().int(), remainingAgentBudget: z.number().int(), remainingSessionBudget: z.number().int(), shouldExit: z.boolean() }).passthrough();
const X402ProxyRequest = z.object({ endpoint: z.string(), method: z.string(), body: z.record(JsonElement) }).passthrough();
const X402ProxiedResponse = z.object({ code: z.number().int(), body: z.string() }).passthrough();
const PaidGraphAgentRequest = z.object({ graphAgentRequest: GraphAgentRequest, paidSessionId: z.number().int(), clientWalletAddress: z.string() }).passthrough();

export const schemas = {
	RegistryAgentIdentifier,
	RuntimeId,
	GraphAgentServerAttributeType,
	GraphAgentServer,
	flat,
	GraphAgentServerScorerEffect,
	X402BudgetedResource,
	GraphAgentProxyRequest,
	GraphAgentBudgetSettings,
	GraphAgentRequest,
	JsonElement,
	ToolSchema,
	ToolAnnotations,
	GraphAgentTool,
	AgentGraphRequest,
	SessionNamespaceRequest,
	SessionEndWebhook,
	SessionWebhooks,
	SessionRuntimeSettings,
	SessionBudgetSettings,
	SessionRequest,
	SessionIdentifier,
	RouteException,
	SessionNamespaceStateBase,
	SessionStateBase,
	SessionRunningBudget,
	SessionAgentState,
	SessionThreadMessage,
	SessionThread,
	RegistryAgentClaimType,
	SessionAgentClaimReceipt,
	SessionStateExtended,
	SessionNamespaceStateExtended,
	RegistryAgentCatalog,
	AgentRegistrySource,
	AgentCapability,
	RegistryAgentInfo,
	McpTransportType,
	executable,
	docker,
	FunctionRuntime,
	PrototypeString,
	PrototypeClient,
	PrototypeInteger,
	PrototypeSystemPrompt,
	PrototypeLoopInitialPrompt,
	PrototypeLoopPrompt,
	PrototypePrompts,
	PrototypeRuntime,
	runtime,
	ByteSize,
	BlobAgentOptionValidation,
	AgentOptionDisplay,
	AgentOptionTransport,
	ByteAgentOptionValidation,
	DoubleAgentOptionValidation,
	FloatAgentOptionValidation,
	IntAgentOptionValidation,
	LongAgentOptionValidation,
	ShortAgentOptionValidation,
	StringAgentOptionValidation,
	UByteAgentOptionValidation,
	UIntAgentOptionValidation,
	ULongAgentOptionValidation,
	UShortAgentOptionValidation,
	AgentLlmProxyRequest,
	AgentLlmConfig,
	RegistryAgentMarketplacePricingRecommendations,
	RegistryAgentMarketplacePricing,
	Erc8004Endpoint,
	RegistryAgentMarketplaceIdentityErc8004,
	RegistryAgentMarketplaceIdentities,
	RegistryAgentMarketplaceSettings,
	RegistryAgentDependency,
	RegistryAgent,
	RestrictedRegistryAgent,
	CreateThreadInput,
	CreateThreadOutput,
	CloseThreadInput,
	SendMessageInput,
	SendMessageOutput,
	AddParticipantInput,
	RemoveParticipantInput,
	AgentClaimRequest,
	AgentClaimResult,
	X402ProxyRequest,
	X402ProxiedResponse,
	PaidGraphAgentRequest,
};

const endpoints = makeApi([
	{
		method: "post",
		path: "/api/v1/agent-rental/reserve",
		alias: "reserveAgents",
		description: `Reserves a list of rental agents`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `A list of agents to claim`,
				type: "Body",
				schema: PaidGraphAgentRequest.optional()
			},
		],
		response: z.string(),
		errors: [
			{
				status: 400,
				description: `GraphAgentRequest is invalid in a remote context`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/agent-rental/wallet",
		alias: "getPublicWallet",
		description: `Returns the wallet address payments should be made to for renting agents from this server`,
		requestFormat: "json",
		response: z.string(),
		errors: [
			{
				status: 403,
				description: `This server is not configured to allow rental agents`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "post",
		path: "/api/v1/agent-rpc/claim",
		alias: "submitClaim",
		description: `Submits a claim for work performed`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `A description of the work done and the payment required`,
				type: "Body",
				schema: AgentClaimRequest.optional()
			},
		],
		response: AgentClaimResult,
		errors: [
			{
				status: 400,
				description: `Invalid claim type provided`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 401,
				description: `Bad agent secret provided`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "post",
		path: "/api/v1/agent-rpc/x402",
		alias: "requestX402Proxy",
		description: `Allows an agent to request that the server pays for an x402 service by proxy`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `The request to be proxied`,
				type: "Body",
				schema: X402ProxyRequest.optional()
			},
			{
				name: "agentSecret",
				type: "Path",
				schema: z.string()
			},
		],
		response: X402ProxiedResponse,
	},
	{
		method: "get",
		path: "/api/v1/local/namespace",
		alias: "getNamespaceStates",
		description: `Returns a list of namespace states`,
		requestFormat: "json",
		response: z.array(SessionNamespaceStateBase),
	},
	{
		method: "post",
		path: "/api/v1/local/namespace",
		alias: "createNamespace",
		description: `Creates a new empty namespace`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Namespace settings`,
				type: "Body",
				schema: SessionNamespaceRequest.optional()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Invalid namespace settings providewd`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 403,
				description: `Invalid application ID or privacy key`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/local/namespace/:namespace",
		alias: "getSessionStates",
		description: `List base session states for a given namespace`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.array(SessionStateBase),
		errors: [
			{
				status: 404,
				description: `Invalid namespace provided`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "delete",
		path: "/api/v1/local/namespace/:namespace",
		alias: "deleteNamespace",
		description: `Deletes a given namespace, closing any session that it may contain`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `Invalid namespace provided`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/local/namespace/:namespace/extended",
		alias: "getSessionStatesExtended",
		description: `List extended session states for a given namespace`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.array(SessionStateExtended),
		errors: [
			{
				status: 404,
				description: `Invalid namespace provided`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/local/namespace/extended",
		alias: "getNamespaceStatesExtended",
		description: `Returns a list of extended namespace states`,
		requestFormat: "json",
		response: z.array(SessionNamespaceStateExtended),
	},
	{
		method: "post",
		path: "/api/v1/local/session",
		alias: "createSession",
		description: `Creates a new session in a given namespace`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `The session request body, containing the agents to use in the session and other settings`,
				type: "Body",
				schema: SessionRequest.optional()
			},
		],
		response: SessionIdentifier,
		errors: [
			{
				status: 400,
				description: `The agent graph is invalid and could not be processed`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 403,
				description: `Invalid application ID or privacy key`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/local/session/:namespace/:sessionId",
		alias: "getSessionState",
		description: `Returns a session&#x27;s state`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
		],
		response: SessionStateBase,
		errors: [
			{
				status: 404,
				description: `Either namespace or session ID is invalid`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "post",
		path: "/api/v1/local/session/:namespace/:sessionId",
		alias: "executeDeferredSession",
		description: `Executes a session was created with deferred execution`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Settings for the execution of the session`,
				type: "Body",
				schema: SessionRuntimeSettings.optional()
			},
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `The session exists but is not pending execution`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 404,
				description: `Either namespace or session ID is invalid`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "delete",
		path: "/api/v1/local/session/:namespace/:sessionId",
		alias: "closeSession",
		description: `Closes an active session, cancelling all running agents`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 404,
				description: `If either namespace or session ID is invalid`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/local/session/:namespace/:sessionId/extended",
		alias: "getSessionStateExtended",
		description: `Returns a session&#x27;s extended state`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
		],
		response: SessionStateExtended,
		errors: [
			{
				status: 404,
				description: `Either namespace or session ID is invalid`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "delete",
		path: "/api/v1/puppet/:namespace/:sessionId/:agentName",
		alias: "puppetKillAgent",
		description: `Forcefully cause an agent to exit it&#x27;s own runtime`,
		requestFormat: "json",
		parameters: [
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Agent not running`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 404,
				description: `Agent not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "post",
		path: "/api/v1/puppet/:namespace/:sessionId/:agentName/thread",
		alias: "puppetCreateThread",
		description: `Creates a new thread masquerading as the specified agent`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Thread creation input`,
				type: "Body",
				schema: CreateThreadInput.optional()
			},
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
		],
		response: CreateThreadOutput,
		errors: [
			{
				status: 404,
				description: `Agent not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "delete",
		path: "/api/v1/puppet/:namespace/:sessionId/:agentName/thread",
		alias: "puppetCloseThread",
		description: `Closes a thread masquerading as the specified agent`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Thread close input`,
				type: "Body",
				schema: CloseThreadInput.optional()
			},
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Thread cannot be closed`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 404,
				description: `Agent or thread not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "post",
		path: "/api/v1/puppet/:namespace/:sessionId/:agentName/thread/message",
		alias: "puppetSendMessage",
		description: `Sends a message in a thread masquerading as the specified agent`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Message input`,
				type: "Body",
				schema: SendMessageInput.optional()
			},
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
		],
		response: SendMessageOutput,
		errors: [
			{
				status: 400,
				description: `Bad message`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 404,
				description: `Agent or thread not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "post",
		path: "/api/v1/puppet/:namespace/:sessionId/:agentName/thread/participant",
		alias: "puppetAddThreadParticipant",
		description: `Adds an agent to a thread masquerading as the specified agent`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Thread and participant information details`,
				type: "Body",
				schema: AddParticipantInput.optional()
			},
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Participant cannot be added`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 404,
				description: `Agent or thread not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "delete",
		path: "/api/v1/puppet/:namespace/:sessionId/:agentName/thread/participant",
		alias: "puppetRemoveThreadParticipant",
		description: `Removes an agent from a thread masquerading as the specified agent`,
		requestFormat: "json",
		parameters: [
			{
				name: "body",
				description: `Thread and participant information details`,
				type: "Body",
				schema: RemoveParticipantInput.optional()
			},
			{
				name: "namespace",
				type: "Path",
				schema: z.string()
			},
			{
				name: "sessionId",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
		],
		response: z.void(),
		errors: [
			{
				status: 400,
				description: `Participant cannot be removed`,
				schema: z.object({ message: z.string() }).passthrough()
			},
			{
				status: 404,
				description: `Agent or thread not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/registry",
		alias: "getRegistryAgents",
		description: `Returns a list of all agents available in this servers registry`,
		requestFormat: "json",
		response: z.array(AgentRegistrySource),
	},
	{
		method: "get",
		path: "/api/v1/registry/linked/:linkedServerName/:agentName/:agentVersion",
		alias: "inspectLinkedServerAgent",
		description: `Returns all details about a specific agent from a specific linked server`,
		requestFormat: "json",
		parameters: [
			{
				name: "linkedServerName",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentVersion",
				type: "Path",
				schema: z.string()
			},
		],
		response: RestrictedRegistryAgent,
		errors: [
			{
				status: 404,
				description: `Agent or linked server not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/registry/local/:agentName/:agentVersion",
		alias: "inspectLocalAgent",
		description: `Returns all details about a specific agent in the local registry`,
		requestFormat: "json",
		parameters: [
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentVersion",
				type: "Path",
				schema: z.string()
			},
		],
		response: RestrictedRegistryAgent,
		errors: [
			{
				status: 404,
				description: `Agent not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
	{
		method: "get",
		path: "/api/v1/registry/marketplace/:agentName/:agentVersion",
		alias: "inspectMarketplaceAgent",
		description: `Returns all details about a specific agent in the marketplace`,
		requestFormat: "json",
		parameters: [
			{
				name: "agentName",
				type: "Path",
				schema: z.string()
			},
			{
				name: "agentVersion",
				type: "Path",
				schema: z.string()
			},
		],
		response: RestrictedRegistryAgent,
		errors: [
			{
				status: 404,
				description: `Agent not found`,
				schema: z.object({ message: z.string() }).passthrough()
			},
		]
	},
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
    return new Zodios(baseUrl, endpoints, options);
}
