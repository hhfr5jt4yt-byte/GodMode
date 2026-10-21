/**
 * Server-side OpenAI Responses API helper for Electron's main process.
 *
 * Security rules:
 * - Never import this from renderer/browser code.
 * - Keep OPENAI_API_KEY in the process environment; never commit it.
 * - This helper only sends a model request. It does not execute tools or shell commands.
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
    throw new Error("OPENAI_API_KEY is not configured for the Electron main process.");
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) throw new Error("Input cannot be empty.");
  if (trimmedInput.length > 40_000) {
    throw new Error("Input is too long (maximum 40,000 characters).");
  }

  const model = options.model || process.env.OPENAI_MODEL || "gpt-6-luna";
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 45_000, 1_000), 120_000);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: trimmedInput,
      store: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    // Avoid echoing request headers or the API key into logs/errors.
    const safeBody = (await response.text()).slice(0, 500);
    throw new Error(`OpenAI request failed (HTTP ${response.status}): ${safeBody}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  if (data.error?.message) throw new Error(data.error.message);
  if (typeof data.output_text === "string") return data.output_text;

  const text = (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("\n")
    .trim();

  if (!text) throw new Error("OpenAI returned no text output.");
  return text;
}
