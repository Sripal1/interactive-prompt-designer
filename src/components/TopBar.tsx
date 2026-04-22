import { cn } from '@/lib/cn';
import { useSession } from '@/store/session';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { GEMMA_DISPLAY_NAME } from '@/providers/registry';

interface Props {
  onOpenSettings: () => void;
  onRun: () => void;
  onExport: () => void;
  onStop: () => void;
  onNewSession: () => void;
  canRun: boolean;
  showRun: boolean;
}

export function TopBar({
  onOpenSettings,
  onRun,
  onExport,
  onStop,
  onNewSession,
  canRun,
  showRun,
}: Props) {
  const streaming = useSession((x) => x.streaming);
  const mode = useSession((x) => x.mode);
  const setMode = useSession((x) => x.setMode);
  const runs = useSession((x) => x.runs);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card/70 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-lg grid place-items-center font-display text-[15px] font-semibold"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--accent)/0.9), hsl(var(--accent)/0.6))',
            color: 'hsl(var(--accent-fg))',
          }}
          aria-hidden
        >
          p
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight">
            Prompt Designer
          </div>
          <div className="text-[10px] text-muted-fg">iterative prompting</div>
        </div>
      </div>

      <div className="divider-vert" />

      <ModePills mode={mode} setMode={setMode} />

      <div className="ml-auto flex items-center gap-2">
        <ModelChip onOpenSettings={onOpenSettings} />

        {runs.length > 0 ? (
          <button
            className="btn-ghost !text-xs"
            onClick={() => {
              if (confirm('Start a new session? The current one is already saved.')) {
                onNewSession();
              }
            }}
            title="Start a new session"
          >
            New
          </button>
        ) : null}

        <button className="btn-ghost !text-xs" onClick={onExport} title="Export sessions as JSON">
          Export
        </button>

        <button
          className="btn-ghost !p-1.5 rounded-full"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Gear />
        </button>

        {showRun ? (
          streaming ? (
            <button className="btn-primary !bg-danger !shadow-none hover:!bg-danger/90" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button
              className={cn('btn-primary', !canRun && 'opacity-60')}
              onClick={onRun}
              disabled={!canRun}
              title="Run (Cmd/Ctrl + Enter)"
            >
              Run
            </button>
          )
        ) : null}
      </div>
    </header>
  );
}

function ModePills({
  mode,
  setMode,
}: {
  mode: 'structured' | 'chat';
  setMode: (m: 'structured' | 'chat') => void;
}) {
  const caption = mode === 'structured' ? 'Structured editor' : 'Direct chat';

  return (
    <div className="flex flex-col gap-1">
      <div
        className="inline-flex rounded-full bg-muted p-0.5 text-xs"
        role="tablist"
        aria-label="Mode"
      >
        <button
          role="tab"
          aria-selected={mode === 'structured'}
          className={cn(
            'px-3 py-1 rounded-full font-medium transition',
            mode === 'structured'
              ? 'bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]'
              : 'text-muted-fg hover:text-fg',
          )}
          onClick={() => setMode('structured')}
          title="Structured prompt editor"
        >
          Designer
        </button>
        <button
          role="tab"
          aria-selected={mode === 'chat'}
          className={cn(
            'px-3 py-1 rounded-full font-medium transition',
            mode === 'chat'
              ? 'bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]'
              : 'text-muted-fg hover:text-fg',
          )}
          onClick={() => setMode('chat')}
          title="Direct chat mode"
        >
          Chat
        </button>
      </div>
      <div className="hidden pl-1 text-[10px] leading-none text-muted-fg lg:block">
        {caption}
      </div>
    </div>
  );
}

function ModelChip({ onOpenSettings }: { onOpenSettings: () => void }) {
  const status = useConnectionStatus();

  const dotColor =
    status.kind === 'ready'
      ? 'bg-[hsl(var(--success))]'
      : status.kind === 'checking'
        ? 'bg-muted-fg animate-[pulse-soft_1.4s_ease-in-out_infinite]'
        : status.kind === 'error'
          ? 'bg-[hsl(var(--danger))]'
          : 'bg-accent';
  const tooltip =
    status.kind === 'ready'
      ? `Connected to ${status.providerLabel}`
      : status.kind === 'checking'
        ? `Checking ${status.providerLabel}…`
        : status.kind === 'error'
          ? `${status.providerLabel}: ${status.message}`
          : `${status.providerLabel} needs a key — click to set one`;

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:border-border/80"
      onClick={onOpenSettings}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
      <span className="font-medium">{GEMMA_DISPLAY_NAME}</span>
    </button>
  );
}

function Gear() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 5.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zm5.6 2.8a5.6 5.6 0 00-.07-.88l1.4-1.08a.35.35 0 00.08-.45l-1.33-2.3a.35.35 0 00-.42-.15l-1.65.66a5.55 5.55 0 00-1.52-.88l-.25-1.75A.35.35 0 009.5 1h-3a.35.35 0 00-.35.3l-.25 1.75a5.55 5.55 0 00-1.52.88l-1.65-.66a.35.35 0 00-.42.15L.98 5.59a.35.35 0 00.08.45l1.4 1.08a5.6 5.6 0 000 1.76l-1.4 1.08a.35.35 0 00-.08.45l1.33 2.3a.35.35 0 00.42.15l1.65-.66c.46.37.97.66 1.52.88l.25 1.75a.35.35 0 00.35.3h3a.35.35 0 00.35-.3l.25-1.75a5.55 5.55 0 001.52-.88l1.65.66a.35.35 0 00.42-.15l1.33-2.3a.35.35 0 00-.08-.45l-1.4-1.08c.05-.29.07-.58.07-.88z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
