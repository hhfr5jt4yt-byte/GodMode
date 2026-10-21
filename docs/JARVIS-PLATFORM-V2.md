# Jarvis Platform v2 architecture

## Purpose

This branch adds an initial Jarvis panel to the existing GodMode renderer and connects it to a small set of main-process services. It is an integration prototype, not yet a production-ready autonomous system.

## Components

- `openai-client.ts`: text-only requests through the OpenAI Responses API. It has no tools and never executes model output.
- `jarvis-model-gateway.ts`: correlation IDs and redacted model lifecycle events.
- `jarvis-agent-registry.ts`: capability descriptions for built-in agent roles; these are not independent running agents.
- `jarvis-task-registry.ts`: persistent task records and approval state transitions; no task worker is enabled.
- `jarvis-audit-log.ts`: structured, redacted audit events.
- `main.ts`: narrow IPC handlers, main-frame identity checks, and per-process model request rate limiting.
- `preload.ts` and `global.d.ts`: named renderer API and its TypeScript contract.
- `renderer/JarvisPanel.tsx`: first dashboard panel for OpenAI prompts, agent roles, task creation, and approvals.

## Control flow

```text
GodMode renderer / Jarvis panel
    |
    | named methods only through preload bridge
    v
Electron IPC main-frame check + payload validation
    |
    v
Jarvis services
    |-- capability catalog
    |-- persistent task queue + approval states
    |-- audited model gateway --> OpenAI Responses API
    |-- redacted audit log
    |
    v
No task execution worker is enabled
```

## Required invariants

1. No API key in renderer code, browser storage, logs, or public GitHub.
2. No new generic IPC endpoint that lets the renderer call arbitrary Node APIs.
3. No model-generated shell commands, scripts, URLs, or file operations execute automatically.
4. Model output is untrusted content; deterministic application code must enforce permissions.
5. Routine tasks require narrow schemas, resource limits, cancellation, and timeouts before a worker is added.
6. Consequential actions need fresh approval for the exact target and operation at execution time.
7. Audit logs must not contain prompts, tokens, personal data, or raw provider errors.
8. A persisted approval must not authorize stale or modified actions after restart.
9. Do not enable phone/remote access until authentication, device enrollment, rate limiting, TLS, and revocation are designed and tested.
10. Existing legacy renderer settings (`nodeIntegration: true`, embedded webviews) remain a security risk and require a separate compatibility-tested migration.
11. Keep user settings and local task data outside the repository; never reset persistent settings on every startup.
12. Do not merge or ship until build, lint, tests, and manual Windows regression checks pass.

## Rollout

### Phase 1: foundations and IPC

The main-process bridge, task registry, audit logger, model gateway, and first panel are now present on this feature branch. Validate them in CI and on Windows before merging.

### Phase 2: CEO dashboard

Improve navigation, task detail views, system health, and error reporting. Keep existing provider chat available and avoid replacing it wholesale.

### Phase 3: read-only adapters

Add read-only workspace indexing and public research with source tracking, exclusions, size limits, and cancellation. Do not permit arbitrary file paths or shell execution from model output.

### Phase 4: controlled automation

Add individually tested workers only for narrow, reversible tasks. Keep publishing, deployment, messaging, credential changes, deletion, and financial actions disabled unless each has a reviewed approval flow.

### Phase 5: remote/phone access

Treat remote access as a separate security project: authenticated device enrollment, short-lived sessions, revocation, encrypted transport, rate limits, and explicit permissions.

## Validation status

Changes are on `feature/jarvis-platform-v2` and have not been built or run on the user's local Windows installation. Do not describe the branch as deployed or verified until CI and local checks pass.
