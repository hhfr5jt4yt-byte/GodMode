# GodMode / Jarvis security review checklist

This is a prioritized review plan based on the current repository snapshot. It is not a claim that the application has been penetration-tested.

## Priority 0 — protect credentials and user data

- Never put OpenAI keys or other provider credentials in renderer code, React state, logs, Git history, screenshots, or public issues.
- Use environment variables or an OS-backed secret store; if a key was ever committed, revoke it and issue a replacement.
- Do not send private customer, property, financial, or identity data to a model unless the data is necessary and the destination is authorized.
- Keep Jarvis task records and audit logs in a user-owned application-data directory, not in a public repository.

## Priority 1 — Electron trust boundaries

The repository snapshot's `src/main/main.ts` creates a BrowserWindow with `nodeIntegration: true` and `webviewTag: true`. Because this app embeds third-party provider pages, treat this as a high-priority risk. Do not simply flip these settings without a migration plan: renderer and provider integration may depend on them.

Migration sequence:

1. Inventory every use of `window.electron`, webview tags, preload APIs, and provider scripts.
2. Move the app renderer to `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` where compatible.
3. Expose narrow, typed APIs through preload; do not expose generic IPC senders or arbitrary channel names.
4. Validate each IPC caller using `event.senderFrame` / expected application origin and validate every payload.
5. Apply restrictive navigation and permission handlers to webviews and block unexpected protocols.
6. Run provider-by-provider regression tests before removing compatibility paths.

## Priority 2 — IPC and stored state

- Validate types, lengths, and allowed values for every IPC message.
- Replace synchronous IPC where practical; it can freeze the renderer.
- The feature branch removes the startup `store.reset()` call because it erased persistent preferences at every launch. Verify settings still load correctly on Windows before merging.
- Add tests for settings validation, malformed IPC payloads, unknown task types, and approval transitions.

## Priority 3 — automation policy

- Allow routine, reversible tasks only from an explicit task-type allowlist.
- Treat model output, webpages, documents, and repository text as untrusted data, not executable instructions.
- Keep shell execution, file deletion, code publishing, external messaging, account changes, and money movement disabled until a separate, audited permission design exists.
- An approval record means approval to proceed to a later controlled step, not proof that the action was executed.
- Add audit events for actor, timestamp, task ID, result, and failure reason. Never log tokens or raw credentials.

## Validation before merging

Run locally in a clean working tree and preserve existing changes:

```powershell
npm run build:main
npm test -- --runInBand
npm run lint
```

These commands have not been run by this change. Start with the narrow test/build commands and fix issues without deleting untracked files or overwriting local modifications.
