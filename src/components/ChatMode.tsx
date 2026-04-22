import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useSession, type Rating, type Run } from '@/store/session';
import { RatingControl } from './RatingControl';
import { ErrorDisplay } from './ErrorDisplay';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  at: number;
  pending?: boolean;
  latencyMs?: number;
  tokensOut?: number;
  /** Populated when the assistant turn is tied to a logged Run. */
  runId?: string;
  rating?: Rating;
}

interface Props {
  turns: ChatTurn[];
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  onRate: (turnIndex: number, rating: Rating | undefined) => void;
  canSend: boolean;
  canClear: boolean;
}

export function ChatMode({
  turns,
  onSend,
  onStop,
  onClear,
  onRate,
  canSend,
  canClear,
}: Props) {
  const streaming = useSession((s) => s.streaming);
  const currentOutput = useSession((s) => s.currentOutput);
  const error = useSession((s) => s.error);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const sendDisabled = streaming || !canSend || !input.trim();

  useEffect(() => {
    endRef.current?.scrollIntoView({
      block: 'end',
      behavior: streaming ? 'auto' : 'smooth',
    });
  }, [currentOutput, turns.length, streaming]);

  function submit() {
    if (sendDisabled) return;
    const text = input.trim();
    onSend(text);
    setInput('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-fg">
              Direct mode
            </span>
            <h2 className="text-sm font-semibold">Chat</h2>
          </div>
          <p className="mt-1 max-w-xl text-[11px] text-muted-fg">
            Use a simple back-and-forth here when you don't need the structured editor.
          </p>
        </div>
        <button
          className="btn-ghost !text-xs"
          onClick={onClear}
          disabled={!canClear || streaming}
          title={
            streaming
              ? 'Stop the current run before clearing this chat.'
              : canClear
                ? 'Start a fresh chat session'
                : 'Nothing to clear yet'
          }
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {turns.length === 0 ? (
          <div className="card-soft p-5">
            <div className="text-sm font-medium text-fg">Send a message to the model directly.</div>
            <p className="mt-1 text-sm text-muted-fg">
              If you want reusable components and prompt drafting help, switch back to
              <span className="font-medium text-fg"> Designer</span> in the top bar.
            </p>
          </div>
        ) : null}
        {turns.map((t, i) => (
          <Bubble
            key={i}
            turn={t}
            streamingText={t.pending ? currentOutput : undefined}
            onRate={(next) => onRate(i, next)}
          />
        ))}
        {error ? <ErrorDisplay message={error} /> : null}
        <div ref={endRef} />
      </div>

      <footer className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            className="textarea flex-1 !min-h-[46px]"
            placeholder="Message the model directly…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={streaming}
          />
          {streaming ? (
            <button className="btn-primary bg-danger hover:bg-danger/90" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button className="btn-primary" onClick={submit} disabled={sendDisabled}>
              Send
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-fg">
          Press <span className="kbd">Enter</span> to send and{' '}
          <span className="kbd">Shift+Enter</span> for a new line.
        </p>
      </footer>
    </div>
  );
}

function Bubble({
  turn,
  streamingText,
  onRate,
}: {
  turn: ChatTurn;
  streamingText?: string;
  onRate: (next: Rating | undefined) => void;
}) {
  const isUser = turn.role === 'user';
  const content = turn.pending ? streamingText || turn.content || 'Thinking…' : turn.content;

  return (
    <div className={cn('group flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
          isUser ? 'bg-accent text-accent-fg' : 'bg-muted',
        )}
      >
        {content}
        {turn.pending ? (
          <span className="inline-block ml-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft align-middle" />
        ) : null}
        {!isUser && !turn.pending ? (
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-fg">
            <span>
              {new Date(turn.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="ml-auto">
              <RatingControl value={turn.rating} onChange={onRate} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Turn a structured Run into a chat transcript — used when re-rendering history. */
export function runsToTurns(runs: Run[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const r of runs) {
    if (r.mode !== 'chat') continue;
    turns.push({ role: 'user', content: r.prompt, at: r.at });
    turns.push({
      role: 'assistant',
      content: r.output,
      at: r.at,
      latencyMs: r.latencyMs,
      tokensOut: r.tokensOut,
      runId: r.id,
      rating: r.rating,
    });
  }
  return turns;
}
