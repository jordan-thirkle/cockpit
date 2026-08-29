import { useEffect, useMemo, useState } from "react";
import {
  isAuthRequired,
  getAuthMe,
  getSessions,
  type SessionInfo,
} from "@/lib/hermesApi";
import { cockpitStore } from "@/lib/cockpitStore";
import { repoStore, type CockpitRepo } from "@/lib/cockpitStore";
import { Onboarding } from "./components/Onboarding";
import { Login } from "./components/Login";
import { Sidebar } from "./components/Sidebar";
import { SessionList } from "./components/SessionList";
import { ChatPanel } from "./components/ChatPanel";
import { ControlCenter } from "./components/ControlCenter";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { ThemeProvider } from "@/themes";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [activeRepo, setActiveRepo] = useState<CockpitRepo | null>(null);
  const [newChat, setNewChat] = useState(false);
  const [view, setView] = useState<"organize" | "control">("organize");
  const [showOnboarding, setShowOnboarding] = useState(false);
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
      await repoStore.load();
      const seen = await cockpitStore.hasSeenOnboarding();
      setShowOnboarding(!seen);
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
    {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
    <div className={`app${activeSession ? " with-chat" : ""}`}>
      <Sidebar
        activeFolder={activeFolder}
        view={view}
        onView={setView}
        onSelect={setActiveFolder}
        onOpenRepo={(r) => {
          setActiveRepo(r);
          setActiveSession(null);
        }}
        sessionCount={(fid) =>
          fid === "inbox"
            ? sessions.filter((s) => cockpitStore.isUnassigned(s.id)).length
            : fid === "archive"
              ? sessions.filter((s) => !!s.archived).length
              : cockpitStore.getFolder(fid)?.sessionIds.length ?? 0
        }
      />

      <div className={`list-pane${view === "control" ? " hidden" : ""}`}>
        <SessionList
          folderName={folder?.name ?? "Sessions"}
          folderSubtitle={folder?.subtitle ?? ""}
          sessions={visible}
          query={query}
          setQuery={setQuery}
          activeId={activeSession?.id}
          onOpen={(s) => {
            setNewChat(false);
            setActiveSession(s);
          }}
          onNewChat={() => {
            setActiveSession(null);
            setActiveRepo(null);
            setNewChat(true);
          }}
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
      {activeRepo && <ChatPanel repo={activeRepo} />}
      {newChat && !activeSession && !activeRepo && <ChatPanel session={null} />}
      {view === "control" && !activeSession && !activeRepo && !newChat && (
        <ControlCenter onClose={() => setView("organize")} />
      )}
    </div>
    </ThemeProvider>
  );
}
