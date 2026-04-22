import { useRef, useState } from 'react';
import { STARTERS } from '@/prompt/starters';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface Props {
  onBegin: (goal: string) => void;
  onSkipToEditor: () => void;
  onSwitchToChat: () => void;
}

export function OnboardingScreen({
  onBegin,
  onSkipToEditor,
  onSwitchToChat,
}: Props) {
  const [goal, setGoal] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const status = useConnectionStatus();
  const canContinue = status.kind === 'ready';

  const submit = () => {
    const v = goal.trim();
    if (!v || !canContinue) return;
    onBegin(v);
  };

  return (
    <div className="relative flex flex-1 items-start justify-center overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, hsl(var(--accent) / 0.22), transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-6 pt-16 pb-16 anim-in">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-fg">
          Prompt Designer
        </div>
        <h1 className="font-display text-[56px] leading-[1.03] tracking-tight text-balance">
          What do you want this prompt{' '}
          <span className="italic text-accent">to do</span>?
        </h1>
        <p className="mt-3 text-base text-muted-fg text-pretty max-w-xl">
          Write it the way you'd ask a teammate. A few quick questions will turn it into
          a solid first draft that you can refine in the editor.
        </p>

        <div className="mt-8 surface p-1.5 shadow-[0_8px_30px_-12px_hsl(var(--accent)/0.25)] focus-within:ring-2 focus-within:ring-accent/30 transition">
          <textarea
            ref={taRef}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            autoFocus
            placeholder="e.g. Summarize this research paper for my roommate who studies art"
            className="w-full resize-none bg-transparent px-4 py-3 text-base leading-relaxed placeholder:text-muted-fg/80 focus:outline-none"
          />
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <span className="text-[11px] text-muted-fg">
              <span className="kbd">{isMac() ? '⌘' : 'Ctrl'}</span>
              <span className="kbd ml-1">Enter</span>
              <span className="ml-2">to continue</span>
            </span>
            <button
              onClick={submit}
              disabled={!goal.trim() || !canContinue}
              className="btn-primary"
              title={
                canContinue
                  ? 'Continue'
                  : status.kind === 'checking'
                    ? 'Verifying your key…'
                    : 'Set up a provider in Settings to continue'
              }
            >
              Continue
              <Arrow />
            </button>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-fg">
            Or start from an example
          </div>
          <div className="flex flex-wrap gap-2 stagger">
            {STARTERS.map((s) => (
              <button
                key={s.id}
                className="chip"
                onClick={() => {
                  setGoal(s.goal);
                  requestAnimationFrame(() => taRef.current?.focus());
                }}
                title={s.tagline}
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-[11px] text-muted-fg max-sm:hidden">{s.tagline}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 card-soft px-4 py-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            Start here
          </div>
          <p className="mt-2 text-sm font-medium text-fg">Choose how you want to work.</p>
          <p className="mt-1 max-w-xl text-xs text-muted-fg">
            Use the structured editor when you want reusable prompt components, or switch
            to chat for a direct back-and-forth.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-fg">
            <button className="hover:text-fg underline underline-offset-2" onClick={onSkipToEditor}>
              Open the structured editor
            </button>
            <span>·</span>
            <button className="hover:text-fg underline underline-offset-2" onClick={onSwitchToChat}>
              Open chat instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function isMac() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
