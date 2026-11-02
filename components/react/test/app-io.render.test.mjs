// App kit I/O rendered in happy-dom: the router (useRoute, Link, navigate) and useLineStream over a mocked fetch.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createElement as h } from "react";
import { $, act, click, render, window } from "./dom.mjs";
import { Link, matchPath, navigate, setHashRouting, useLineStream, useRoute } from "../dist/index.js";

afterEach(() => {
  setHashRouting(false);
  window.history.replaceState(null, "", "/");
});

function Where() {
  const { path, query } = useRoute();
  const book = matchPath("/books/:id", path);
  return h("output", null, book ? `book ${book.id} tab=${query.get("tab")}` : path);
}

test("useRoute + Link: a plain click navigates in-app; back/forward re-renders", async () => {
  const seen = [];
  const { container: c } = await render(
    h("div", { onClick: (e) => (seen.push(e.defaultPrevented), e.preventDefault()) }, // stop happy-dom loading the href
      h(Link, { to: "/books/7?tab=runs" }, "Dune"), h(Where)),
  );
  const a = $("a", c);
  assert.equal(a.getAttribute("href"), "/books/7?tab=runs");
  assert.equal($("output", c).textContent, "/");
  await click(a);
  assert.equal(window.location.pathname, "/books/7");
  assert.equal($("output", c).textContent, "book 7 tab=runs");
  for (const mod of ["metaKey", "ctrlKey", "shiftKey", "altKey"]) await click(a, { [mod]: true });
  await click(a, { button: 1 });
  assert.deepEqual(seen, [true, false, false, false, false, false], "modified and middle clicks stay with the browser");
  await act(async () => {
    window.history.replaceState(null, "", "/films/");
    window.dispatchEvent(new window.PopStateEvent("popstate"));
  });
  assert.equal($("output", c).textContent, "/films");
});

test("Link: target and download links are left to the browser; replace swaps the entry", async () => {
  const seen = [];
  const { container: c } = await render(
    h("div", { onClick: (e) => (seen.push(e.defaultPrevented), e.preventDefault()) },
      h(Link, { to: "/a", target: "_blank" }, "new tab"), h(Link, { to: "/b", download: "" }, "file"),
      h(Link, { to: "/c", replace: true }, "swap")),
  );
  const length = window.history.length;
  for (const a of c.querySelectorAll("a")) await click(a);
  assert.deepEqual(seen, [false, false, true]);
  assert.equal(window.location.pathname, "/c");
  assert.equal(window.history.length, length, "replace adds no entry");
});

test("setHashRouting: hrefs and the route come from the hash", async () => {
  setHashRouting(true);
  const { container: c } = await render(h("div", null, h(Link, { to: "/books/3" }, "x"), h(Where)));
  assert.equal($("a", c).getAttribute("href"), "#/books/3");
  await click($("a", c));
  assert.equal(window.location.hash, "#/books/3");
  assert.equal($("output", c).textContent, "book 3 tab=null");
  await act(async () => navigate("/films"));
  assert.equal($("output", c).textContent, "/films");
});

// A Response whose body the test writes chunk by chunk.
function streamed(init) {
  let ctl;
  const body = new ReadableStream({ start: (c) => void (ctl = c) });
  const bytes = new TextEncoder();
  return {
    res: new Response(body, init),
    send: (s) => ctl.enqueue(bytes.encode(s)),
    end: () => ctl.close(),
    fail: (e) => ctl.error(e),
  };
}

/** Let fetch and stream reads settle (a macrotask, so it also works under mocked setTimeout). */
const settle = () => act(() => new Promise((r) => setImmediate(r)));

function Tail({ url, opts }) {
  return h("pre", null, JSON.stringify(useLineStream(url, opts)));
}
const state = (c) => JSON.parse(c.textContent);

test("useLineStream: plain lines as they arrive, the tail on close, capped at maxLines", async (t) => {
  const s = streamed({ headers: { "content-type": "text/plain" } });
  const fetch = t.mock.method(globalThis, "fetch", async () => s.res);
  const { container: c } = await render(h(Tail, { url: "/logs", opts: { maxLines: 2, init: { headers: { authorization: "Bearer k" } } } }));
  assert.equal(fetch.mock.calls[0].arguments[1].headers.authorization, "Bearer k");
  await settle();
  assert.deepEqual(state(c), { lines: [], status: "open" });
  s.send("one\ntwo\nthr");
  await settle();
  assert.deepEqual(state(c).lines, ["one", "two"]);
  s.send("ee\nfour");
  s.end();
  await settle();
  assert.deepEqual(state(c), { lines: ["three", "four"], status: "closed" });
});

test("useLineStream: Server-Sent Events by Content-Type, one data line each", async (t) => {
  const s = streamed({ headers: { "content-type": "text/event-stream; charset=utf-8" } });
  t.mock.method(globalThis, "fetch", async () => s.res);
  const { container: c } = await render(h(Tail, { url: "/events" }));
  s.send(": hi\n\ndata: built\n\ndata: deployed\n\n");
  await settle();
  assert.deepEqual(state(c).lines, ["built", "deployed"]);
});

test("useLineStream: retries 5xx and network errors with backoff, keeps lines; a 4xx fails for good", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const live = streamed();
  const answers = [
    () => new Response("", { status: 503, statusText: "Service Unavailable" }),
    () => { throw new TypeError("Failed to fetch"); },
    () => live.res,
    () => new Response("", { status: 404, statusText: "Not Found" }),
  ];
  let calls = 0;
  const fetch = t.mock.method(globalThis, "fetch", async () => answers[calls++]());
  const after = async (ms) => (await act(async () => t.mock.timers.tick(ms)), await settle(), state(c));
  const { container: c } = await render(h(Tail, { url: "/logs" }));
  await settle();
  assert.deepEqual(state(c), { lines: [], status: "retrying", error: "503 Service Unavailable" });
  assert.deepEqual(await after(999), { lines: [], status: "retrying", error: "503 Service Unavailable" });
  assert.deepEqual(await after(1), { lines: [], status: "retrying", error: "Failed to fetch" });
  assert.equal((await after(1999)).status, "retrying", "the second wait is 2 s");
  assert.equal((await after(1)).status, "open");
  live.send("kept\n");
  live.fail(new TypeError("network error")); // the connection drops mid-stream
  await settle();
  assert.deepEqual(state(c), { lines: ["kept"], status: "retrying", error: "network error" });
  assert.deepEqual(await after(1000), { lines: ["kept"], status: "failed", error: "404 Not Found" }, "a good answer resets the backoff");
  await after(60_000);
  assert.equal(fetch.mock.callCount(), 4);
});

test("useLineStream: no url stays closed; unmounting aborts the request", async (t) => {
  let signal;
  const fetch = t.mock.method(globalThis, "fetch", async (_, init) => ((signal = init.signal), streamed().res));
  const { container: c, rerender, unmount } = await render(h(Tail, { url: null }));
  assert.deepEqual(state(c), { lines: [], status: "closed" });
  assert.equal(fetch.mock.callCount(), 0);
  await rerender(h(Tail, { url: "/logs" }));
  await settle();
  assert.equal(signal.aborted, false);
  await unmount();
  assert.equal(signal.aborted, true);
});
