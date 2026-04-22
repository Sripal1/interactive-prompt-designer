import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { TopBar } from '@/components/TopBar';
import { ComponentList } from '@/components/ComponentList';
import { OutputPane } from '@/components/OutputPane';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ClarifyingQsModal } from '@/components/ClarifyingQsModal';
import { ChatMode, runsToTurns, type ChatTurn } from '@/components/ChatMode';
import type { Rating } from '@/store/session';
import { ModelWarningBar } from '@/components/ModelWarningBar';
import { ModelSetupModal } from '@/components/ModelSetupModal';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ClarifyingFlow } from '@/components/ClarifyingFlow';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { useSettings, MODEL_ID } from '@/store/settings';
import { useSession, type Run } from '@/store/session';
import { useComponents } from '@/store/components';
import { renderPrompt } from '@/prompt/render';
import { makeProvider } from '@/providers/registry';
import { ProviderError, type ChatMessage } from '@/providers/types';
import { saveSession } from '@/logger/db';
import { buildExport, downloadExport } from '@/logger/export';
import { askClarifying, type ClarifyingQuestion } from '@/meta/clarify';
import { explainChange } from '@/meta/diffExplain';
import { planClarifying, draftPrompt, type PlannedQuestion } from '@/meta/draft';
import type { Session } from '@/prompt/schema';

export function App() {
  const settings = useSettings();
  const session = useSession();
  const { components, setBody } = useComponents();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyQs, setClarifyQs] = useState<ClarifyingQuestion[]>([]);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [planQs, setPlanQs] = useState<PlannedQuestion[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const connection = useConnectionStatus();
  const abortRef = useRef<AbortController | null>(null);

  // First-visit modal: pop once if the model isn't configured.
  useEffect(() => {
    const { hasSeenModelSetupPrompt, setField } = useSettings.getState();
    if (!hasSeenModelSetupPrompt && connection.kind === 'needs-key') {
      setSetupModalOpen(true);
      setField('hasSeenModelSetupPrompt', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- URL ?mode= routing --------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'chat' || m === 'structured') {
      if (m !== session.mode) session.setMode(m);
    }
    if (m === 'chat') {
      useSession.getState().setStage('working');
    }
    const alreadyStarted =
      useSession.getState().runs.length > 0 || hasStructuredDraft();
    if (alreadyStarted) {
      useSession.getState().setStage('working');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    if (current.get('mode') === session.mode) return;

    current.set('mode', session.mode);
    const query = current.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }, [session.mode]);

  useEffect(() => {
    if (session.mode === 'chat') {
      setChatTurns(runsToTurns(session.runs));
      useSession.getState().setStage('working');
      return;
    }

    useSession.getState().setStage(
      session.runs.length > 0 || hasStructuredDraft() ? 'working' : 'onboarding',
    );
  }, [session.mode, session.runs]);

  useEffect(() => {
    if (session.mode === 'chat' && !session.streaming) {
      setChatTurns(runsToTurns(session.runs));
    }
  }, [session.mode, session.runs, session.streaming]);

  // --- Persistence ---------------------------------------------------------
  useEffect(() => {
    if (!settings.loggingEnabled) return;
    if (session.runs.length === 0 && session.events.length === 0) return;
    const s: Session = {
      id: session.sessionId,
      startedAt: session.startedAt,
      taskLabel: session.taskLabel || undefined,
      mode: session.mode,
      provider: 'gemini',
      model: MODEL_ID,
      events: session.events,
      finalPrompt: session.runs[session.runs.length - 1]?.prompt,
      finalOutput: session.runs[session.runs.length - 1]?.output,
      selfReportedQuality: extractQuality(session.events),
    };
    saveSession(s).catch((err) => console.error('saveSession', err));
  }, [
    session.runs,
    session.events,
    session.sessionId,
    session.startedAt,
    session.mode,
    session.taskLabel,
    settings.loggingEnabled,
  ]);

  // --- Core runner ---------------------------------------------------------
  const run = useCallback(
    async (override?: { promptText?: string; messages?: ChatMessage[] }) => {
      if (session.streaming) return;
      session.resetStream();
      session.setStreaming(true);

      const provider = makeProvider(settings);
      const prompt = override?.promptText ?? renderPrompt(components);
      if (!prompt.trim() && session.mode === 'structured') {
        session.setError(
          'The prompt is empty. Add something to a component before running.',
        );
        return;
      }

      const messages: ChatMessage[] =
        override?.messages ?? [{ role: 'user', content: prompt }];

      const abort = new AbortController();
      abortRef.current = abort;
      const runId = nanoid(10);
      const started = Date.now();
      let tokensIn: number | undefined;
      let tokensOut: number | undefined;
      let assembled = '';

      try {
        for await (const evt of provider.complete({
          model: MODEL_ID,
          messages,
          temperature: settings.temperature,
          signal: abort.signal,
        })) {
          if (evt.delta) {
            assembled += evt.delta;
            session.appendStream(evt.delta);
          }
          if (evt.usage) {
            tokensIn = evt.usage.tokensIn ?? tokensIn;
            tokensOut = evt.usage.tokensOut ?? tokensOut;
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          session.setError('Stopped.');
        } else if (err instanceof ProviderError) {
          session.setError(err.message + (err.hint ? `\n\nHint: ${err.hint}` : ''));
        } else {
          session.setError((err as Error).message ?? 'Unknown error');
        }
        return;
      } finally {
        abortRef.current = null;
      }

      const latencyMs = Date.now() - started;
      const completedRun: Run = {
        id: runId,
        at: started,
        mode: session.mode,
        prompt,
        output: assembled,
        latencyMs,
        tokensIn,
        tokensOut,
        provider: 'gemini',
        model: MODEL_ID,
      };
      session.finalizeRun(completedRun);
      session.addEvent({
        kind: 'run',
        t: started,
        mode: session.mode,
        promptChars: prompt.length,
        tokensIn,
        tokensOut,
        latencyMs,
        provider: 'gemini',
        model: MODEL_ID,
      });
      return completedRun;
    },
    [components, settings, session],
  );

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    if (session.streaming) return;
    session.newSession();
    setChatTurns([]);
    setPlanQs([]);
    setClarifyQs([]);
    setClarifyOpen(false);
    useSession
      .getState()
      .setStage(hasStructuredDraft() ? 'working' : 'onboarding');
  }, [session]);

  // --- Onboarding → clarifying --------------------------------------------
  const handleBeginFromGoal = useCallback(
    async (goal: string) => {
      session.setTaskLabel(goal);
      session.setStage('clarifying');
      setPlanLoading(true);
      setPlanQs([]);
      try {
        const provider = makeProvider(settings);
        const qs = await planClarifying(provider, MODEL_ID, goal);
        setPlanQs(qs);
      } catch (err) {
        console.error('planClarifying failed', err);
        setPlanQs([]);
      } finally {
        setPlanLoading(false);
      }
    },
    [settings, session],
  );

  // --- Clarifying → working (draft then auto-run) -------------------------
  const handleDraftAndRun = useCallback(
    async (answers: Array<{ q: string; a: string; field: string }>) => {
      setDrafting(true);
      try {
        const provider = makeProvider(settings);
        const drafted = await draftPrompt(
          provider,
          MODEL_ID,
          session.taskLabel,
          answers,
        );

        const current = useComponents.getState().components;
        const assignIfFound = (
          kind: 'role' | 'task' | 'context' | 'constraints' | 'examples' | 'format',
          body: string,
        ) => {
          if (!body.trim()) return;
          const target = current.find((c) => c.kind === kind);
          if (target) setBody(target.id, body);
        };

        assignIfFound('role', drafted.role);
        assignIfFound('task', drafted.task);
        assignIfFound('context', drafted.context);
        assignIfFound('constraints', drafted.constraints);
        assignIfFound('examples', drafted.examples);
        assignIfFound('format', drafted.format);

        session.setStage('working');
        setTimeout(() => {
          void run();
        }, 50);
      } catch (err) {
        console.error('draftPrompt failed', err);
        session.setStage('working');
      } finally {
        setDrafting(false);
      }
    },
    [settings, session, setBody, run],
  );

  // --- Iterate-time clarifying Qs ------------------------------------------
  const handleAskClarify = useCallback(async () => {
    setClarifyOpen(true);
    setClarifyLoading(true);
    setClarifyQs([]);
    try {
      const provider = makeProvider(settings);
      const qs = await askClarifying(provider, MODEL_ID, components);
      setClarifyQs(qs);
      session.addEvent({
        kind: 'clarify',
        t: Date.now(),
        questionsShown: qs.length,
        answered: 0,
      });
    } catch (err) {
      session.setError((err as Error).message);
    } finally {
      setClarifyLoading(false);
    }
  }, [settings, components, session]);

  const handleClarifyAnswered = useCallback(
    (count: number) => {
      session.addEvent({
        kind: 'clarify',
        t: Date.now(),
        questionsShown: clarifyQs.length,
        answered: count,
      });
    },
    [clarifyQs.length, session],
  );

  // --- Diff explainer ------------------------------------------------------
  const handleExplainDiff = useCallback(
    async (prev: Run, next: Run): Promise<string | null> => {
      try {
        const provider = makeProvider(settings);
        const text = await explainChange(provider, MODEL_ID, {
          prevPrompt: prev.prompt,
          nextPrompt: next.prompt,
          prevOutput: prev.output,
          nextOutput: next.output,
        });
        session.addEvent({ kind: 'diff-explain', t: Date.now() });
        return text;
      } catch (err) {
        return `(failed to generate explanation: ${(err as Error).message})`;
      }
    },
    [settings, session],
  );

  // --- Chat mode -----------------------------------------------------------
  const sendChat = useCallback(
    async (text: string) => {
      const userTurn: ChatTurn = { role: 'user', content: text, at: Date.now() };
      const pending: ChatTurn = { role: 'assistant', content: '', at: Date.now(), pending: true };
      setChatTurns((prev) => [...prev, userTurn, pending]);

      const history: ChatMessage[] = [...chatTurns.filter((t) => !t.pending), userTurn].map((t) => ({
        role: t.role === 'user' ? 'user' : 'assistant',
        content: t.content,
      }));

      const runResult = await run({ promptText: text, messages: history });
      if (!runResult) {
        setChatTurns((prev) => prev.filter((t) => !t.pending));
        return;
      }

      setChatTurns((prev) =>
        prev.map((t) =>
          t.pending
            ? {
                ...t,
                content: runResult.output,
                pending: false,
                latencyMs: runResult.latencyMs,
                tokensOut: runResult.tokensOut,
                runId: runResult.id,
              }
            : t,
        ),
      );
    },
    [chatTurns, run],
  );

  const rateChatTurn = useCallback(
    (turnIndex: number, rating: Rating | undefined) => {
      setChatTurns((prev) =>
        prev.map((t, i) => (i === turnIndex ? { ...t, rating } : t)),
      );
      const turn = chatTurns[turnIndex];
      if (turn?.runId) {
        useSession.getState().setRunRating(turn.runId, rating);
      }
      if (rating !== undefined) {
        session.addEvent({
          kind: 'mark-satisfied',
          t: Date.now(),
          quality: rating === 'up' ? 5 : 1,
        });
      }
    },
    [chatTurns, session],
  );

  // --- Keyboard shortcut ---------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (session.mode === 'structured' && session.stage === 'working') {
          e.preventDefault();
          run();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, session.mode, session.stage]);

  // --- Export --------------------------------------------------------------
  const handleExport = useCallback(async () => {
    const bundle = await buildExport();
    downloadExport(bundle);
  }, []);

  const canUseProvider = !!settings.geminiKey;
  const canRun = canUseProvider && !session.streaming;
  const canClearChat =
    chatTurns.length > 0 ||
    session.currentOutput.trim().length > 0 ||
    session.error !== null;
  const showTopBarRun = session.stage === 'working' && session.mode === 'structured';

  return (
    <div className="flex h-full flex-col">
      <TopBar
        onOpenSettings={() => setSettingsOpen(true)}
        onRun={() => run()}
        onStop={stopRun}
        onExport={handleExport}
        onNewSession={() => {
          useComponents.getState().resetToDefaults();
          session.newSession();
          setChatTurns([]);
          setPlanQs([]);
        }}
        canRun={canRun}
        showRun={showTopBarRun}
      />
      <ModelWarningBar
        status={connection}
        onConfigure={() => setSettingsOpen(true)}
      />

      {session.mode === 'chat' ? (
        <main className="flex-1 min-h-0">
          <ChatMode
            turns={chatTurns}
            canSend={canUseProvider && !session.streaming}
            canClear={canClearChat}
            onSend={sendChat}
            onStop={stopRun}
            onClear={clearChat}
            onRate={rateChatTurn}
          />
        </main>
      ) : session.stage === 'onboarding' ? (
        <OnboardingScreen
          onBegin={handleBeginFromGoal}
          onSkipToEditor={() => session.setStage('working')}
          onSwitchToChat={() => session.setMode('chat')}
        />
      ) : session.stage === 'clarifying' ? (
        <ClarifyingFlow
          goal={session.taskLabel}
          loading={planLoading}
          questions={planQs}
          onDraft={handleDraftAndRun}
          onBack={() => session.setStage('onboarding')}
          drafting={drafting}
        />
      ) : (
        <main className="grid flex-1 min-h-0 grid-cols-[minmax(360px,34%)_1fr]">
          <aside className="min-h-0 border-r border-border">
            <ComponentList />
          </aside>
          <section className="min-h-0">
            <OutputPane
              onAskClarify={handleAskClarify}
              onExplainDiff={handleExplainDiff}
            />
          </section>
        </main>
      )}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModelSetupModal
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onConfigure={() => setSettingsOpen(true)}
      />
      <ClarifyingQsModal
        open={clarifyOpen}
        loading={clarifyLoading}
        questions={clarifyQs}
        onClose={() => setClarifyOpen(false)}
        onRecordAnswered={handleClarifyAnswered}
      />
    </div>
  );
}

function hasStructuredDraft(): boolean {
  return renderPrompt(useComponents.getState().components).trim().length > 0;
}

function extractQuality(
  events: ReturnType<typeof useSession.getState>['events'],
): 1 | 2 | 3 | 4 | 5 | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e.kind === 'mark-satisfied' && e.quality) return e.quality;
  }
  return undefined;
}
