# Jarvis Platform v2 architecture

## Purpose

This layer is intended to grow GodMode into a single command center while keeping the existing provider-chat UI intact. The files here are modular foundations, not yet wired into the running Electron application.

## Components

- `openai-client.ts`: makes a text-only request to the OpenAI Responses API from the main process. It has no tools and never executes model output.
- `jarvis-model-gateway.ts`: adds correlation IDs and redacted lifecycle audit events around model calls.
- `jarvis-agent-registry.ts`: defines the allowed capabilities of built-in agent roles. An agent definition is not an executable process.
- `jarvis-task-registry.ts`: stores task metadata and task state. It does not execute tasks.
- `jarvis-audit-log.ts`: writes structured, redacted audit events without prompts or credential material.
- `SECURITY-REVIEW.md`: phased Electron hardening plan.

## Proposed control flow

```text
GodMode renderer
    |
    | narrow, typed preload API
    v
Electron IPC validation
    |
    v
Jarvis orchestrator
    |-- agent capability registry
    |-- task registry + approval queue
    |-- model gateway --> OpenAI Responses API
    |-- redacted audit log
    |
    v
future task adapters (allowlisted, individually tested)
```

## Required invariants

1. No API key in renderer, browser storage, or public GitHub.
2. No generic IPC endpoint that lets a renderer call arbitrary Node APIs.
3. No model-generated shell commands, scripts, URLs, or file operations are executed automatically.
4. The model can propose plans; deterministic application code enforces permissions.
5. Routine tasks must have narrow schemas, resource limits, cancellation, and a timeout.
6. Consequential actions require a fresh, explicit approval at the point of execution. Approval must include a summary of the exact action and target.
7. Audit logs must not contain prompts, tokens, personal data, or raw provider errors.
8. A worker must re-check permissions after restart; a persisted approval alone must not authorize a stale or changed action.
9. Do not enable remote phone access until authentication, device enrollment, rate limiting, TLS, and revocation are designed and tested.
10. Do not merge or ship until the local Windows working tree has been reviewed and builds/tests pass.

## Rollout

### Phase 1: foundations
Review the OpenAI client, task registry, agent catalog, audit logger, and CI checks. Fix lint/build/test failures.

### Phase 2: main-process integration
Create a narrowly typed IPC API for status, agent list, task list/create/approve/reject, and model requests. Validate the sender frame and every payload. Do not expose file-system or shell methods.

### Phase 3: CEO dashboard
Add a small dashboard for system health, agent capabilities, queued tasks, approvals, and audit history. Keep business modules separate and show errors honestly.

### Phase 4: read-only adapters
Add read-only workspace indexing and public research with source tracking, size limits, exclusions, and cancellation.

### Phase 5: controlled automation
Only after tests, add individual task workers. Start with harmless reversible tasks. Keep publish, deployment, messaging, credential changes, deletion, and financial actions disabled unless each has a reviewed approval flow.

## Validation status

GitHub edits are committed on `feature/jarvis-platform-v2`. They have not been built or run on the user's Windows machine. Do not describe this as deployed or fully integrated.
