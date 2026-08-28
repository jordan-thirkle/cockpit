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
}) {
  const folders = cockpitStore.getFolders().filter((f) => !f.system || f.id !== "inbox");

  return (
    <>
      <div className="list-head">
        <div className="list-title">{folderName}</div>
        <div className="list-sub">
          {folderSubtitle || `${sessions.length} sessions`}
        </div>
      </div>
      <div className="search">
        <input
          placeholder="Search sessions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-ghost" onClick={onNewChat} title="New chat">
          ＋
        </button>
      </div>

      <div className="session-list">
        {sessions.length === 0 && (
          <div style={{ color: "var(--muted)", padding: "16px 10px", fontSize: 13 }}>
            No sessions here yet.
          </div>
        )}
        {sessions.map((s) => {
          const f = cockpitStore.getFolderForSession(s.id);
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
                <span>{s.model ?? s.source}</span>
                <span>·</span>
                <span>{s.message_count} msgs</span>
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
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
