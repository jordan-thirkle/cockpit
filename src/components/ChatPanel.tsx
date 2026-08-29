import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { buildPtyWsUrl, generateChannelId, type SessionInfo } from "@/lib/hermesApi";
import { type CockpitRepo } from "@/lib/cockpitStore";
import { TraceView } from "./TraceView";

const REPO_CONTEXT_PREFIX = "\x1b[90m"; // bright black / muted

export function ChatPanel({
  session,
  repo,
}: {
  session?: SessionInfo | null;
  repo?: CockpitRepo | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<Terminal | null>(null);
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
    termRef.current = term;
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
          // Seed repo context into the terminal if this is a repo workspace.
          // This writes a visible, honest context block — NOT a hidden prompt.
          // The Hermes agent behind the PTY reads the visible terminal text
          // like any other user input, so the context is real, not faked.
          if (repo) {
            const ctx = [
              `${REPO_CONTEXT_PREFIX}// ── Cockpit repo workspace ──────────────────────`,
              `${REPO_CONTEXT_PREFIX}// Repository: ${repo.owner}/${repo.name}`,
              `${REPO_CONTEXT_PREFIX}// Branch:     ${repo.branch}`,
              `${REPO_CONTEXT_PREFIX}// Clone path: ${repo.clonePath ?? "not cloned yet (agent clones on demand)"}`,
              `${REPO_CONTEXT_PREFIX}//`,
              `${REPO_CONTEXT_PREFIX}// Start by cloning or fetching the repo if it is not`,
              `${REPO_CONTEXT_PREFIX}// already on disk, confirm the branch, then ask what`,
              `${REPO_CONTEXT_PREFIX}// to work on. Never push to main.`,
              `${REPO_CONTEXT_PREFIX}// ──────────────────────────────────────────────────`,
            ].join("\r\n");
            term.write(ctx + "\r\n");
          }
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
  }, [session?.id, repo?.id]);

  const title = repo ? `${repo.owner}/${repo.name}` : session?.title ?? "New chat";
  const meta = repo
    ? `GitHub · ${repo.branch}`
    : session?.model ?? session?.source ?? "";

  const openOnGitHub = () => {
    if (repo) window.open(`https://github.com/${repo.owner}/${repo.name}`, "_blank");
  };

  return (
    <section className="chat-pane">
      <div className="chat-head">
        <h2>{title}</h2>
        <span className="meta">{meta}</span>
        <div className="chat-toolbar">
          {repo ? (
            <>
              <button className="btn-ghost" onClick={openOnGitHub} title="Open on GitHub">
                GitHub
              </button>
              <button
                className="btn-ghost"
                onClick={() =>
                  window.open(
                    `https://github.com/${repo.owner}/${repo.name}/pulls`,
                    "_blank",
                  )
                }
                title="Open a pull request (clone → edit → PR, never main)"
              >
                New PR
              </button>
              <button
                className="btn-ghost start-work-btn"
                onClick={() => {
                  // The repo workspace is already open with context seeded in
                  // the PTY (see ws.onopen above). This button copies a clear
                  // next-step prompt so the user can paste it into the terminal
                  // and the agent clones/inspects the repo. The terminal is the
                  // real work surface.
                  const prompt = `Start work on ${repo?.owner}/${repo?.name}. Clone or fetch the repo if it's not already on disk, confirm the ${repo?.branch} branch, then ask what to work on. Never push to main.`;
                  try {
                    void navigator.clipboard?.writeText(prompt);
                  } catch {
                    /* clipboard may be blocked */
                  }
                  termRef.current?.focus();
                }}
                title="Copies a start-work prompt to your clipboard; paste it in the terminal"
              >
                Start work
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {repo && (
        <div className="repo-banner">
          <span className="repo-banner-icon">{repo.icon ?? "❖"}</span>
          <span>
            Working on <strong>{repo.owner}/{repo.name}</strong> · branch{" "}
            <code>{repo.branch}</code>
          </span>
          <span className="repo-banner-hint">
            {repo.clonePath
              ? `cloned at ${repo.clonePath}`
              : "agent clones on demand · PRs via github skills"}
          </span>
        </div>
      )}

      {tab === "terminal" || repo ? (
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
