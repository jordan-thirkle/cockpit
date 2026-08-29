import { useState } from "react";
import { cockpitStore, type CockpitFolder } from "@/lib/cockpitStore";
import type { SessionInfo } from "@/lib/hermesApi";

function relTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Human label for a session's origin (where the chat came from).
// The Hermes sessions API returns a `source` string per SessionInfo.
// We map the known values to friendly labels; unknown values pass through.
function sourceLabel(s: SessionInfo): string {
  const raw = s.source ?? "";
  if (!raw) return "chat";
  const key = raw.toLowerCase();
  const map: Record<string, string> = {
    tui: "Terminal",
    terminal: "Terminal",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    web: "Web",
    cron: "Scheduled",
    scheduled: "Scheduled",
    desktop: "Desktop",
    gateway: "Gateway",
    api: "API",
  };
  return map[key] ?? raw;
}

// Filter pill labels, in presentation order. kept short and stable so the
// filter row never grows unbounded as new source values appear upstream.
const FILTER_SOURCES = ["All", "Terminal", "Telegram", "Web", "Scheduled"];

export function SessionList({
  folderName,
  folderSubtitle,
  sessions,
  query,
  setQuery,
  activeId,
  onOpen,
  onNewChat,
  onAssign,
  onRefresh,
  onRename,
  onDelete,
  onArchive,
  onExport,
}: {
  folderName: string;
  folderSubtitle: string;
  sessions: SessionInfo[];
  query: string;
  setQuery: (v: string) => void;
  activeId?: string;
  onOpen: (s: SessionInfo) => void;
  onNewChat: () => void;
  onAssign: (sessionId: string, folderId: string) => void;
  onRefresh?: () => void;
  onRename?: (id: string, title: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string, archive: boolean) => void;
  onExport?: (id: string) => void;
}) {
  const [srcFilter, setSrcFilter] = useState("All");
  const folders = cockpitStore.getFolders().filter((f) => !f.system || f.id !== "inbox");

  // Only filter when a real pill is picked; "All" shows everything.
  const filtered =
    srcFilter === "All"
      ? sessions
      : sessions.filter((s) => sourceLabel(s) === srcFilter);

  return (
    <>
      <div className="list-head">
        <div>
          <div className="list-title">{folderName}</div>
          <div className="list-sub">{folderSubtitle || `${sessions.length} sessions`}</div>
        </div>
      </div>

      <div className="search">
        <input
          placeholder="Search sessions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-ghost" onClick={onRefresh} title="Refresh">↻</button>
        <button className="btn-ghost" onClick={onNewChat} title="New chat">
          ＋
        </button>
      </div>

      <div className="source-filter" role="group" aria-label="Filter sessions by source">
        {FILTER_SOURCES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={srcFilter === s}
            className={srcFilter === s ? "sf-btn active" : "sf-btn"}
            onClick={() => setSrcFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="session-list">
        {filtered.length === 0 && (
          <div style={{ color: "var(--muted)", padding: "16px 10px", fontSize: 13 }}>
            No sessions here yet.
          </div>
        )}
        {filtered.map((s) => {
          const f = cockpitStore.getFolderForSession(s.id);
          const src = sourceLabel(s);
          return (
            <div
              key={s.id}
              className={`session${activeId === s.id ? " active" : ""}`}
              onClick={() => onOpen(s)}
            >
              <div className="session-title">
                <span className="dot" />
                {s.title ?? "(untitled)"}
              </div>
              <div className="session-meta">
                <span className="src-badge">{src}</span>
                {s.model && <span>· {s.model}</span>}
                <span>· {s.message_count} msgs</span>
                {s.tool_call_count > 0 && <span>· {s.tool_call_count} tools</span>}
                {s.updated_at && <span>· {relTime(s.updated_at)}</span>}
                <span
                  className="session-folder-tag"
                  style={{ marginLeft: "auto" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={f?.id ?? "inbox"}
                    onChange={(e) => onAssign(s.id, e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      fontSize: 10,
                    }}
                  >
                    {folders.map((fo: CockpitFolder) => (
                      <option key={fo.id} value={fo.id}>
                        {fo.name}
                      </option>
                    ))}
                    <option value="inbox">Inbox</option>
                    <option value="archive">Archive</option>
                  </select>
                </span>
                <span className="session-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="sa-btn"
                    title="Rename"
                    onClick={() => {
                      const cur = s.title ?? "";
                      const next = prompt("Rename session", cur);
                      if (next != null && next !== cur) onRename?.(s.id, next);
                    }}
                  >✎</button>
                  <button
                    type="button"
                    className="sa-btn"
                    title="Archive"
                    onClick={() => onArchive?.(s.id, !(s.archived ?? false))}
                  >⊟</button>
                  <button
                    type="button"
                    className="sa-btn"
                    title="Export .md"
                    onClick={() => onExport?.(s.id)}
                  >↓</button>
                  <button
                    type="button"
                    className="sa-btn danger"
                    title="Delete"
                    onClick={() => {
                      if (confirm(`Delete session "${s.title ?? "(untitled)"}"? This cannot be undone.`)) onDelete?.(s.id);
                    }}
                  >✕</button>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
