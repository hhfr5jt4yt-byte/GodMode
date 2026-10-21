import fs from "fs";
import os from "os";
import path from "path";
import { JarvisTaskRegistry } from "./jarvis-task-registry";

describe("JarvisTaskRegistry", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-registry-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("queues allowlisted routine tasks without executing them", () => {
    const registry = new JarvisTaskRegistry(directory);
    const task = registry.create({
      type: "research",
      title: "Research market trends",
      payload: { query: "public market overview" },
    });

    expect(task.status).toBe("queued");
    expect(registry.get(task.id)?.status).toBe("queued");
  });

  it("requires approval for consequential tasks and records approval without execution", () => {
    const registry = new JarvisTaskRegistry(directory);
    const task = registry.create({
      type: "send_message",
      title: "Send customer update",
      payload: { draft: "Please review this draft." },
    });

    expect(task.status).toBe("awaiting_approval");
    expect(registry.approve(task.id).status).toBe("approved_not_executed");
    expect(fs.readFileSync(path.join(directory, "audit.jsonl"), "utf8")).toContain(
      "task_approved_not_executed",
    );
  });

  it("persists task records between registry instances", () => {
    const first = new JarvisTaskRegistry(directory);
    const task = first.create({
      type: "summarize",
      title: "Summarize notes",
      payload: { text: "notes" },
    });

    const second = new JarvisTaskRegistry(directory);
    expect(second.get(task.id)?.title).toBe("Summarize notes");
  });

  it("rejects unsupported task types and oversized payloads", () => {
    const registry = new JarvisTaskRegistry(directory);
    expect(() =>
      registry.create({
        type: "shell" as never,
        title: "Run arbitrary command",
      }),
    ).toThrow("Unsupported task type.");

    expect(() =>
      registry.create({
        type: "research",
        title: "Large payload",
        payload: { content: "x".repeat(33_000) },
      }),
    ).toThrow("Task payload exceeds 32 KB.");
  });
});
