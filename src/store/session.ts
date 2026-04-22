import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { SessionEvent } from '@/prompt/schema';

export type Rating = 'up' | 'down';

export interface Run {
  id: string;
  at: number;
  mode: 'structured' | 'chat';
  prompt: string;
  output: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  provider: string;
  model: string;
  rating?: Rating;
}

export type Stage = 'onboarding' | 'clarifying' | 'working';

export interface SessionState {
  sessionId: string;
  startedAt: number;
  taskLabel: string;
  mode: 'structured' | 'chat';
  stage: Stage;
  runs: Run[];
  events: SessionEvent[];
  streaming: boolean;
  currentOutput: string;
  error: string | null;

  setMode: (mode: 'structured' | 'chat') => void;
  setStage: (stage: Stage) => void;
  setTaskLabel: (label: string) => void;
  setStreaming: (s: boolean) => void;
  appendStream: (delta: string) => void;
  resetStream: () => void;
  finalizeRun: (run: Run) => void;
  setRunRating: (runId: string, rating: Rating | undefined) => void;
  addEvent: (e: SessionEvent) => void;
  setError: (msg: string | null) => void;
  newSession: () => void;
}

function newIds() {
  return { sessionId: nanoid(10), startedAt: Date.now() };
}

export const useSession = create<SessionState>()((set) => ({
  ...newIds(),
  taskLabel: '',
  mode: 'structured',
  stage: 'onboarding',
  runs: [],
  events: [],
  streaming: false,
  currentOutput: '',
  error: null,

  setMode: (mode) => {
    set({ mode });
    set((s) => ({
      events: [...s.events, { kind: 'mode-switch', t: Date.now(), to: mode }],
    }));
  },
  setStage: (stage) => set({ stage }),
  setTaskLabel: (taskLabel) => set({ taskLabel }),
  setStreaming: (streaming) => set({ streaming }),
  appendStream: (delta) => set((s) => ({ currentOutput: s.currentOutput + delta })),
  resetStream: () => set({ currentOutput: '', error: null }),
  finalizeRun: (run) =>
    set((s) => ({
      runs: [...s.runs, run],
      streaming: false,
    })),
  setRunRating: (runId, rating) =>
    set((s) => ({
      runs: s.runs.map((r) => (r.id === runId ? { ...r, rating } : r)),
    })),
  addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
  setError: (error) => set({ error, streaming: false }),
  newSession: () =>
    set({
      ...newIds(),
      taskLabel: '',
      stage: 'onboarding',
      runs: [],
      events: [],
      streaming: false,
      currentOutput: '',
      error: null,
    }),
}));
