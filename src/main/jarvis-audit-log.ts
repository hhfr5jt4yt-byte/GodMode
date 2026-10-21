/**
 * Minimal redacted audit logger for main-process Jarvis components.
 *
 * Do not log prompts, source files, API responses, credentials, or personal data.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type AuditEventName =
  | "agent_registered"
  | "task_created"
  | "task_approved"
  | "task_rejected"
  | "model_request_started"
  | "model_request_succeeded"
  | "model_request_failed"
  | "security_validation_failed";

export type AuditEvent = {
  id: string;
  at: string;
  event: AuditEventName;
  actor: "user" | "system";
  correlationId?: string;
  taskId?: string;
  agentId?: string;
  outcome?: "ok" | "blocked" | "error";
  detailCode?: string;
};

const SAFE_CODE = /^[a-z0-9_.-]{1,80}$/i;

export class JarvisAuditLog {
  constructor(private readonly dataDirectory: string) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  write(event: Omit<AuditEvent, "id" | "at">): void {
    const safe: AuditEvent = {
      id: randomUUID(),
      at: new Date().toISOString(),
      event: event.event,
      actor: event.actor,
      ...(event.correlationId && SAFE_CODE.test(event.correlationId)
        ? { correlationId: event.correlationId }
        : {}),
      ...(event.taskId && SAFE_CODE.test(event.taskId) ? { taskId: event.taskId } : {}),
      ...(event.agentId && SAFE_CODE.test(event.agentId) ? { agentId: event.agentId } : {}),
      ...(event.outcome ? { outcome: event.outcome } : {}),
      ...(event.detailCode && SAFE_CODE.test(event.detailCode)
        ? { detailCode: event.detailCode }
        : {}),
    };

    fs.appendFileSync(
      path.join(this.dataDirectory, "audit-events.jsonl"),
      `${JSON.stringify(safe)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }
}
