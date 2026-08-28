import { useEffect, useMemo, useState } from "react";
import {
  isAuthRequired,
  getAuthMe,
  getSessions,
  type SessionInfo,
} from "@/lib/hermesApi";
import { cockpitStore } from "@/lib/cockpitStore";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { SessionList } from "./components/SessionList";
import { ChatPanel } from "./components/ChatPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { ThemeProvider } from "@/themes";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [query, setQuery] = useState("");

  // ── auth gate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthRequired()) {
      setAuthed(true);
      return;
    }
    getAuthMe()
      .then((me) => setAuthed(!!me))
      .catch(() => setAuthed(false));
  }, []);

  // ── load store + sessions once authed ──────────────────────────────────
  useEffect(() => {
    if (authed !== true) return;
    (async () => {
      await cockpitStore.load();
      const data = await getSessions(500, 0, "recent");
      setSessions(data.sessions);
    })();
  }, [authed]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      const inFolder =
        activeFolder === "inbox"
          ? cockpitStore.isUnassigned(s.id)
          : activeFolder === "archive"
            ? !!s.archived
            : cockpitStore.getFolderForSession(s.id)?.id === activeFolder;
      const matchQ =
        !q ||
        (s.title ?? "").toLowerCase().includes(q) ||
        (s.model ?? "").toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      return inFolder && matchQ;
    });
  }, [sessions, activeFolder, query]);

  if (authed === null) {
    return <div className="login" />;
  }
  if (authed === false) {
    return <Login onOk={() => setAuthed(true)} />;
  }

  const folder = cockpitStore.getFolder(activeFolder);

  return (
    <ThemeProvider>
    <div className={`app${activeSession ? " with-chat" : ""}`}>
      <Sidebar
        activeFolder={activeFolder}
        onSelect={setActiveFolder}
        sessionCount={(fid) =>
          fid === "inbox"
            ? sessions.filter((s) => cockpitStore.isUnassigned(s.id)).length
            : fid === "archive"
              ? sessions.filter((s) => !!s.archived).length
              : cockpitStore.getFolder(fid)?.sessionIds.length ?? 0
        }
      />

      <div className="list-pane">
        <SessionList
          folderName={folder?.name ?? "Sessions"}
          folderSubtitle={folder?.subtitle ?? ""}
          sessions={visible}
          query={query}
          setQuery={setQuery}
          activeId={activeSession?.id}
          onOpen={(s) => setActiveSession(s)}
          onNewChat={() => setActiveSession(null)}
          onAssign={async (sid, fid) => {
            await cockpitStore.assignSession(sid, fid);
            setSessions((prev) => [...prev]);
          }}
        />
        {folder && (
          <>
            <WorkspacePanel
              folder={folder}
              onUpdate={async (patch) => {
                await cockpitStore.updateFolder(folder.id, patch);
                setSessions((p) => [...p]);
              }}
              onDelete={async () => {
                await cockpitStore.deleteFolder(folder.id);
                setActiveFolder("inbox");
              }}
            />
            <MemoryPanel />
          </>
        )}
      </div>

      {activeSession && <ChatPanel session={activeSession} />}
    </div>
    </ThemeProvider>
  );
}
