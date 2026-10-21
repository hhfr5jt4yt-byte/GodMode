/**
 * Jarvis task registry: records work and gates consequential actions.
 *
 * This module deliberately does NOT execute tasks. A future worker must consume
 * only explicitly allowlisted routine task types and re-check authorization
 * immediately before any consequential side effect.
 */
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export type JarvisTaskType =
  | "research"
  | "summarize"
  | "code_review"
  | "index_workspace"
  | "send_message"
  | "publish"
  | "deploy"
  | "credential_change"
  | "money_movement";

export type JarvisTaskStatus =
  | "queued"
  | "awaiting_approval"
  | "approved_not_executed"
  | "rejected"
  | "completed"
  | "failed";

export type JarvisTask = {
  id: string;
  type: JarvisTaskType;
  title: string;
  payload: Record<string, unknown>;
  status: JarvisTaskStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

const ROUTINE_TYPES = new Set<JarvisTaskType>([
  "research",
  "summarize",
  "code_review",
  "index_workspace",
]);

const TASK_TYPES = new Set<JarvisTaskType>([
  ...ROUTINE_TYPES,
  "send_message",
  "publish",
  "deploy",
  "credential_change",
  "money_movement",
]);

const TASK_STATUSES = new Set<JarvisTaskStatus>([
  "queued",
  "awaiting_approval",
  "approved_not_executed",
  "rejected",
  "completed",
  "failed",
]);

const MAX_TITLE = 160;
const MAX_PAYLOAD_BYTES = 32_000;

function safeJsonBytes(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string") {
      throw new Error("Task payload must be JSON-serializable.");
    }
    return Buffer.byteLength(serialized, "utf8");
  } catch {
    throw new Error("Task payload must be JSON-serializable.");
  }
}

export class JarvisTaskRegistry {
  private readonly tasks = new Map<string, JarvisTask>();

  constructor(
    private readonly dataDirectory: string,
    private readonly maxTasks = 2_000,
  ) {
    if (!Number.isInteger(maxTasks) || maxTasks < 1) {
      throw new Error("maxTasks must be a positive integer.");
    }
    fs.mkdirSync(dataDirectory, { recursive: true });
    this.load();
  }

  list(limit = 100): JarvisTask[] {
    const requested = Number.isFinite(limit) ? Math.floor(limit) : 100;
    const boundedLimit = Math.max(1, Math.min(requested, 500));
    return [...this.tasks.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, boundedLimit)
      .map((task) => ({ ...task, payload: { ...task.payload } }));
  }

  get(id: string): JarvisTask | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task, payload: { ...task.payload } } : undefined;
  }

  create(input: {
    type: JarvisTaskType;
    title: string;
    payload?: Record<string, unknown>;
  }): JarvisTask {
    if (!input || !TASK_TYPES.has(input.type)) throw new Error("Unsupported task type.");
    if (typeof input.title !== "string" || !input.title.trim()) {
      throw new Error("Task title is required.");
    }
    const title = input.title.trim();
    if (title.length > MAX_TITLE) throw new Error("Task title is too long.");

    const payload = input.payload ?? {};
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Task payload must be a JSON object.");
    }
    if (safeJsonBytes(payload) > MAX_PAYLOAD_BYTES) {
      throw new Error("Task payload exceeds 32 KB.");
    }
    if (this.tasks.size >= this.maxTasks) {
      throw new Error("Task registry is full; archive tasks before adding more.");
    }

    const now = new Date().toISOString();
    const task: JarvisTask = {
      id: randomUUID(),
      type: input.type,
      title,
      payload,
      status: ROUTINE_TYPES.has(input.type) ? "queued" : "awaiting_approval",
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    this.audit("task_created", task);
    this.save();
    return { ...task, payload: { ...task.payload } };
  }

  approve(id: string): JarvisTask {
    const task = this.requireTask(id);
    if (task.status !== "awaiting_approval") {
      throw new Error("Only tasks awaiting approval can be approved.");
    }
    task.status = "approved_not_executed";
    task.approvedAt = new Date().toISOString();
    task.updatedAt = task.approvedAt;
    this.audit("task_approved_not_executed", task);
    this.save();
    return { ...task, payload: { ...task.payload } };
  }

  reject(id: string): JarvisTask {
    const task = this.requireTask(id);
    if (task.status !== "awaiting_approval") {
      throw new Error("Only tasks awaiting approval can be rejected.");
    }
    task.status = "rejected";
    task.rejectedAt = new Date().toISOString();
    task.updatedAt = task.rejectedAt;
    this.audit("task_rejected", task);
    this.save();
    return { ...task, payload: { ...task.payload } };
  }

  private requireTask(id: string): JarvisTask {
    const task = this.tasks.get(id);
    if (typeof id !== "string" || !id) throw new Error("Task ID is required.");
    const taskValue = this.tasks.get(id);
    if (!taskValue) throw new Error("Task not found.");
    return taskValue;
  }

  private get tasksFile(): string {
    return path.join(this.dataDirectory, "tasks.json");
  }

  private get auditFile(): string {
    return path.join(this.dataDirectory, "audit.jsonl");
  }

  private load(): void {
    if (!fs.existsSync(this.tasksFile)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(this.tasksFile, "utf8"));
    } catch {
      throw new Error("Task registry file is invalid JSON; preserve it and inspect before recovery.");
    }
    if (!Array.isArray(parsed)) throw new Error("Invalid task registry file.");
    for (const item of parsed) {
      if (
        item &&
        typeof item.id === "string" &&
        TASK_TYPES.has(item.type) &&
        typeof item.title === "string" &&
        TASK_STATUSES.has(item.status) &&
        item.payload &&
        typeof item.payload === "object" &&
        !Array.isArray(item.payload) &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string"
      ) {
        if (this.tasks.size >= this.maxTasks) break;
        this.tasks.set(item.id, item as JarvisTask);
      }
    }
  }

  private save(): void {
    const tempFile = `${this.tasksFile}.tmp`;
    fs.writeFileSync(
      tempFile,
      JSON.stringify([...this.tasks.values()], null, 2),
      { encoding: "utf8", mode: 0o600 },
    );
    fs.renameSync(tempFile, this.tasksFile);
  }

  private audit(event: string, task: JarvisTask): void {
    fs.appendFileSync(
      this.auditFile,
      `${JSON.stringify({
        at: new Date().toISOString(),
        event,
        taskId: task.id,
        type: task.type,
        status: task.status,
      })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }
}
