/**
 * Server-side OpenAI Responses API helper for Electron's main process.
 *
 * Security:
 * - Import this only from main-process code.
 * - Never expose OPENAI_API_KEY to a renderer, webview, or browser.
 * - This helper returns text only; it does not execute model-suggested actions.
 */
type OpenAIResponse = {
	output_text?: string;
	output?: Array<{
		type?: string;
		content?: Array<{ type?: string; text?: string }>;
	}>;
	error?: { message?: string };
};

export type OpenAIRequestOptions = {
	model?: string;
	timeoutMs?: number;
};

export async function askOpenAI(
	input: string,
	options: OpenAIRequestOptions = {},
): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error(
			'OPENAI_API_KEY is not configured for the Electron main process.',
		);
	}

	const model = (options.model || process.env.OPENAI_MODEL || '').trim();
	if (!model) {
		throw new Error(
			'OPENAI_MODEL is not configured. Set it to a model available to your OpenAI Platform project.',
		);
	}

	if (typeof input !== 'string') throw new Error('Input must be a string.');
	const trimmedInput = input.trim();
	if (!trimmedInput) throw new Error('Input cannot be empty.');
	if (trimmedInput.length > 40_000) {
		throw new Error('Input is too long (maximum 40,000 characters).');
	}

	const requestedTimeout = Number.isFinite(options.timeoutMs)
		? options.timeoutMs!
		: 45_000;
	const timeoutMs = Math.min(Math.max(requestedTimeout, 1_000), 120_000);
	const response = await fetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			input: trimmedInput,
			store: false,
		}),
		signal: AbortSignal.timeout(timeoutMs),
	});

	if (!response.ok) {
		// Do not include provider response bodies in logs; keep errors non-sensitive.
		throw new Error(`OpenAI request failed with HTTP ${response.status}.`);
	}

	const data = (await response.json()) as OpenAIResponse;
	if (data.error?.message) {
		throw new Error(
			'OpenAI returned an API error. Check model access and Platform settings.',
		);
	}
	if (typeof data.output_text === 'string' && data.output_text.trim()) {
		return data.output_text.trim();
	}

	const text = (data.output ?? [])
		.flatMap((item) => item.content ?? [])
		.filter(
			(item) => item.type === 'output_text' && typeof item.text === 'string',
		)
		.map((item) => item.text as string)
		.join('\n')
		.trim();

	if (!text) throw new Error('OpenAI returned no text output.');
	return text;
}
