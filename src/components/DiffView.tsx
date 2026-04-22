import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { Dialog } from './Dialog';
import type { Run } from '@/store/session';
import { diffOutputs } from '@/meta/diffExplain';

interface Props {
  prev: Run;
  next: Run;
  explanation: string | null;
  explaining: boolean;
  onClose: () => void;
}

export function DiffView({ prev, next, explanation, explaining, onClose }: Props) {
  const hunks = useMemo(() => diffOutputs(prev.output, next.output, 'words'), [prev, next]);

  return (
    <Dialog open={true} onClose={onClose} title="Output diff vs. previous run" size="lg">
      <div className="rounded-md border border-border p-3 bg-muted/30">
        <div className="text-[11px] font-semibold text-muted-fg mb-1">
          Why did it change?
        </div>
        {explaining ? (
          <div className="flex items-center gap-2 text-sm text-muted-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
            explaining…
          </div>
        ) : explanation ? (
          <p className="text-sm">{explanation}</p>
        ) : (
          <p className="text-sm text-muted-fg italic">No explanation available.</p>
        )}
      </div>

      <div>
        <div className="text-[11px] font-semibold text-muted-fg mb-1">Output diff</div>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed rounded-md border border-border p-3 max-h-[50vh] overflow-auto">
          {hunks.map((h, i) => (
            <span
              key={i}
              className={cn(
                h.added && 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200',
                h.removed && 'bg-rose-500/20 text-rose-900 dark:text-rose-200 line-through',
              )}
            >
              {h.value}
            </span>
          ))}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] text-muted-fg">
        <div>
          <div className="font-semibold">Previous run</div>
          <div>
            {new Date(prev.at).toLocaleTimeString()} · {prev.tokensOut ?? '?'} tok ·{' '}
            {prev.latencyMs}ms
          </div>
        </div>
        <div>
          <div className="font-semibold">Current run</div>
          <div>
            {new Date(next.at).toLocaleTimeString()} · {next.tokensOut ?? '?'} tok ·{' '}
            {next.latencyMs}ms
          </div>
        </div>
      </div>
    </Dialog>
  );
}
