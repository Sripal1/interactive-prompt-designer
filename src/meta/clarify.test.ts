import { describe, expect, it } from 'vitest';
import { parseQuestions } from './clarify';

describe('parseQuestions', () => {
  it('parses a well-formed JSON payload', () => {
    const text = JSON.stringify({
      questions: [
        { q: 'Who is the audience?', suggestedComponent: 'context' },
        { q: 'What format?', suggestedComponent: 'format' },
      ],
    });
    expect(parseQuestions(text)).toHaveLength(2);
  });

  it('strips fenced code blocks', () => {
    const text = '```json\n{"questions":[{"q":"A?","suggestedComponent":"task"}]}\n```';
    expect(parseQuestions(text)).toEqual([{ q: 'A?', suggestedComponent: 'task' }]);
  });

  it('returns empty on malformed JSON', () => {
    expect(parseQuestions('not json at all')).toEqual([]);
  });

  it('caps at 3 questions', () => {
    const text = JSON.stringify({
      questions: [1, 2, 3, 4, 5].map((i) => ({
        q: `q${i}`,
        suggestedComponent: 'task',
      })),
    });
    expect(parseQuestions(text)).toHaveLength(3);
  });

  it('tolerates leading prose before JSON', () => {
    const text = 'Here you go:\n{"questions":[{"q":"A?","suggestedComponent":"task"}]}';
    expect(parseQuestions(text)).toEqual([{ q: 'A?', suggestedComponent: 'task' }]);
  });
});
