# OpenAI / Jarvis Core integration notes

## What is now included on the feature branch

- `src/main/openai-client.ts`: server-side text requests through the OpenAI Responses API.
- `src/main/jarvis-model-gateway.ts`: correlation IDs and redacted model lifecycle events.
- `src/main/jarvis-agent-registry.ts`: built-in agent capability catalog.
- `src/main/jarvis-task-registry.ts`: persistent task registry, validation, audit records, and approval state transitions.
- `src/main/jarvis-audit-log.ts`: structured, redacted audit logger.
- `src/main/main.ts`: narrow Jarvis IPC handlers with main-frame checks and model request rate limiting.
- `src/main/preload.ts`: named Jarvis methods exposed through the preload bridge.
- `src/global.d.ts`: renderer types for the bridge.
- `src/renderer/JarvisPanel.tsx` and `src/renderer/layout.tsx`: an initial dashboard panel for model requests, agent roles, task creation, and approvals.
- `src/main/jarvis-task-registry.test.ts`: tests for queueing, approval, persistence, and validation.
- `docs/SECURITY-REVIEW.md`: prioritized Electron hardening checklist.

The UI is wired to the new IPC methods in the feature branch, but the change has not been built or run on the user's local Windows installation. There is no task execution worker. Approving a task only records a state change.

## Configure locally

Set these variables in the environment that launches Electron:

- `OPENAI_API_KEY`: your secret OpenAI Platform API key.
- `OPENAI_MODEL`: required; set it to a model ID available to your OpenAI Platform project.

Never paste a key into source code, commit it to GitHub, expose it to a renderer/webview, or include it in logs. Use a dedicated project key and configure usage limits/alerts in OpenAI Platform. API usage is billed separately from a ChatGPT subscription.

For a temporary PowerShell session, set the variables before starting the app. Do not put the actual key into a script that you commit or share:

```powershell
$env:OPENAI_API_KEY = Read-Host "Enter your OpenAI Platform API key"
$env:OPENAI_MODEL = Read-Host "Enter a model ID enabled for your API project"
npm run start:main
```

These environment variables are inherited by the app launched from that same PowerShell session. Close the terminal to discard the temporary variables.

## Security boundaries

1. OpenAI calls originate in Electron's main process. The key is not returned to the renderer.
2. Jarvis IPC checks that the caller is the main window's main frame and validates payload sizes and types.
3. Model requests are serialized and rate-limited to 10 requests per rolling minute per app process.
4. The model receives no shell, filesystem, or automatic tool execution capability.
5. The existing Electron renderer still has legacy security settings (`nodeIntegration: true` and webviews). The new IPC bridge does not eliminate those legacy risks. Follow the phased migration in `docs/SECURITY-REVIEW.md` before production use.
6. Local task data and audit logs are written under Electron's user-data directory, not into the Git repository.

## Data handling

Requests set `store: false`. This is a request setting, not a promise that all processing or retention is impossible; review current OpenAI data controls for your account and send only data you are authorized to share.

## Validation status

The feature branch has not been validated against the user's local Windows working tree. Review the branch, check CI results, and run build/lint/tests before merging. Do not overwrite local modifications.
