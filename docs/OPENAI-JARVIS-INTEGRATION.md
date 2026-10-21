# OpenAI / Jarvis Core integration notes

## What this change provides

- `src/main/openai-client.ts`: server-side text requests through the OpenAI Responses API.
- `src/main/jarvis-task-registry.ts`: a local persistent task registry, audit log, task-type allowlist, and approval state transitions.
- `src/main/jarvis-task-registry.test.ts`: tests for queueing, approval, persistence, and validation.
- `docs/SECURITY-REVIEW.md`: prioritized Electron security review and migration checklist.

These pieces are not yet wired into the app UI or an execution worker. The registry deliberately does not execute tasks.

## Configure locally

Set these variables in the environment that launches Electron:

- `OPENAI_API_KEY`: your secret OpenAI Platform API key.
- `OPENAI_MODEL`: required; set it to a model ID available to your OpenAI Platform project.

Never paste a key into source code, commit it to GitHub, expose it to a renderer/webview, or include it in logs. Use a dedicated project key and configure usage limits/alerts in OpenAI Platform. API usage is billed separately from a ChatGPT subscription.

## Safe integration sequence

1. Call `askOpenAI` only from Electron main-process code.
2. Add a narrow IPC handler that validates sender frame/origin, message size, and payload shape before forwarding a user prompt.
3. Expose only the required method through preload; do not expose arbitrary IPC channels.
4. Connect the task registry to a local data directory under the user's application data path.
5. Let only explicit allowlisted routine tasks enter a future worker. Approval does not mean an action has executed.
6. Require explicit human approval for sending messages, publishing, deploying, changing credentials, deleting data, or spending money.
7. Test and wire one feature at a time. Do not replace the existing app entry point or webview behavior without inspecting local modifications first.

## Data handling

Requests set `store: false`. This is a request setting, not a promise that all processing or retention is impossible; review current OpenAI data controls for your account and send only data you are authorized to share.

## Validation status

No build or tests have been run against the user's local Windows project by these GitHub edits. Review the branch and run the project's checks before merging.
