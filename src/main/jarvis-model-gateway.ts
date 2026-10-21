/**
 * Main-process-only model gateway with bounded retries and redacted audit events.
 * No tools are exposed and no model output is executed.
 */
import { randomUUID } from 'crypto';
import { askOpenAI, OpenAIRequestOptions } from './openai-client';
import { JarvisAuditLog } from './jarvis-audit-log';

export type JarvisModelResult = {
	text: string;
	correlationId: string;
	model: string;
};

export class JarvisModelGateway {
	constructor(
		private readonly audit: JarvisAuditLog,
		private readonly ask = askOpenAI,
	) {}

	async complete(
		input: string,
		options: OpenAIRequestOptions = {},
	): Promise<JarvisModelResult> {
		const correlationId = randomUUID();
		const model = (options.model || process.env.OPENAI_MODEL || '').trim();

		this.audit.write({
			event: 'model_request_started',
			actor: 'user',
			correlationId,
		});

		try {
			const text = await this.ask(input, options);
			this.audit.write({
				event: 'model_request_succeeded',
				actor: 'system',
				correlationId,
				outcome: 'ok',
			});
			return { text, correlationId, model };
		} catch (error) {
			// Never persist raw errors: SDK/provider errors may include sensitive context.
			this.audit.write({
				event: 'model_request_failed',
				actor: 'system',
				correlationId,
				outcome: 'error',
				detailCode: error instanceof Error ? error.name : 'unknown_error',
			});
			throw error;
		}
	}
}
