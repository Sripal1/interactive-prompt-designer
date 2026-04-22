import { describe, expect, it } from 'vitest';
import { computeMetrics } from './export';
import type { Session } from '@/prompt/schema';

function mkSession(mode: 'structured' | 'chat', overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? 'id',
    startedAt: 1000,
    mode,
    provider: 'gemini',
    model: 'gpt-4o-mini',
    events: overrides.events ?? [],
    selfReportedQuality: overrides.selfReportedQuality,
    ...overrides,
  };
}

describe('computeMetrics', () => {
  it('counts only runs before mark-satisfied as iterations-to-satisfaction', () => {
    const s = mkSession('structured', {
      events: [
        { kind: 'run', t: 1100, mode: 'structured', promptChars: 100, latencyMs: 200, provider: 'gemini', model: 'x', tokensOut: 50 },
        { kind: 'run', t: 1200, mode: 'structured', promptChars: 110, latencyMs: 200, provider: 'gemini', model: 'x', tokensOut: 60 },
        { kind: 'mark-satisfied', t: 1300, quality: 4 },
        { kind: 'run', t: 1400, mode: 'structured', promptChars: 120, latencyMs: 200, provider: 'gemini', model: 'x', tokensOut: 70 },
      ],
      selfReportedQuality: 4,
    });
    const m = computeMetrics([s]);
    expect(m.perSession[0].iterationsToSatisfaction).toBe(2);
    expect(m.perSession[0].totalRuns).toBe(3);
  });

  it('groups per-mode and reports mean quality', () => {
    const sessions = [
      mkSession('structured', { selfReportedQuality: 4 }),
      mkSession('structured', { selfReportedQuality: 5 }),
      mkSession('chat', { selfReportedQuality: 3 }),
    ];
    const m = computeMetrics(sessions);
    expect(m.byMode.structured.n).toBe(2);
    expect(m.byMode.structured.meanQuality).toBe(4.5);
    expect(m.byMode.chat.meanQuality).toBe(3);
  });

  it('handles sessions with no mark-satisfied gracefully', () => {
    const s = mkSession('chat', {
      events: [
        { kind: 'run', t: 1100, mode: 'chat', promptChars: 10, latencyMs: 100, provider: 'gemini', model: 'x' },
      ],
    });
    const m = computeMetrics([s]);
    expect(m.perSession[0].iterationsToSatisfaction).toBeNull();
    expect(m.byMode.chat.meanIterationsToSatisfaction).toBeNull();
  });
});
