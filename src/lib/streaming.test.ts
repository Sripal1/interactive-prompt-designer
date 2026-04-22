import { describe, expect, it } from 'vitest';
import { parseSSE } from './streaming';

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe('parseSSE', () => {
  it('yields data payloads and stops on [DONE]', async () => {
    const stream = streamFrom([
      'data: {"a":1}\n',
      '\n',
      'data: {"a":2}\n\n',
      'data: [DONE]\n\n',
      'data: {"a":3}\n\n',
    ]);
    const out: string[] = [];
    for await (const p of parseSSE(stream)) out.push(p);
    expect(out).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('handles events split across chunk boundaries', async () => {
    const stream = streamFrom(['data: {"he', 'llo":"world"}\n\n']);
    const out: string[] = [];
    for await (const p of parseSSE(stream)) out.push(p);
    expect(out).toEqual(['{"hello":"world"}']);
  });

  it('skips comment lines and keep-alives', async () => {
    const stream = streamFrom([': ping\n\n', 'data: {"x":1}\n\n']);
    const out: string[] = [];
    for await (const p of parseSSE(stream)) out.push(p);
    expect(out).toEqual(['{"x":1}']);
  });

  it('handles CRLF line endings (Gemini style)', async () => {
    const stream = streamFrom([
      'data: {"a":1}\r\n\r\n',
      'data: {"a":2}\r\n\r\n',
    ]);
    const out: string[] = [];
    for await (const p of parseSSE(stream)) out.push(p);
    expect(out).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('handles CRLF split across chunk boundaries', async () => {
    const stream = streamFrom(['data: {"a":1}\r', '\n\r\ndata: {"a":2}\r\n\r\n']);
    const out: string[] = [];
    for await (const p of parseSSE(stream)) out.push(p);
    expect(out).toEqual(['{"a":1}', '{"a":2}']);
  });
});
