import { useState } from 'react';
import { Dialog } from './Dialog';
import { useSettings, MODEL_ID } from '@/store/settings';
import { clearAllSessions } from '@/logger/db';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { cn } from '@/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const s = useSettings();
  const status = useConnectionStatus();
  const [tab, setTab] = useState<'key' | 'data' | 'about'>('key');

  return (
    <Dialog open={open} onClose={onClose} title="Settings" size="lg">
      <div className="flex items-center gap-2 border-b border-border -mx-6 px-6 -mt-4 pb-2 mb-0">
        {(['key', 'data', 'about'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize ${
              tab === t ? 'bg-muted text-fg' : 'text-muted-fg hover:text-fg'
            }`}
          >
            {t === 'key' ? 'API key' : t}
          </button>
        ))}
      </div>

      {tab === 'key' ? (
        <>
          <StatusPill status={status} />

          <p className="text-[11px] text-muted-fg">
            Your key is stored only in this browser and sent directly to the provider.
            It never touches a server you control.
          </p>

          <Field label="Gemini API key">
            <div className="flex items-center gap-2">
              <input
                type="password"
                className="input font-mono text-xs flex-1"
                placeholder="AIza…"
                value={s.geminiKey}
                onChange={(e) => s.setField('geminiKey', e.target.value)}
              />
              <a
                className="text-[11px] text-muted-fg hover:text-fg underline underline-offset-2 shrink-0"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
              >
                open key page →
              </a>
            </div>
          </Field>

          <Field label="Base URL (optional)" hint="Override the endpoint; leave blank for default.">
            <input
              className="input font-mono text-xs"
              placeholder="https://generativelanguage.googleapis.com/v1beta"
              value={s.geminiBaseUrl}
              onChange={(e) => s.setField('geminiBaseUrl', e.target.value)}
            />
          </Field>

          <div className="text-[11px] text-muted-fg">
            Model: <code className="font-mono text-fg">{MODEL_ID}</code>. Streaming is enabled.
          </div>

          <button className="btn-ghost !text-xs text-danger" onClick={() => s.clearKey()}>
            Clear key
          </button>
        </>
      ) : null}

      {tab === 'data' ? (
        <>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.loggingEnabled}
              onChange={(e) => s.setField('loggingEnabled', e.target.checked)}
              className="mt-1"
            />
            <span>
              <div className="font-medium">Enable session logging</div>
              <div className="text-[11px] text-muted-fg">
                Records prompt edits, runs, and outputs to your browser's IndexedDB so you
                can export or clear them later.
              </div>
            </span>
          </label>

          <button
            className="btn-ghost !text-xs text-danger"
            onClick={async () => {
              if (confirm('Delete ALL logged sessions from this browser? This cannot be undone.')) {
                await clearAllSessions();
                alert('Cleared.');
              }
            }}
          >
            Delete all logged sessions
          </button>
        </>
      ) : null}

      {tab === 'about' ? (
        <div className="text-sm leading-relaxed space-y-2">
          <p>
            <strong>Prompt Designer</strong> — an iterative, component-based prompt editor.
          </p>
          <p className="text-muted-fg">
            Use the structured editor for reusable prompt components, or switch to chat for
            a faster back-and-forth.
          </p>
          <p className="text-muted-fg">
            All state is local. No backend. Your API key never leaves your browser. The
            build-time env var <code className="font-mono mx-1">VITE_GEMINI_API_KEY</code>
            can seed a default on first load, which is useful for local dev but risky for a
            public deploy.
          </p>
        </div>
      ) : null}
    </Dialog>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof useConnectionStatus> }) {
  const tone =
    status.kind === 'ready'
      ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]'
      : status.kind === 'error'
        ? 'bg-[hsl(var(--danger)/0.08)] text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.3)]'
        : status.kind === 'checking'
          ? 'bg-muted text-muted-fg border-border'
          : 'bg-accent-soft text-accent-soft-fg border-accent/30';

  const label =
    status.kind === 'ready'
      ? `Connected · ${status.providerLabel}`
      : status.kind === 'checking'
        ? `Checking ${status.providerLabel}…`
        : status.kind === 'error'
          ? `${status.providerLabel}: ${status.message}`
          : `${status.providerLabel} needs a key`;

  return (
    <div className={cn('rounded-lg border px-3 py-2 text-sm font-medium', tone)}>{label}</div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="text-[11px] text-muted-fg mt-1 block">{hint}</span> : null}
    </label>
  );
}
