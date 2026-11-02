import { useEffect, useRef, useState } from "react";
import { errorMessage } from "./format.js";
import { lineParser, retryDelay } from "./line-stream.js";

export type LineStreamStatus = "connecting" | "open" | "retrying" | "closed" | "failed";

export interface LineStream {
  /** The newest `maxLines` lines, oldest first. Kept across reconnects. */
  lines: string[];
  /** `retrying` after a network error or 5xx (with backoff), `failed` on any other
   *  non-OK answer (no retry), `closed` when the server ended the stream. */
  status: LineStreamStatus;
  /** Why it is retrying or failed. */
  error?: string;
}

export interface LineStreamOptions {
  /** Headers, credentials and the like for `fetch`. Read at each (re)connect, so a fresh
   *  object per render does not reconnect. */
  init?: Omit<RequestInit, "signal">;
  /** Lines kept; older ones drop off the top. Default 1000. */
  maxLines?: number;
}

/** Follows a streamed response line by line: plain text split at newlines, or Server-Sent
 *  Events (by Content-Type) one `data:` line each. A fetch stream rather than EventSource,
 *  so it can send an Authorization header. Reconnects with backoff (1 s doubling to 30 s)
 *  after network errors and 5xx answers. A `null` url stays closed. Pair it with
 *  `<LogBlock follow>{lines.join("\n")}</LogBlock>`. */
export function useLineStream(url: string | null, { init, maxLines = 1000 }: LineStreamOptions = {}): LineStream {
  const [stream, setStream] = useState<LineStream>({ lines: [], status: url ? "connecting" : "closed" });
  const initRef = useRef(init);
  initRef.current = init;

  useEffect(() => {
    setStream({ lines: [], status: url ? "connecting" : "closed" });
    if (!url) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const append = (more: string[]) => {
      if (more.length) setStream((s) => ({ ...s, lines: [...s.lines, ...more].slice(-maxLines) }));
    };

    async function connect(attempt: number) {
      let problem: string;
      try {
        const res = await fetch(url!, { ...initRef.current, signal: abort.signal });
        if (res.ok) {
          attempt = 0;
          setStream((s) => ({ ...s, status: "open", error: undefined }));
          const parser = lineParser(res.headers.get("content-type")?.startsWith("text/event-stream") ?? false);
          const reader = res.body?.pipeThrough(new TextDecoderStream()).getReader();
          for (;;) {
            const { done, value } = (await reader?.read()) ?? { done: true };
            if (done) break;
            append(parser.push(value));
          }
          append(parser.flush());
          return setStream((s) => ({ ...s, status: "closed" }));
        }
        problem = `${res.status} ${res.statusText}`.trim();
        if (res.status < 500) return setStream((s) => ({ ...s, status: "failed", error: problem }));
      } catch (e) {
        if (abort.signal.aborted) return;
        problem = errorMessage(e, "Connection lost");
      }
      setStream((s) => ({ ...s, status: "retrying", error: problem }));
      timer = setTimeout(() => void connect(attempt + 1), retryDelay(attempt));
    }

    void connect(0);
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [url, maxLines]);

  return stream;
}
