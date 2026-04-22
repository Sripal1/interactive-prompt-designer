import { useEffect, useState } from 'react';
import type { PlannedQuestion } from '@/meta/draft';
import { COMPONENT_GLYPH } from '@/prompt/schema';
import { ComponentBadge } from './ComponentBadge';

interface Props {
  goal: string;
  loading: boolean;
  questions: PlannedQuestion[];
  onDraft: (answers: Array<{ q: string; a: string; field: string }>) => void;
  onBack: () => void;
  drafting: boolean;
}

export function ClarifyingFlow({ goal, loading, questions, onDraft, onBack, drafting }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    setAnswers({});
  }, [questions]);

  const submit = () => {
    const payload = questions.map((q, i) => ({
      q: q.q,
      a: answers[i] ?? '',
      field: q.field,
    }));
    onDraft(payload);
  };

  return (
    <div className="relative flex flex-1 items-start justify-center overflow-y-auto">
      <div className="w-full max-w-2xl px-6 pt-16 pb-16 anim-in">
        <div className="flex items-center gap-3 text-xs text-muted-fg">
          <button className="hover:text-fg underline underline-offset-2" onClick={onBack}>
            ← change goal
          </button>
          <span className="h-1 w-1 rounded-full bg-muted-fg/60" />
          <span>Step 2 of 2</span>
        </div>

        <h2 className="mt-4 font-display text-3xl leading-tight tracking-tight text-balance">
          A couple of quick questions
        </h2>
        <p className="mt-2 text-muted-fg text-pretty">
          Your answers will fill in the structured prompt — skip any that don't apply.
        </p>

        <div className="mt-6 card-soft px-4 py-3 text-sm text-muted-fg">
          <span className="text-[11px] uppercase tracking-wider text-muted-fg/80">Your goal</span>
          <div className="mt-0.5 text-fg">{goal}</div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <LoadingQuestions />
          ) : questions.length === 0 ? (
            <div className="card p-5 text-sm text-muted-fg text-center">
              No extra questions needed — your goal is clear. Ready to draft?
            </div>
          ) : (
            <ol className="space-y-3 stagger">
              {questions.map((q, i) => {
                const kind =
                  q.field in COMPONENT_GLYPH
                    ? (q.field as keyof typeof COMPONENT_GLYPH)
                    : 'context';
                return (
                  <li key={i} className="card p-4">
                    <div className="flex items-start gap-3">
                      <ComponentBadge kind={kind} />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-fg">{q.q}</label>
                        <textarea
                          className="textarea mt-2"
                          placeholder={q.placeholder ?? 'Your answer… (or leave blank to skip)'}
                          value={answers[i] ?? ''}
                          onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                          rows={2}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                              e.preventDefault();
                              submit();
                            }
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[11px] text-muted-fg">
            <span className="kbd">{isMac() ? '⌘' : 'Ctrl'}</span>
            <span className="kbd ml-1">Enter</span>
            <span className="ml-2">to draft</span>
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost !text-sm" onClick={onBack} disabled={drafting}>
              Back
            </button>
            <button className="btn-primary" onClick={submit} disabled={loading || drafting}>
              {drafting ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-[pulse-soft_1.4s_ease-in-out_infinite]" />
                  Drafting…
                </>
              ) : (
                <>Draft my prompt</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingQuestions() {
  return (
    <div className="card p-5 flex items-center gap-3 text-sm text-muted-fg">
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-[pulse-soft_1.4s_ease-in-out_infinite]" />
      Thinking about what to ask…
    </div>
  );
}

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
