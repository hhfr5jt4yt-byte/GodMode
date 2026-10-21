/**
 * Jarvis agent catalog.
 *
 * Agents are capability declarations, not autonomous processes. This registry
 * never launches shell commands or gives agents unrestricted filesystem access.
 * A future dispatcher must enforce each capability server-side.
 */
export type AgentCapability =
	| 'research'
	| 'summarize'
	| 'code_review'
	| 'workspace_index'
	| 'security_review'
	| 'business_analysis';

export type AgentDefinition = {
	id: string;
	name: string;
	description: string;
	capabilities: AgentCapability[];
	enabled: boolean;
	requiresApprovalFor: string[];
};

const BUILT_IN_AGENTS: AgentDefinition[] = [
	{
		id: 'jarvis-orchestrator',
		name: 'Jarvis Orchestrator',
		description: 'Breaks a user goal into reviewable, bounded work items.',
		capabilities: ['summarize'],
		enabled: true,
		requiresApprovalFor: [
			'external_side_effect',
			'filesystem_write',
			'shell',
			'publish',
		],
	},
	{
		id: 'research-analyst',
		name: 'Research Analyst',
		description:
			'Organizes supplied or authorized public information into sourced findings.',
		capabilities: ['research', 'summarize', 'business_analysis'],
		enabled: true,
		requiresApprovalFor: ['external_side_effect', 'private_data_transfer'],
	},
	{
		id: 'code-reviewer',
		name: 'Code Reviewer',
		description:
			'Reviews supplied source code and proposes changes without applying them.',
		capabilities: ['code_review', 'security_review', 'summarize'],
		enabled: true,
		requiresApprovalFor: ['filesystem_write', 'shell', 'commit', 'publish'],
	},
	{
		id: 'workspace-indexer',
		name: 'Workspace Indexer',
		description:
			'Plans a read-only workspace index; file access must be provided by a separately authorized adapter.',
		capabilities: ['workspace_index'],
		enabled: false,
		requiresApprovalFor: ['filesystem_write', 'external_side_effect'],
	},
];

export class JarvisAgentRegistry {
	private readonly agents = new Map<string, AgentDefinition>();

	constructor() {
		for (const agent of BUILT_IN_AGENTS) {
			this.agents.set(agent.id, {
				...agent,
				capabilities: [...agent.capabilities],
				requiresApprovalFor: [...agent.requiresApprovalFor],
			});
		}
	}

	list(): AgentDefinition[] {
		return [...this.agents.values()].map((agent) => ({
			...agent,
			capabilities: [...agent.capabilities],
			requiresApprovalFor: [...agent.requiresApprovalFor],
		}));
	}

	get(id: string): AgentDefinition | undefined {
		const agent = this.agents.get(id);
		return agent
			? {
					...agent,
					capabilities: [...agent.capabilities],
					requiresApprovalFor: [...agent.requiresApprovalFor],
				}
			: undefined;
	}

	canHandle(agentId: string, capability: AgentCapability): boolean {
		const agent = this.agents.get(agentId);
		return Boolean(agent?.enabled && agent.capabilities.includes(capability));
	}
}
