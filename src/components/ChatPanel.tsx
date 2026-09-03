import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  buildPtyWsUrl,
  generateChannelId,
  getSessionMessages,
  getGatewayClient,
  type SessionInfo,
  type SessionMessage,
} from "@/lib/hermesApi";
import { type CockpitRepo } from "@/lib/cockpitStore";
import { TraceView } from "./TraceView";
import { ModelPicker } from "./ModelPicker";

const REPO_CONTEXT_PREFIX = "\x1b[90m";

// WebSocket close codes we discriminate for UX.
const WS_NORMAL = 1000; // clean close
const WS_GOING_AWAY = 1001;
const WS_ABNORMAL = 1006; // dropped, no close frame (network / crash)
const WS_SERVER_ERROR = 1011;

/** Codes where the drop is plausibly transient and a reconnect is worth offering. */
function isTransientClose(code: number | null): boolean {
  return code === WS_ABNORMAL || code === WS_SERVER_ERROR || code === WS_GOING_AWAY;
}

type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

// Connection state indicator component (moved outside to avoid static component warning)
function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const colors = {
    connecting: "var(--warn)",
    connected: "var(--ok)",
    reconnecting: "var(--warn)",
    disconnected: "var(--danger)",
  };
  const labels = {
    connecting: "Connecting…",
    connected: "Connected",
    reconnecting: "Reconnecting…",
    disconnected: "Disconnected",
  };
  return (
    <span
      className="connection-indicator"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: colors[state],
      }}
      aria-live="polite"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: colors[state],
          flex: "0 0 auto",
        }}
      />
      {labels[state]}
    </span>
  );
}

export function ChatPanel({
  session,
  repo,
  onNewChat,
  onClose,
  sessionId,
}: {
  session?: SessionInfo | null;
  repo?: CockpitRepo | null;
  onNewChat?: () => void;
  /** Present on phone widths, where the chat overlays the whole screen —
   *  without it there is no way back to the session list. */
  onClose?: () => void;
  sessionId?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const gatewayClientRef = useRef<ReturnType<typeof getGatewayClient> | null>(null);
  const [tab, setTab] = useState<"terminal" | "trace">("terminal");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  const isEnded = !!(session?.ended_at);

  // Ended-session transcript.
  const [messages, setMessages] = useState<SessionMessage[] | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Live-connection state.
  const [closeCode, setCloseCode] = useState<number | null>(null);
  const [wsBanner, setWsBanner] = useState<string | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  // Subscribe to gateway client events for connection state
  useEffect(() => {
    const client = getGatewayClient();
    gatewayClientRef.current = client;
    const unsubOpen = client.on("open", () => setConnectionState("connected"));
    const unsubClose = client.on("close", () => setConnectionState("reconnecting"));
    const unsubError = client.on("error", () => setConnectionState("disconnected"));
    return () => {
      unsubOpen();
      unsubClose();
      unsubError();
    };
  }, []);

  // Fetch stored messages for ended sessions (read-only history).
  useEffect(() => {
    if (!isEnded || !session?.id) return;
    const run = async () => {
      setLoadingMessages(true);
      setFetchError(null);
      try {
        const res = await getSessionMessages(session.id, "oldest", 500);
        setMessages(res.messages ?? []);
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Could not load session history.",
        );
        setMessages(null);
      } finally {
        setLoadingMessages(false);
      }
    };
    run();
  }, [isEnded, session?.id]);

  // Live PTY tunnel. Skipped entirely for ended sessions (no live agent process).
  useEffect(() => {
    const host = hostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;
    if (isEnded) return;

    const term = new Terminal({
      fontFamily: "var(--font-mono), monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: "var(--surface)",
        foreground: "var(--ink)",
        cursor: "var(--signal)",
        selectionBackground: "var(--line)",
        black: "var(--surface-2)",
        red: "var(--danger)",
        green: "var(--ok)",
        yellow: "var(--warn)",
        blue: "var(--signal)",
        magenta: "var(--signal)",
        cyan: "var(--signal-soft, var(--signal))",
        white: "var(--ink)",
        brightBlack: "var(--muted)",
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

    buildPtyWsUrl(channel, { resume: sessionId ?? session?.id ?? null })
      .then((url) => {
        if (disposed) return;
        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        ws.onopen = () => {
          setWsBanner(null);
          setConnectionState("connected");
          term.focus();
          ws.send(`\x1b[RESIZE:${term.cols};${term.rows}]`);
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
        ws.onclose = (e) => {
          setCloseCode(e.code);
          setConnectionState("reconnecting");
          if (e.code === WS_NORMAL) {
            term.write(
              "\r\n\x1b[90m[connection closed — session ended]\x1b[0m\r\n",
            );
          } else if (isTransientClose(e.code)) {
            setWsBanner(
              `Connection dropped (code ${e.code}). The terminal is disconnected — reconnect below.`,
            );
          } else {
            setWsBanner(`Connection closed (code ${e.code}).`);
          }
        };
        ws.onerror = () => {
          setConnectionState("disconnected");
        };
        term.onData((d) => ws.send(d));
      })
      .catch((err) => {
        setWsBanner(`Connect failed: ${err}`);
        setConnectionState("disconnected");
        term.write(`\r\n\x1b[91m[connect failed: ${err}]\x1b[0m\r\n`);
      });

    const ro = new ResizeObserver(doFit);
    ro.observe(wrap);
    window.addEventListener("resize", doFit);

    return () => {
      disposed = true;
      window.removeEventListener("resize", doFit);
      ro.disconnect();
      wsRef.current?.close();
      term.dispose();
      setCloseCode(null);
      setConnectionState("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- repo is the
    // store's stable object; repo?.id is the real reconnection key. Adding the
    // object itself would tear down the PTY on unrelated store reloads.
  }, [isEnded, session?.id, sessionId, repo?.id, reconnectNonce]);

  const doReconnect = () => {
    setConnectionState("reconnecting");
    setReconnectNonce((n) => n + 1);
  };

  const title = repo ? `${repo.owner}/${repo.name}` : session?.title ?? "New chat";
  const meta = repo
    ? `GitHub · ${repo.branch}`
    : isEnded
      ? session?.model ? `ended · ${session.model}` : "ended"
      : session?.model ?? session?.source ?? "";

  const openOnGitHub = () => {
    if (repo) window.open(`https://github.com/${repo.owner}/${repo.name}`, "_blank");
  };

  // ── Ended-session view: read-only transcript + honest affordances ──────
  if (isEnded) {
    return (
      <section className="chat-pane">
        <div className="chat-head">
          {onClose && (
            <button className="btn-ghost chat-back" onClick={onClose} aria-label="Back to session list">
              ← Back
            </button>
          )}
          <h2>{title}</h2>
          <span className="meta">{meta}</span>
        </div>

        <div className="session-ended-banner">
          <strong>Session ended</strong>
          {session?.updated_at
            ? ` · last activity ${new Date(session.updated_at).toLocaleString()}`
            : ""}
          {session?.message_count ? ` · ${session.message_count} messages` : ""}
          {session?.tool_call_count && session.tool_call_count > 0
            ? ` · ${session.tool_call_count} tool calls`
            : ""}
        </div>

        <div className="term-wrap" ref={wrapRef}>
          {loadingMessages ? (
            <div className="loading-state">Loading session history…</div>
          ) : fetchError ? (
            <div className="error-state">{fetchError}</div>
          ) : messages && messages.length ? (
            <div className="transcript">
              {messages.map((m, i) => (
                <div key={i} className={`msg msg-${m.role}`}>
                  <span className="msg-role">
                    {m.role}
                    {m.tool_name ? ` · ${m.tool_name}` : ""}
                    {m.tool_call_id ? ` · ${m.tool_call_id}` : ""}
                  </span>
                  <div className="msg-body">
                    {m.content ?? "(no content)"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No stored messages for this session.</div>
          )}
        </div>

        <div className="session-ended-actions">
          <button className="btn-primary" onClick={onNewChat}>
            Start new chat
          </button>
          {repo ? (
            <button className="btn-ghost" onClick={openOnGitHub}>
              Open on GitHub
            </button>
          ) : (
            <button
              className="btn-ghost"
              onClick={() => setShowModelPicker(true)}
              title="Switch the default model for new chats"
            >
              Model
            </button>
          )}
        </div>

        {showModelPicker && (
          <ModelPicker onClose={() => setShowModelPicker(false)} />
        )}
      </section>
    );
  }

  // ── Live session / new chat: terminal (or trace) + connection state ───
  return (
      <section className="chat-pane">
        <div className="chat-head">
          {onClose && (
            <button className="btn-ghost chat-back" onClick={onClose} aria-label="Back to session list">
              ← Back
            </button>
          )}
          <h2>{title}</h2>
        <span className="meta">{meta}</span>
        <div className="chat-toolbar">
          {repo ? (
            <>
              <button
                className="btn-ghost"
                onClick={openOnGitHub}
                title="Open on GitHub"
              >
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
                className={`btn-ghost start-work-btn`}
                onClick={() => {
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
              <button
                className="btn-ghost"
                onClick={() => setShowModelPicker(true)}
                title="Switch the default model for new chats"
              >
                Model
              </button>
            </>
          )}
          <ConnectionIndicator state={connectionState} />
          {closeCode !== null && isTransientClose(closeCode) && (
            <button
              className="btn-ghost"
              onClick={doReconnect}
              title="Reconnect terminal"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {wsBanner && <div className="ws-banner">{wsBanner}</div>}

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

      {showModelPicker && (
        <ModelPicker onClose={() => setShowModelPicker(false)} />
      )}
    </section>
  );
}
