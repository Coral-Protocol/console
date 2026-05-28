import type { Template } from '../routes/(app)/workbench/templates/TemplateV1';
import type { CreateSessionRequest } from '$lib/sessionSchema/types';

const qotdPayload: CreateSessionRequest = {
	agentGraphRequest: {
		agents: [
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'theme-curator',
				description: 'Selects a compelling daily theme for the quote',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '3'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'initiator'
					}
				},
				systemPrompt:
					'You are "theme-curator" in a Quote of the Day system.\n\nPick an interesting, specific theme (e.g. "the courage to begin again", "finding humor in failure"). Then:\n1. Create a thread called "qotd" with participants: theme-curator, quote-researcher, quote-presenter\n2. Send your theme on that thread, mentioning quote-researcher\n3. Wait for the final presentation',
				customToolAccess: [],
				plugins: [],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			},
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'quote-researcher',
				description: 'Finds and proposes quotes matching the theme',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '3'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'responder'
					}
				},
				systemPrompt:
					'You are "quote-researcher" in a Quote of the Day system.\n\nYou must wait for theme-curator to mention you before doing anything.\nDo NOT create threads. Do NOT send messages until you receive a mention.\nYour first action must be to wait for a mention.\n\nAfter you receive a mention with a theme:\n1. Find 3 real, well-attributed quotes from notable figures matching the theme\n2. Send them on the SAME thread you were mentioned in, mentioning quote-presenter',
				customToolAccess: [],
				plugins: [],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			},
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'quote-presenter',
				description:
					'Selects the best quote, formats the final presentation, and closes the session',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '3'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'responder'
					}
				},
				systemPrompt:
					'You are "quote-presenter" in a Quote of the Day system.\n\nYou must wait for quote-researcher to mention you before doing anything.\nDo NOT create threads. Do NOT send messages until you receive a mention.\nYour first action must be to wait for a mention.\n\nAfter you receive a mention with candidate quotes:\n1. Pick the best quote and present it beautifully with author, why it matters, and a reflection prompt\n2. Send it on the SAME thread you were mentioned in, mentioning theme-curator\n3. Call the coral_close_session tool to end the entire session. This is critical — use coral_close_session, NOT coral_close_thread.',
				customToolAccess: [],
				plugins: [
					{
						type: 'close_session_tool'
					}
				],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			}
		],
		groups: [['theme-curator', 'quote-researcher', 'quote-presenter']],
		customTools: {}
	},
	namespaceProvider: {
		type: 'create_if_not_exists',
		namespaceRequest: {
			name: 'default',
			deleteOnLastSessionExit: true,
			annotations: {}
		}
	},
	execution: {
		mode: 'immediate',
		runtimeSettings: {
			ttl: 300000,
			extendedEndReport: true,
			persistenceMode: {
				mode: 'hold_after_exit',
				duration: 300000
			},
			webhooks: {}
		}
	},
	annotations: {
		template: 'qotd',
		templateVersion: '1.0.0'
	}
} as CreateSessionRequest;

const qotdVotePayload: CreateSessionRequest = {
	agentGraphRequest: {
		agents: [
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'theme-picker',
				description: 'Picks a theme and votes on quotes',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '10'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'initiator'
					}
				},
				systemPrompt:
					'You are "theme-picker" in a Quote of the Day voting system with 4 agents:\ntheme-picker, quote-finder, vote-coordinator, presenter.\n\nPART 1 — Pick a theme:\n1. Create a thread called "qotd-vote" with participants: theme-picker, quote-finder, vote-coordinator, presenter\n2. Pick an interesting, specific theme (e.g. "the courage to begin again", "finding humor in failure")\n3. Send your theme on that thread, mentioning quote-finder\n4. Wait for a mention (vote-coordinator will ask you to vote)\n\nPART 2 — Vote (each time vote-coordinator asks):\n1. Pick your favorite quote (by number) and explain briefly why in 1-2 sentences\n2. Send your vote on the same thread, mentioning vote-coordinator\n3. Wait for the next mention',
				customToolAccess: [],
				plugins: [],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			},
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'quote-finder',
				description: 'Finds 5 candidate quotes matching the theme',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '10'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'responder'
					}
				},
				systemPrompt:
					'You are "quote-finder" in a Quote of the Day voting system.\n\nYou must wait for a mention before doing anything.\nDo NOT create threads. Do NOT send messages until you receive a mention.\nYour first action must be to wait for a mention.\n\nFIRST TIME — when theme-picker mentions you with a theme:\n1. Find 5 real, well-attributed quotes from notable figures matching the theme\n2. Number them 1 through 5, with author and brief context for each\n3. Send them on the SAME thread, mentioning vote-coordinator\n\nVOTING — when vote-coordinator asks you to vote:\n1. Pick your favorite quote (by number) and explain briefly why in 1-2 sentences\n2. Send your vote on the same thread, mentioning vote-coordinator\n3. Wait for the next mention\n\nIF ASKED TO REPLACE A QUOTE — when vote-coordinator asks you to swap out a specific quote:\n1. Find a new replacement quote matching the theme (different from all previous ones)\n2. Send the updated list on the same thread, mentioning vote-coordinator',
				customToolAccess: [],
				plugins: [],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			},
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'vote-coordinator',
				description: 'Collects votes from agents and tallies the result',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '10'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'responder'
					}
				},
				systemPrompt:
					'You are "vote-coordinator" in a Quote of the Day voting system.\n\nYou must wait for quote-finder to mention you before doing anything.\nDo NOT create threads. Do NOT send messages until you receive a mention.\nYour first action must be to wait for a mention.\n\nAfter you receive numbered quotes from quote-finder:\n1. Re-post the 5 quotes as a numbered list\n2. Ask ALL other agents to vote: mention theme-picker, quote-finder, AND presenter\n3. Wait for 3 votes (call coral_wait_for_mention three times)\n4. Tally the votes:\n   - If a quote has a majority (2+ votes), that\'s the winner\n   - If NO majority (all different votes): ask quote-finder to replace the least-voted quote, then run another vote round (go back to step 1 with updated quotes)\n5. Once there\'s a winner, announce it and mention presenter to present it\n\nYou also cast your own vote when tallying — you are the 4th voter and tiebreaker.\nMaximum 2 voting rounds. If still no majority after round 2, pick the quote with the most votes yourself.',
				customToolAccess: [],
				plugins: [],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			},
			{
				id: {
					name: 'coral-template-agent',
					version: '1.0.0',
					registrySourceId: {
						type: 'local'
					}
				},
				name: 'presenter',
				description: 'Votes on quotes and presents the winning quote',
				options: {
					MODEL_API_KEY: {
						type: 'string',
						value: ''
					},
					MODEL_PROVIDER: {
						type: 'string',
						value: 'openai'
					},
					MODEL_NAME: {
						type: 'string',
						value: 'gpt-5-mini'
					},
					MAX_ITERATIONS: {
						type: 'string',
						value: '10'
					},
					AGENT_MODE: {
						type: 'string',
						value: 'responder'
					}
				},
				systemPrompt:
					'You are "presenter" in a Quote of the Day voting system.\n\nYou must wait for a mention before doing anything.\nDo NOT create threads. Do NOT send messages until you receive a mention.\nYour first action must be to wait for a mention.\n\nVOTING — when vote-coordinator asks you to vote:\n1. Pick your favorite quote (by number) and explain briefly why in 1-2 sentences\n2. Send your vote on the same thread, mentioning vote-coordinator\n3. Wait for the next mention\n\nPRESENTING — when vote-coordinator announces the winning quote:\n1. Present the winning quote beautifully: the quote, author, why it matters, and a reflection prompt\n2. Send the presentation on the same thread, mentioning theme-picker\n3. Call the coral_close_session tool to end the session. This is critical — use coral_close_session, NOT coral_close_thread.',
				customToolAccess: [],
				plugins: [
					{
						type: 'close_session_tool'
					}
				],
				provider: {
					type: 'local',
					runtime: 'executable'
				},
				x402Budgets: [],
				annotations: {}
			}
		],
		groups: [['theme-picker', 'quote-finder', 'vote-coordinator', 'presenter']],
		customTools: {}
	},
	namespaceProvider: {
		type: 'create_if_not_exists',
		namespaceRequest: {
			name: 'default',
			deleteOnLastSessionExit: true,
			annotations: {}
		}
	},
	execution: {
		mode: 'immediate',
		runtimeSettings: {
			ttl: 300000,
			extendedEndReport: true,
			persistenceMode: {
				mode: 'hold_after_exit',
				duration: 300000
			},
			webhooks: {}
		}
	},
	annotations: {
		template: 'qotd-vote',
		templateVersion: '1.0.0'
	}
} as CreateSessionRequest;

export const bundledTemplates: Template[] = [
	{
		name: 'qotd',
		description:
			'Three AI agents collaborate to select a theme, research matching quotes, and present the best one.',
		version: 1,
		updated: Date.now(),
		trusted: true,
		payload: { version: 1, data: JSON.stringify(qotdPayload) }
	},
	{
		name: 'qotd-vote',
		description: 'Four AI agents collaborate with a voting round to select the best quote.',
		version: 1,
		updated: Date.now(),
		trusted: true,
		payload: { version: 1, data: JSON.stringify(qotdVotePayload) }
	}
];
