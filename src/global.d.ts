export {};

declare global {
	interface Window {
		jarvis: {
			getStatus(): Promise<{
				ready: boolean;
				modelConfigured: boolean;
				taskCount: number;
			}>;
			listAgents(): Promise<
				Array<{
					id: string;
					name: string;
					description: string;
					capabilities: string[];
					enabled: boolean;
					requiresApprovalFor: string[];
				}>
			>;
			listTasks(limit?: number): Promise<
				Array<{
					id: string;
					type: string;
					title: string;
					payload: Record<string, unknown>;
					status: string;
					createdAt: string;
					updatedAt: string;
					approvedAt?: string;
					rejectedAt?: string;
				}>
			>;
			createTask(input: {
				type: string;
				title: string;
				payload?: Record<string, unknown>;
			}): Promise<{
				id: string;
				type: string;
				title: string;
				payload: Record<string, unknown>;
				status: string;
				createdAt: string;
				updatedAt: string;
			}>;
			approveTask(id: string): Promise<unknown>;
			rejectTask(id: string): Promise<unknown>;
			askOpenAI(prompt: string): Promise<{
				text: string;
				correlationId: string;
				model: string;
			}>;
		};
	}
}
