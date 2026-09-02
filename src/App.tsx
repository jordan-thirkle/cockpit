import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  isAuthRequired,
  getAuthMe,
  getSessions,
  renameSession,
  deleteSession,
  archiveSession,
  exportSession,
  createSession,
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
const StatusPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.StatusPage })),
);
const GatewayPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.GatewayPage })),
);
const GatewayStatusPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.GatewayStatusPage })),
);
const ConfigDefaultsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ConfigDefaultsPage })),
);
const MemoryProvidersPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.MemoryProvidersPage })),
);
const ToolsetsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ToolsetsPage })),
);
const ModelInfoPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ModelInfoPage })),
);
// Hermes's own solved dashboard pages, vendored into src/hermes/vendor and
// hosted by a thin provider/router adapter (integrate, don't rebuild).
import { HermesModelsPage } from "@/hermes/HermesPages";
import {
  AnalyticsUsagePage,
  AnalyticsModelsPage,
  ConfigPage,
  CronPage,
  McpPage,
  PluginsPage,
  SkillsPage,
  EnvPage,
  FilesPage,
  LogsPage,
  WebhooksPage,
  PairingPage,
  ProfilesPage,
  SystemPage,
  DocsPage,
  ChannelsPage,
} from "@/components/Pages";
// Cockpit-origin panels — code-split so they don't bloat the initial entry chunk.
const AchievementsPage = lazy(() =>
  import("./components/AchievementsPage").then((m) => ({ default: m.AchievementsPage })),
);
const ThreeDViewer = lazy(() =>
  import("./components/ThreeDViewer").then((m) => ({ default: m.ThreeDViewer })),
);
import { ThemeProvider } from "@/themes";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [activeSession, setActiveSession] = useState<SessionInfo | null>(null);
  const [activeRepo, setActiveRepo] = useState<CockpitRepo | null>(null);
  const [newChat, setNewChat] = useState(false);
  const [page, setPage] = useState<string>("organize");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Transition to a fresh new-chat terminal (used by the ended-session view
  // and the SessionList "New chat" affordance — both want the same outcome).
  const [newChatSession, setNewChatSession] = useState<SessionInfo | null>(null);
  const handleNewChat = async () => {
    setNewChat(true);
    setActiveSession(null);
    setActiveRepo(null);
    try {
      const { session_id } = await createSession();
      const all = await getSessions(100, 0, "recent");
      const found = all.sessions.find((s) => s.id === session_id);
      setNewChatSession(found ?? { id: session_id } as SessionInfo);
    } catch {
      setNewChatSession(null);
    }
  };

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
  const refreshSessions = async () => {
    const data = await getSessions(100, 0, "recent");
    setSessions(data.sessions);
  };
  useEffect(() => {
    if (authed !== true) return;
    (async () => {
      await cockpitStore.load();
      await repoStore.load();
      const seen = await cockpitStore.hasSeenOnboarding();
      setShowOnboarding(!seen);
      await refreshSessions();
    })();
  }, [authed]);

  // Live refresh: keep the session list current without a manual reload.
  useEffect(() => {
    if (authed !== true) return;
    const t = setInterval(refreshSessions, 15000);
    return () => clearInterval(t);
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
    <div className={`app${activeSession || newChat || activeRepo ? " with-chat" : ""}`}>
      <button
        className="topbar-burger"
        aria-label="Toggle navigation"
        onClick={() => setMobileNavOpen((v) => !v)}
      >
        ☰
      </button>
      <Sidebar
        activeFolder={activeFolder}
        page={page}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onPage={(p) => {
          setPage(p);
          setMobileNavOpen(false);
        }}
        onSelect={(id) => {
          setActiveFolder(id);
          setMobileNavOpen(false);
        }}
        onOpenRepo={(r) => {
          setActiveRepo(r);
          setActiveSession(null);
          setMobileNavOpen(false);
        }}
        sessionCount={(fid) =>
          fid === "inbox"
            ? sessions.filter((s) => cockpitStore.isUnassigned(s.id)).length
            : fid === "archive"
              ? sessions.filter((s) => !!s.archived).length
              : cockpitStore.getFolder(fid)?.sessionIds.length ?? 0
        }
      />

      {/* Panels render inside a Suspense boundary: each is React.lazy()'d, so
          its code chunk loads on demand and a "Loading…" state shows meanwhile. */}
      <Suspense fallback={<div className="page-state">Loading…</div>}>
      {/* Hermes dashboard pages (endpoint-backed) */}
      {page === "status" && <StatusPage />}
      {page === "gateway" && <GatewayPage />}
      {page === "gateway-status" && <GatewayStatusPage />}
      {page === "config" && <ConfigPage />}
      {page === "config-defaults" && <ConfigDefaultsPage />}
      {page === "env" && <EnvPage />}
      {page === "files" && <FilesPage />}
      {page === "logs" && <LogsPage />}
      {page === "webhooks" && <WebhooksPage />}
      {page === "pairing" && <PairingPage />}
      {page === "plugins" && <PluginsPage />}
      {page === "profiles" && <ProfilesPage />}
      {page === "system" && <SystemPage />}
      {page === "docs" && <DocsPage />}
      {page === "memory-providers" && <MemoryProvidersPage />}
      {page === "cron" && <CronPage />}
      {page === "mcp" && <McpPage />}
      {page === "channels" && <ChannelsPage />}
      {page === "toolsets" && <ToolsetsPage />}
      {page === "model-info" && <ModelInfoPage />}
      {page === "analytics-usage" && <AnalyticsUsagePage />}
      {page === "analytics-models" && <AnalyticsModelsPage />}
      {page === "models" && <HermesModelsPage />}
      {page === "skills" && <SkillsPage />}
      {page === "achievements" && <AchievementsPage />}
      {page === "3d" && <ThreeDViewer />}

      {/* Cockpit's core organizer surface */}
      {page === "organize" && (
        <div className={`list-pane`}>
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
              await refreshSessions();
            }}
            onRefresh={() => refreshSessions()}
            onRename={async (id, title) => {
              await renameSession(id, title);
              await refreshSessions();
            }}
            onDelete={async (id) => {
              await deleteSession(id);
              await refreshSessions();
            }}
            onArchive={async (id, archive) => {
              await archiveSession(id, archive);
              await refreshSessions();
            }}
            onExport={async (id) => {
              const d = await exportSession(id);
              if (d?.markdown) {
                const blob = new Blob([d.markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = Object.assign(document.createElement("a"), {
                  href: url,
                  download: `${id}.md`,
                });
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } else {
                alert("Export returned no content.");
              }
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
      )}

      {page === "control" && (
        <ControlCenter onClose={() => setPage("organize")} />
      )}

      {activeSession && <ChatPanel session={activeSession} onNewChat={handleNewChat} />}
      {activeRepo && <ChatPanel repo={activeRepo} onNewChat={handleNewChat} />}
      {newChat && !activeSession && !activeRepo && <ChatPanel session={newChatSession ?? null} onNewChat={handleNewChat} />}
      </Suspense>
    </div>
    </ThemeProvider>
  );
}
