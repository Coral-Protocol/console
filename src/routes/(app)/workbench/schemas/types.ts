import type { operations } from '$generated/api';
import type { CoralServer } from '$lib/CoralServer.svelte';
import { z } from 'zod/v4';

export type CreateSessionRequest = NonNullable<
	operations['createSession']['requestBody']
>['content']['application/json'];

export const makeFormSchema = (server: CoralServer) =>
	formSchema.superRefine(async (data, ctx) => {
		Promise.all(
			data.agents.map(async (agent, i) => {
				const meta = await server.lookupAgent(agent.id);
				// TODO: verify restrictions

				// const regAgent = registryAgents[`${agent.id.name}${agent.id.version}`];
				// if (!regAgent) {
				// 	ctx.addIssue({
				// 		code: 'custom',
				// 		path: ['agent', i, 'agentName'],
				// 		message: `Agent name ${agent.id.name}@${agent.id.version} not found in registry.`
				// 	});
				// 	return;
				// }
				const runtime = agent.provider.runtime;
				if (runtime && !(runtime in meta.registryAgent.runtimes)) {
					ctx.addIssue({
						code: 'custom',
						path: ['agent', i, 'provider', 'runtime'],
						message: `Runtime ${runtime} not available for this agent.`
					});
				}
				const options = Object.entries(meta.registryAgent.options ?? {});
				for (const [name, opt] of options) {
					if (opt.required !== true) continue;
					const val = agent.options[name];
					if (val === undefined || (val.type === 'string' && val.value.length === 0)) {
						ctx.addIssue({
							code: 'custom',
							path: ['agents', i, 'options', name, 'value'],
							message: `Missing required option`
						});
					}
				}
			})
		);
	});

export const RuntimeIdSchema = z.enum(['executable', 'docker', 'function']);
export type RuntimeId = z.infer<typeof RuntimeIdSchema>;

export const GraphAgentServerAttributeTypeSchema = z.enum(['geographic_location', 'attested_by']);
export type GraphAgentServerAttributeType = z.infer<typeof GraphAgentServerAttributeTypeSchema>;

export const FlatSchema = z.object({
	weight: z.number()
});
export type Flat = z.infer<typeof FlatSchema>;

export const GraphAgentServerScorerEffectSchema = z.object({
	weight: z.number()
});
export type GraphAgentServerScorerEffect = z.infer<typeof GraphAgentServerScorerEffectSchema>;

export const GraphAgentServerAttributeSchema = z
	.discriminatedUnion('format', [
		z.object({
			format: z.literal('boolean'),
			type: GraphAgentServerAttributeTypeSchema,
			value: z.boolean()
		}),
		z.object({
			format: z.literal('number'),
			type: GraphAgentServerAttributeTypeSchema,
			value: z.number()
		}),
		z.object({
			format: z.literal('string'),
			type: GraphAgentServerAttributeTypeSchema,
			value: z.string()
		})
	])
	.default({ format: 'string', type: 'attested_by', value: '' });
export type GraphAgentServerAttribute = z.infer<typeof GraphAgentServerAttributeSchema>;

export const GraphAgentServerSchema = z.object({
	address: z.string(),
	port: z.number().int().min(0).max(65535),
	secure: z.boolean(),
	attributes: z.array(GraphAgentServerAttributeSchema)
});
export type GraphAgentServer = z.infer<typeof GraphAgentServerSchema>;

export const GraphAgentServerScoringSchema = z
	.discriminatedUnion('type', [
		z.object({
			type: z.literal('custom'),
			scorers: z.array(
				z.discriminatedUnion('op', [
					z.object({
						op: z.literal('is_false'),
						type: GraphAgentServerAttributeTypeSchema,
						effect: FlatSchema
					}),
					z.object({
						op: z.literal('is_not_present'),
						type: GraphAgentServerAttributeTypeSchema,
						effect: FlatSchema
					}),
					z.object({
						op: z.literal('is_present'),
						type: GraphAgentServerAttributeTypeSchema,
						effect: GraphAgentServerScorerEffectSchema
					}),
					z.object({
						op: z.literal('is_true'),
						type: GraphAgentServerAttributeTypeSchema,
						effect: FlatSchema
					}),
					z.object({
						op: z.literal('string_equal'),
						type: GraphAgentServerAttributeTypeSchema,
						string: z.string(),
						effect: FlatSchema
					}),
					z.object({
						op: z.literal('string_not_equal'),
						type: GraphAgentServerAttributeTypeSchema,
						string: z.string(),
						effect: FlatSchema
					})
				])
			)
		}),
		z.object({ type: z.literal('default') })
	])
	.default({ type: 'default' });
export type GraphAgentServerScoring = z.infer<typeof GraphAgentServerScoringSchema>;

const RemoteRequestProvider = z.object({
	maxCost: z
		.discriminatedUnion('type', [
			z.object({ type: z.literal('coral'), amount: z.number() }),
			z.object({ type: z.literal('micro_coral'), amount: z.number().int() }),
			z.object({ type: z.literal('usd'), amount: z.number() })
		])
		.default({ type: 'micro_coral', amount: 1000 }),
	serverSource:
		// .discriminatedUnion('type', [
		// z.object({
		// 	type: z.literal(
		// 		'org.coralprotocol.coralserver.agent.graph.server.GraphAgentServerSource.Indexer'
		// 	),
		// 	indexer: z.string()
		// }),
		z
			.object({
				type: z.literal('servers'),
				servers: z.array(GraphAgentServerSchema)
			})
			// ])
			.default({ type: 'servers', servers: [] }),
	serverScoring: GraphAgentServerScoringSchema.optional()
});

export const ProviderSchema = z.object({
	remote_request: RemoteRequestProvider,
	runtime: RuntimeIdSchema
});

export type Provider = z.infer<typeof ProviderSchema>;
export type ProviderType = 'remote_request' | 'local';

export const AgentRegistryIdentifierSchema = z.object({
	name: z.string(),
	version: z.string()
});
export type AgentRegistryIdentifier = z.infer<typeof AgentRegistryIdentifierSchema>;

export const ToolTransport = z.discriminatedUnion('type', [
	z.object({ type: z.literal('http'), url: z.string().nonempty() })
]);

export const ToolSchema = z.record(z.string(), z.any());

export const CustomToolSchema = z.object({
	id: z.string().nonempty(),
	name: z.string(),
	transport: ToolTransport,
	schema: ToolSchema
});

export type CustomTool = z.output<typeof CustomToolSchema>;

const formSchema = z.object({
	sessionRuntimeSettings: z.object({
		ttl: z.number().min(10000).max(15778476000)
	}),
	tools: z.record(z.string().nonempty(), CustomToolSchema),
	agents: z.array(
		z.object({
			id: z.object({
				name: z.string().nonempty(),
				version: z.string().nonempty(),
				registrySourceId: z.discriminatedUnion('type', [
					z.object({ type: z.literal('linked'), linkedServerId: z.string() }),
					z.object({ type: z.literal('local') }),
					z.object({ type: z.literal('marketplace') })
				])
			}),
			name: z.string().nonempty(),
			description: z.string().optional(),
			provider: ProviderSchema,
			providerType: z.string(),
			systemPrompt: z.string().optional(),
			plugins: z.array(z.any()).optional(),
			customToolAccess: z.set(z.string()),
			blocking: z.boolean(),
			options: z
				.record(
					z.string(),
					z.discriminatedUnion('type', [
						z.object({ type: z.literal('number'), value: z.number() }),
						z.object({ type: z.literal('bool'), value: z.boolean() }),
						z.object({ type: z.literal('string'), value: z.string() }),
						z.object({ type: z.literal('secret'), value: z.string() }),

						z.object({ type: z.literal('blob'), value: z.file() }),
						z.object({
							type: z.literal('list[blob]'),
							value: z.array(z.file())
						}),

						z.object({
							type: z.literal('i8'),
							value: z.number().int().min(-128).max(127)
						}),
						z.object({
							type: z.literal('list[i8]'),
							value: z.array(z.number().int().min(-128).max(127))
						}),

						z.object({
							type: z.literal('i16'),
							value: z.number().int().min(-32768).max(32767)
						}),
						z.object({
							type: z.literal('list[i16]'),
							value: z.array(z.number().int().min(-32768).max(32767))
						}),

						z.object({
							type: z.literal('i32'),
							value: z.number().int().min(-2147483648).max(2147483647)
						}),
						z.object({
							type: z.literal('list[i32]'),
							value: z.array(z.number().int().min(-2147483648).max(2147483647))
						}),

						z.object({
							type: z.literal('i64'),
							value: z.string().refine(async (val) => {
								try {
									const n = BigInt(val);
									return n >= -9223372036854775808n && n <= 9223372036854775808n;
								} catch {
									return false;
								}
							})
						}),
						z.object({
							type: z.literal('list[i64]'),
							value: z.array(z.number())
						}),

						z.object({
							type: z.literal('u8'),
							value: z.number().int().min(0).max(255)
						}),
						z.object({
							type: z.literal('list[u8]'),
							value: z.array(z.number().int().min(0).max(255))
						}),

						z.object({
							type: z.literal('u16'),
							value: z.number().int().min(0).max(65535)
						}),
						z.object({
							type: z.literal('list[u16]'),
							value: z.array(z.number().int().min(0).max(65535))
						}),

						z.object({
							type: z.literal('u32'),
							value: z.number().int().min(0).max(4294967295)
						}),
						z.object({
							type: z.literal('list[u32]'),
							value: z.array(z.number().int().min(0).max(4294967295))
						}),

						z.object({
							type: z.literal('u64'),
							value: z
								.string()
								.refine(
									(val) => {
										try {
											BigInt(val);
											return true;
										} catch {
											return false;
										}
									},
									{ error: 'Not a number', abort: true }
								)
								.refine((val) => BigInt(val) < 18446744073709551615n, {
									error: 'Number cannot be greater than 18446744073709551615',
									abort: true
								})
								.refine((val) => BigInt(val) > 0, {
									error: 'Number cannot be less than 0',
									abort: true
								})
						}),
						z.object({
							type: z.literal('list[u64]'),
							value: z.array(z.number().min(0))
						}),

						z.object({ type: z.literal('f32'), value: z.number() }),
						z.object({ type: z.literal('list[f32]'), value: z.array(z.number()) }),

						z.object({ type: z.literal('f64'), value: z.number() }),
						z.object({ type: z.literal('list[f64]'), value: z.array(z.number()) }),

						z.object({ type: z.literal('list[string]'), value: z.array(z.string()) })
					])
				)
				.default({})
		})
	),
	groups: z.array(z.array(z.string()))
});
export type FormSchema = typeof formSchema;
