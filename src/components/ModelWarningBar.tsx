import type { ConnectionStatus } from '@/hooks/useConnectionStatus';

interface Props {
  status: ConnectionStatus;
  onConfigure: () => void;
}

/**
 * Persistent top-of-page banner — visible whenever the model isn't configured
 * or is erroring. Collapses to nothing while checking or ready so the presence
 * of this bar is itself a signal that action is needed.
 */
export function ModelWarningBar({ status, onConfigure }: Props) {
  if (status.kind === 'ready' || status.kind === 'checking') return null;

  const isError = status.kind === 'error';
  const headline = isError
    ? `${status.providerLabel} isn't responding`
    : `${status.providerLabel} isn't set up yet`;
  const sub = isError
    ? status.message
    : 'Add a Gemini API key to start using the tool.';

  const bg = isError
    ? 'bg-[hsl(var(--danger)/0.08)] border-[hsl(var(--danger)/0.25)]'
    : 'bg-accent-soft border-accent/25';
  const fg = isError ? 'text-[hsl(var(--danger))]' : 'text-accent-soft-fg';
  const dot = isError ? 'bg-[hsl(var(--danger))]' : 'bg-accent';

  return (
    <div className={`flex items-center gap-3 border-b px-4 py-2 text-xs ${bg}`} role="status">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span className={`font-semibold ${fg}`}>{headline}</span>
      <span className="text-muted-fg flex-1 truncate">{sub}</span>
      <button
        className="btn-primary !text-[11px] !py-0.5 !px-2.5 shrink-0"
        onClick={onConfigure}
      >
        Configure now
      </button>
    </div>
  );
}
