#!/usr/bin/env tsx
/**
 * Read one or more exported session-bundle JSON files and print
 * per-mode aggregate metrics to stdout.
 *
 * Usage:
 *   pnpm aggregate path/to/export.json [more.json...]
 */
import { readFileSync } from 'node:fs';
import { computeMetrics } from '../src/logger/export';
import type { Session } from '../src/prompt/schema';

interface Bundle {
  sessions: Session[];
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: pnpm aggregate <export.json> [...]');
    process.exit(1);
  }

  const allSessions: Session[] = [];
  for (const f of files) {
    const raw = readFileSync(f, 'utf-8');
    const bundle = JSON.parse(raw) as Bundle;
    if (!Array.isArray(bundle.sessions)) {
      console.error(`${f}: missing "sessions" array, skipping`);
      continue;
    }
    allSessions.push(...bundle.sessions);
  }

  const m = computeMetrics(allSessions);

  console.log(`Loaded ${allSessions.length} sessions from ${files.length} file(s).\n`);

  console.log('=== Per mode ===');
  for (const mode of ['structured', 'chat'] as const) {
    const g = m.byMode[mode];
    console.log(`\n[${mode}]  n=${g.n}`);
    console.log(`  mean iterations-to-satisfaction: ${fmt(g.meanIterationsToSatisfaction)}`);
    console.log(`  mean duration (ms)             : ${fmt(g.meanDurationMs)}`);
    console.log(`  mean total tokens out          : ${fmt(g.meanTokensOut)}`);
    console.log(`  mean self-reported quality     : ${fmt(g.meanQuality, 2)} / 5`);
  }

  console.log('\n=== Per session ===');
  console.log(
    ['id', 'mode', 'provider', 'model', 'iters', 'ms', 'tokOut', 'q'].join('\t'),
  );
  for (const s of m.perSession) {
    console.log(
      [
        s.id,
        s.mode,
        s.provider,
        s.model,
        s.iterationsToSatisfaction ?? '-',
        s.durationMs,
        s.totalTokensOut,
        s.selfReportedQuality ?? '-',
      ].join('\t'),
    );
  }
}

function fmt(x: number | null, digits = 1): string {
  if (x === null || Number.isNaN(x)) return '—';
  return x.toFixed(digits);
}

main();
