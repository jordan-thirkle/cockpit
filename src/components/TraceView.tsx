import { useEffect, useMemo, useState } from "react";
import {
  getSessionMessages,
  type SessionMessage,
  type SessionMessagesResponse,
} from "@/lib/hermesApi";

type Tab = "trace" | "tools";

function tryParseArgs(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export function TraceView({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<SessionMessagesResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("trace");

  useEffect(() => {
    let alive = true;
    setData(null);
    setErr(null);
    getSessionMessages(sessionId, "oldest", 500)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // Own memo so the toolCalls memo below has stable deps.
  const messages = useMemo(() => data?.messages ?? [], [data]);
  const toolCalls = useMemo(
    () =>
      messages.flatMap((m, i) =>
        (m.tool_calls ?? []).map((tc) => ({ ...tc, msgIndex: i, msg: m })),
      ),
    [messages],
  );

  if (err) return <div className="trace-empty">Could not load trace: {err}</div>;
  if (!data) return <div className="trace-empty">Loading trace…</div>;
  if (messages.length === 0)
    return <div className="trace-empty">No messages in this session yet.</div>;

  return (
    <div className="trace">
      <div className="trace-tabs">
        <button
          className={tab === "trace" ? "active" : ""}
          onClick={() => setTab("trace")}
        >
          Trace ({messages.length})
        </button>
        <button
          className={tab === "tools" ? "active" : ""}
          onClick={() => setTab("tools")}
        >
          Tools ({toolCalls.length})
        </button>
      </div>

      {tab === "trace" ? (
        <div className="trace-feed">
          {messages.map((m, i) => (
            <MessageRow key={i} m={m} />
          ))}
        </div>
      ) : (
        <div className="trace-feed">
          {toolCalls.length === 0 ? (
            <div className="trace-empty">No tool calls recorded.</div>
          ) : (
            toolCalls.map((tc, i) => (
              <div className="tool-row" key={i}>
                <span className="tool-badge">⚙ {tc.function.name}</span>
                <span className="tool-args mono">
                  {JSON.stringify(tryParseArgs(tc.function.arguments)).slice(0, 160)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MessageRow({ m }: { m: SessionMessage }) {
  const roleLabel =
    m.role === "user" ? "You" : m.role === "assistant" ? "Agent" : m.role === "tool" ? "Tool" : "System";
  const isTool = m.role === "tool" || (m.tool_calls && m.tool_calls.length > 0);
  return (
    <div className={`trace-row role-${m.role}`}>
      <div className="trace-role">
        <span className={`role-tag ${isTool ? "tool" : ""}`}>{roleLabel}</span>
      </div>
      <div className="trace-body">
        {m.tool_calls?.map((tc, i) => (
          <div className="tool-chip" key={i}>
            <span className="tool-name">⚙ {tc.function.name}</span>
            <code className="mono">
              {JSON.stringify(tryParseArgs(tc.function.arguments)).slice(0, 200)}
            </code>
          </div>
        ))}
        {m.content && <div className="trace-text">{m.content.slice(0, 2000)}</div>}
        {!m.content && !m.tool_calls && (
          <div className="trace-text muted">(empty)</div>
        )}
      </div>
    </div>
  );
}
