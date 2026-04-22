import Dexie, { type EntityTable } from 'dexie';
import type { Session } from '@/prompt/schema';

class PromptDesignerDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>;

  constructor() {
    super('interactive-prompt-designer');
    this.version(1).stores({
      sessions: 'id, startedAt, mode, provider, model',
    });
  }
}

export const db = new PromptDesignerDB();

export async function saveSession(s: Session): Promise<void> {
  await db.sessions.put(s);
}

export async function listSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray();
}

export async function clearAllSessions(): Promise<void> {
  await db.sessions.clear();
}
