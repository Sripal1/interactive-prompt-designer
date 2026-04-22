/**
 * Parse a ReadableStream of SSE (Server-Sent Events) lines into an async iterator
 * of `data:` payloads. Yields each payload string. Stops on `[DONE]`.
 *
 * Normalises line endings (LF / CRLF / bare CR) before scanning for the
 * blank-line separator so it works with every server flavour we've seen.
 */
export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n|\r/g, '\n');

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        for (const line of eventBlock.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          yield payload;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
