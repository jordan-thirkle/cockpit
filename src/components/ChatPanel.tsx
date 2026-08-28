import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { buildPtyWsUrl, generateChannelId, type SessionInfo } from "@/lib/hermesApi";
import { TraceView } from "./TraceView";

export function ChatPanel({ session }: { session: SessionInfo | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [tab, setTab] = useState<"terminal" | "trace">("terminal");

  useEffect(() => {
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;

    const term = new Terminal({
      fontFamily: "var(--font-mono), monospace",
      fontSize: 13,
      cursorBlink: true,
      // Theme-aware: dark cockpit palette (readable on the surface-2 terminal bg).
      theme: {
        background: "#1e1c19",
        foreground: "#ece7dd",
        cursor: "#be3718",
        selectionBackground: "#34302a",
        black: "#26231f",
        red: "#be3718",
        green: "#56a878",
        yellow: "#c9a227",
        blue: "#6b7d8c",
        magenta: "#a06a8a",
        cyan: "#7fa6a0",
        white: "#a59c8e",
        brightBlack: "#34302a",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(host);

    const doFit = () => {
      try {
        fit.fit();
        wsRef.current?.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
      } catch {
        /* not open yet */
      }
    };
    requestAnimationFrame(doFit);

    let disposed = false;
    const channel = generateChannelId();
    buildPtyWsUrl(channel, { resume: session?.id ?? null })
      .then((url) => {
        if (disposed) return;
        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        ws.onopen = () => {
          term.focus();
          ws.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
        };
        ws.onmessage = (e) => {
          const data =
            typeof e.data === "string" ? e.data : new Uint8Array(e.data);
          term.write(data as any);
        };
        ws.onclose = () => term.write("\r\n\x1b[90m[connection closed]\x1b[0m\r\n");
        term.onData((d) => ws.send(d));
      })
      .catch((err) => term.write(`\r\n\x1b[91m[connect failed: ${err}]\x1b[0m\r\n`));

    const ro = new ResizeObserver(doFit);
    ro.observe(wrap);
    window.addEventListener("resize", doFit);

    return () => {
      disposed = true;
      window.removeEventListener("resize", doFit);
      ro.disconnect();
      wsRef.current?.close();
      term.dispose();
    };
  }, [session?.id]);

  return (
    <section className="chat-pane">
      <div className="chat-head">
        <h2>{session?.title ?? "New chat"}</h2>
        <span className="meta">{session?.model ?? session?.source ?? ""}</span>
        <div className="chat-toolbar">
          <button
            className={tab === "terminal" ? "btn-ghost active" : "btn-ghost"}
            onClick={() => setTab("terminal")}
          >
            Terminal
          </button>
          <button
            className={tab === "trace" ? "btn-ghost active" : "btn-ghost"}
            onClick={() => setTab("trace")}
          >
            Trace
          </button>
        </div>
      </div>
      {tab === "terminal" ? (
        <div className="term-wrap" ref={wrapRef}>
          <div className="terminal" ref={hostRef} />
        </div>
      ) : (
        <div className="trace-wrap">
          <TraceView sessionId={session?.id ?? ""} />
        </div>
      )}
    </section>
  );
}
