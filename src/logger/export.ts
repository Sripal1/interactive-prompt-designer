import { listSessions } from './db';
import type { Session } from '@/prompt/schema';

export interface ExportBundle {
  version: 1;
  exportedAt: number;
  sessions: Session[];
  /** Pre-computed headline metrics for quick inspection. */
  metrics: AggregateMetrics;
}

export interface PerSessionMetrics {
  id: string;
  mode: 'structured' | 'chat';
  provider: string;
  model: string;
  durationMs: number;
  iterationsToSatisfaction: number | null;
  totalRuns: number;
  totalTokensIn: number;
  totalTokensOut: number;
  selfReportedQuality?: number;
}

export interface AggregateMetrics {
  perSession: PerSessionMetrics[];
  byMode: Record<
    'structured' | 'chat',
    {
      n: number;
      meanIterationsToSatisfaction: number | null;
      meanDurationMs: number | null;
      meanTokensOut: number | null;
      meanQuality: number | null;
    }
  >;
}

export function computeMetrics(sessions: Session[]): AggregateMetrics {
  const perSession: PerSessionMetrics[] = sessions.map((s) => {
    const runs = s.events.filter((e) => e.kind === 'run');
    const satisfiedAt = s.events.findIndex((e) => e.kind === 'mark-satisfied');
    const runsBeforeSatisfaction =
      satisfiedAt === -1
        ? null
        : s.events.slice(0, satisfiedAt).filter((e) => e.kind === 'run').length;

    const lastEvent = s.events[s.events.length - 1];
    const durationMs = lastEvent ? lastEvent.t - s.startedAt : 0;

    let tokensIn = 0;
    let tokensOut = 0;
    for (const e of runs) {
      if (e.kind === 'run') {
        tokensIn += e.tokensIn ?? 0;
        tokensOut += e.tokensOut ?? 0;
      }
    }

    return {
      id: s.id,
      mode: s.mode,
      provider: s.provider,
      model: s.model,
      durationMs,
      iterationsToSatisfaction: runsBeforeSatisfaction,
      totalRuns: runs.length,
      totalTokensIn: tokensIn,
      totalTokensOut: tokensOut,
      selfReportedQuality: s.selfReportedQuality,
    };
  });

  const byMode = {
    structured: summarize(perSession.filter((s) => s.mode === 'structured')),
    chat: summarize(perSession.filter((s) => s.mode === 'chat')),
  };

  return { perSession, byMode };
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function summarize(group: PerSessionMetrics[]) {
  return {
    n: group.length,
    meanIterationsToSatisfaction: mean(
      group
        .map((g) => g.iterationsToSatisfaction)
        .filter((x): x is number => x !== null),
    ),
    meanDurationMs: mean(group.map((g) => g.durationMs)),
    meanTokensOut: mean(group.map((g) => g.totalTokensOut)),
    meanQuality: mean(
      group
        .map((g) => g.selfReportedQuality)
        .filter((x): x is number => typeof x === 'number'),
    ),
  };
}

export async function buildExport(): Promise<ExportBundle> {
  const sessions = await listSessions();
  return {
    version: 1,
    exportedAt: Date.now(),
    sessions,
    metrics: computeMetrics(sessions),
  };
}

export function downloadExport(bundle: ExportBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interactive-prompt-designer-sessions-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
