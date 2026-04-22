import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useSession, type Rating, type Run } from '@/store/session';
import { DiffView } from './DiffView';
import { RenderedPromptPane } from './RenderedPromptPane';
import { RatingControl } from './RatingControl';
import { ErrorDisplay } from './ErrorDisplay';

interface Props {
  onAskClarify: () => void;
  onExplainDiff: (prev: Run, next: Run) => Promise<string | null>;
}

type Tab = 'output' | 'rendered' | 'history';

export function OutputPane({ onAskClarify, onExplainDiff }: Props) {
  const runs = useSession((s) => s.runs);
  const currentOutput = useSession((s) => s.currentOutput);
  const streaming = useSession((s) => s.streaming);
  const error = useSession((s) => s.error);

  const [tab, setTab] = useState<Tab>('output');
  const [diffOpen, setDiffOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [currentOutput]);

  const last = runs[runs.length - 1];
  const prev = runs[runs.length - 2];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <TabButton active={tab === 'output'} onClick={() => setTab('output')}>
          Output
        </TabButton>
        <TabButton active={tab === 'rendered'} onClick={() => setTab('rendered')}>
          Rendered prompt
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          History <span className="ml-1 text-muted-fg">({runs.length})</span>
        </TabButton>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="btn-ghost !text-xs"
            onClick={onAskClarify}
            title="Let the model ask clarifying questions about your prompt"
          >
            Ask clarifying Qs
          </button>
          {prev && last ? (
            <button
              className="btn-ghost !text-xs"
              onClick={async () => {
                setDiffOpen(true);
                if (!explanation) {
                  setExplaining(true);
                  const msg = await onExplainDiff(prev, last);
                  setExplanation(msg);
                  setExplaining(false);
                }
              }}
            >
              Diff vs. previous
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
        {tab === 'output' ? (
          <OutputView
            streaming={streaming}
            currentOutput={currentOutput}
            last={last}
            error={error}
          />
        ) : null}
        {tab === 'rendered' ? <RenderedView /> : null}
        {tab === 'history' ? <HistoryView runs={runs} /> : null}
        <div ref={endRef} />
      </div>

      {diffOpen && prev && last ? (
        <DiffView
          prev={prev}
          next={last}
          explanation={explanation}
          explaining={explaining}
          onClose={() => setDiffOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        'px-2.5 py-1 rounded-md text-xs font-medium',
        active ? 'bg-muted text-fg' : 'text-muted-fg hover:text-fg',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function rateRun(runId: string, next: Rating | undefined) {
  const s = useSession.getState();
  s.setRunRating(runId, next);
  if (next !== undefined) {
    s.addEvent({
      kind: 'mark-satisfied',
      t: Date.now(),
      quality: next === 'up' ? 5 : 1,
    });
  }
}

function OutputView({
  streaming,
  currentOutput,
  last,
  error,
}: {
  streaming: boolean;
  currentOutput: string;
  last?: Run;
  error: string | null;
}) {
  if (error) {
    return <ErrorDisplay message={error} />;
  }
  if (streaming) {
    return (
      <div>
        <div className="mb-2 inline-flex items-center gap-1 text-[11px] text-muted-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
          streaming…
        </div>
        <pre className="whitespace-pre-wrap">{currentOutput}</pre>
      </div>
    );
  }
  if (last) {
    return (
      <div className="group">
        <pre className="whitespace-pre-wrap">{last.output}</pre>
        <div className="mt-3 border-t border-border pt-2 flex items-center gap-3 text-[11px] text-muted-fg">
          <span className="truncate">
            {last.latencyMs}ms · {last.tokensOut ?? '?'} tokens out · {last.provider} / {last.model}
          </span>
          <span className="ml-auto">
            <RatingControl
              value={last.rating}
              onChange={(next) => rateRun(last.id, next)}
            />
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="text-muted-fg font-sans text-sm space-y-2">
      <p>Output will stream here once you run the prompt.</p>
      <p className="text-[11px]">
        Tip: tap <span className="kbd">⌘</span><span className="kbd">Enter</span> anywhere to run.
      </p>
    </div>
  );
}

function RenderedView() {
  return <RenderedPromptPane />;
}

function HistoryView({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return <p className="text-muted-fg font-sans text-sm">No runs yet.</p>;
  }
  return (
    <div className="space-y-4">
      {runs
        .slice()
        .reverse()
        .map((r, i) => (
          <details key={r.id} className="card p-3">
            <summary className="cursor-pointer list-none font-sans text-xs text-muted-fg flex items-center justify-between">
              <span>
                Run {runs.length - i} · {new Date(r.at).toLocaleTimeString()} ·{' '}
                {r.tokensOut ?? '?'} tokens · {r.latencyMs}ms
              </span>
              <span className="text-muted-fg">▾</span>
            </summary>
            <div className="mt-2">
              <div className="text-[11px] font-semibold text-muted-fg mb-1">Output</div>
              <pre className="whitespace-pre-wrap text-xs">{r.output}</pre>
            </div>
          </details>
        ))}
    </div>
  );
}

