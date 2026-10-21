# OpenAI / Jarvis Core integration notes

## What this change provides

`src/main/openai-client.ts` is a server-side helper for making a text request through the OpenAI Responses API. It is intended for the Electron main process, not renderer/browser code. It does not automatically wire a UI, read files, run shell commands, browse the web, deploy code, or operate other systems.

## Configure locally

Set these variables in the environment that launches Electron:

- `OPENAI_API_KEY`: your secret OpenAI Platform API key.
- `OPENAI_MODEL`: optional model override; the helper defaults to `gpt-6-luna`.

Never paste a key into source code, commit it to GitHub, expose it to a renderer/webview, or include it in logs. Keep a separate project key for this application and set usage limits/alerts in OpenAI Platform. API usage is billed separately from a ChatGPT subscription.

## Safe integration sequence

1. Call `askOpenAI` only from Electron main-process code.
2. Add a narrow IPC handler that validates message size and sender origin before forwarding a user prompt.
3. Keep IPC permissions allowlisted; do not expose arbitrary filesystem, shell, or network functions to model output.
4. Add a task registry and audit log. Routine, reversible tasks can be allowlisted; actions such as sending messages, publishing, deploying, changing credentials, or spending money must stop for explicit human approval.
5. Add tests and wire one feature at a time. Do not replace the existing app entry point or webview behavior without inspecting the current local working tree first.

## Data handling

The request sets `store: false`. This is a request setting, not a promise that all processing or retention is impossible; review current OpenAI data controls for your account and use only data you are authorized to send.
