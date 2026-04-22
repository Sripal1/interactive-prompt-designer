import { useState } from 'react';
import { Dialog } from './Dialog';
import { useComponents } from '@/store/components';
import type { ComponentKind } from '@/prompt/schema';
import type { ClarifyingQuestion } from '@/meta/clarify';

interface Props {
  open: boolean;
  loading: boolean;
  questions: ClarifyingQuestion[];
  onClose: () => void;
  onRecordAnswered: (count: number) => void;
}

export function ClarifyingQsModal({
  open,
  loading,
  questions,
  onClose,
  onRecordAnswered,
}: Props) {
  const { components, setBody, addComponent } = useComponents();
  const [answers, setAnswers] = useState<Record<number, string>>({});

  function handleApply() {
    let applied = 0;
    questions.forEach((q, i) => {
      const ans = answers[i]?.trim();
      if (!ans) return;
      const kind: ComponentKind =
        (q.suggestedComponent as ComponentKind) ?? 'context';
      let target = components.find((c) => c.kind === kind && c.enabled);
      if (!target) {
        addComponent(kind);
        // New component will land at the end; grab it from the latest store read.
        const latest = useComponents.getState().components;
        target = latest[latest.length - 1];
      }
      if (!target) return;
      const existing = target.body.trim();
      const append = `${q.q}\n→ ${ans}`;
      const nextBody = existing ? `${existing}\n\n${append}` : append;
      setBody(target.id, nextBody);
      applied += 1;
    });
    onRecordAnswered(applied);
    setAnswers({});
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Clarifying questions"
      description="Answer any that apply. Answers are merged into the most relevant component."
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleApply} disabled={loading || questions.length === 0}>
            Apply answers
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
          Asking the model…
        </div>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-fg">
          The model didn't return any questions. Your prompt may already be complete.
        </p>
      ) : (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="space-y-1">
              <div className="text-sm">
                <span className="text-[10px] uppercase tracking-wider text-muted-fg mr-2 font-mono">
                  {q.suggestedComponent}
                </span>
                {q.q}
              </div>
              <input
                className="input"
                placeholder="Your answer…"
                value={answers[i] ?? ''}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
              />
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
