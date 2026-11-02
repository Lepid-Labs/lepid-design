// Pure line splitting, SSE parsing and retry timing behind useLineStream, kept DOM-free so
// it can be tested under node:test without a renderer (so it imports nothing — Node runs
// the .ts source and cannot resolve .js specifiers).

export interface LineParser {
  /** Feed decoded text; returns the lines it completed. */
  push(text: string): string[];
  /** The stream ended: returns whatever was left unterminated. */
  flush(): string[];
}

/** Splits a text stream into lines. Plain mode yields every line (blank ones too). SSE mode
 *  (`text/event-stream`) yields the `data:` lines of each event once its blank line arrives,
 *  and skips comments and the id/event/retry fields. A "\r\n" split across chunks is one
 *  break. */
export function lineParser(sse: boolean): LineParser {
  let buffer = "";
  let event: string[] | null = null; // SSE: data lines of the event being read

  function take(line: string, out: string[]) {
    if (!sse) out.push(line);
    else if (line === "") {
      if (event) out.push(...event);
      event = null;
    } else if (line.startsWith("data:")) (event ??= []).push(line.slice(5).replace(/^ /, ""));
  }

  return {
    push(text) {
      buffer += text;
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop()!;
      const out: string[] = [];
      for (const line of parts) take(line, out);
      return out;
    },
    flush() {
      const out: string[] = [];
      if (buffer) take(buffer.replace(/\r$/, ""), out);
      if (sse) take("", out); // an unterminated last event still counts
      buffer = "";
      return out;
    },
  };
}

/** Wait before reconnect `attempt` (0-based): 1 s, doubling, capped at 30 s. */
export function retryDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** attempt);
}
