import React from 'react';

type JarvisStatus = {
  ready: boolean;
  modelConfigured: boolean;
  taskCount: number;
};

type JarvisAgent = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  enabled: boolean;
  requiresApprovalFor: string[];
};

type JarvisTask = {
  id: string;
  type: string;
  title: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function JarvisPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [status, setStatus] = React.useState<JarvisStatus | null>(null);
  const [agents, setAgents] = React.useState<JarvisAgent[]>([]);
  const [tasks, setTasks] = React.useState<JarvisTask[]>([]);
  const [prompt, setPrompt] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [taskTitle, setTaskTitle] = React.useState('');
  const [taskType, setTaskType] = React.useState('research');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async () => {
    try {
      const [nextStatus, nextAgents, nextTasks] = await Promise.all([
        window.jarvis.getStatus(),
        window.jarvis.listAgents(),
        window.jarvis.listTasks(50),
      ]);
      setStatus(nextStatus);
      setAgents(nextAgents);
      setTasks(nextTasks);
      setError('');
    } catch {
      setError('Jarvis Core could not be reached. Check the app build and main-process logs.');
    }
  }, []);

  React.useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function ask() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError('');
    setAnswer('');
    try {
      const result = await window.jarvis.askOpenAI(prompt.trim());
      setAnswer(result.text);
    } catch {
      setError(
        'OpenAI request failed. Verify OPENAI_API_KEY, OPENAI_MODEL, network access, and Platform usage limits.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function createTask() {
    if (!taskTitle.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await window.jarvis.createTask({
        type: taskType,
        title: taskTitle.trim(),
        payload: { source: 'jarvis-panel' },
      });
      setTaskTitle('');
      await refresh();
    } catch {
      setError('Task could not be created. Check the task type and local data directory.');
    } finally {
      setBusy(false);
    }
  }

  async function transitionTask(id: string, action: 'approve' | 'reject') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'approve') await window.jarvis.approveTask(id);
      else await window.jarvis.rejectTask(id);
      await refresh();
    } catch {
      setError('Task state was not changed. Refresh and verify its current status.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="jarvis-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-cyan-900/70 bg-slate-950 text-slate-100 shadow-2xl shadow-cyan-950/30"
      >
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">GodMode / Control Layer</p>
            <h2 id="jarvis-title" className="mt-1 text-2xl font-semibold tracking-wide">JARVIS CORE</h2>
            <p className="mt-1 text-sm text-slate-400">Model assistance · agents · task approvals</p>
          </div>
          <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Core</p>
                <p className="mt-2 text-lg font-semibold">{status?.ready ? 'Online' : 'Checking'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">OpenAI</p>
                <p className={`mt-2 text-lg font-semibold ${status?.modelConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {status?.modelConfigured ? 'Configured' : 'Needs setup'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Recent tasks</p>
                <p className="mt-2 text-lg font-semibold">{tasks.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">OpenAI workspace</h3>
                <span className="text-xs text-slate-500">No automatic tool execution</span>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={40000}
                rows={5}
                placeholder="Ask Jarvis to analyze code, plan a feature, summarize research, or review a design..."
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none ring-cyan-500/50 placeholder:text-slate-600 focus:ring-2"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busy || !prompt.trim() || !status?.modelConfigured} onClick={() => void ask()} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
                  {busy ? 'Working…' : 'Ask OpenAI'}
                </button>
                <button disabled={busy} onClick={() => void refresh()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40">
                  Refresh status
                </button>
              </div>
              {answer && <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-cyan-950 bg-black/40 p-4 text-sm leading-6">{answer}</pre>}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="font-semibold">Create task</h3>
              <p className="mt-1 text-sm text-slate-400">Tasks are recorded only; this panel does not execute them.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[0.7fr_1.3fr_auto]">
                <select value={taskType} onChange={(event) => setTaskType(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="research">Research</option>
                  <option value="summarize">Summarize</option>
                  <option value="code_review">Code review</option>
                  <option value="index_workspace">Workspace index</option>
                  <option value="send_message">Send message (approval)</option>
                  <option value="publish">Publish (approval)</option>
                </select>
                <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} placeholder="Task title" className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                <button disabled={busy || !taskTitle.trim()} onClick={() => void createTask()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40">Add task</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="font-semibold">Agent roster</h3>
              <div className="mt-3 space-y-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{agent.name}</p>
                      <span className={`text-xs ${agent.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>{agent.enabled ? 'Enabled role' : 'Disabled role'}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{agent.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.capabilities.map((capability) => <span key={capability} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-cyan-200">{capability}</span>)}
                    </div>
                  </div>
                ))}
                {!agents.length && <p className="text-sm text-slate-500">Agent roster is unavailable.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="font-semibold">Task queue</h3>
              <div className="mt-3 space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{task.type} · {task.status.replace(/_/g, ' ')}</p>
                      </div>
                      {task.status === 'awaiting_approval' && (
                        <div className="flex shrink-0 gap-1">
                          <button disabled={busy} onClick={() => void transitionTask(task.id, 'approve')} className="rounded bg-emerald-900/70 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-800 disabled:opacity-40">Approve</button>
                          <button disabled={busy} onClick={() => void transitionTask(task.id, 'reject')} className="rounded bg-rose-950 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900 disabled:opacity-40">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!tasks.length && <p className="text-sm text-slate-500">No tasks recorded yet.</p>}
              </div>
            </div>
          </div>
        </div>

        {error && <div role="alert" className="border-t border-rose-900 bg-rose-950/60 px-6 py-3 text-sm text-rose-200">{error}</div>}
        <footer className="border-t border-slate-800 px-6 py-3 text-xs text-slate-500">
          Approval records authorization only; no task worker is enabled. Do not send secrets or sensitive personal data in prompts.
        </footer>
      </section>
    </div>
  );
}
