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
// Cockpit-themed structured views (no upstream Hermes page exists).
import {
  StatusPage,
  GatewayPage,
  GatewayStatusPage,
  ConfigDefaultsPage,
  MemoryProvidersPage,
  ToolsetsPage,
  ModelInfoPage,
} from "@/hermes/ThemedPages";
// Hermes's own solved dashboard pages, vendored into src/hermes/vendor and
// hosted by a thin provider/router adapter (integrate, don't rebuild).
import {
  EnvPage,
  FilesPage,
  LogsPage,
  WebhooksPage,
  PairingPage,
  ProfilesPage,
  SystemPage,
  DocsPage,
  ChannelsPage,
} from "@/hermes/HermesPages2";
// Hermes's own solved dashboard pages, vendored into src/hermes/vendor and
// hosted by a thin provider/router adapter (integrate, don't rebuild).
import {
  HermesAnalyticsPage,
  HermesConfigPage,
  HermesCronPage,
  HermesMcpPage,
  HermesModelsPage,
  HermesPluginsPage,
  HermesSkillsPage,
} from "@/hermes/HermesPages";
import { AchievementsPage } from "./components/AchievementsPage";
import { ThreeDViewer } from "./components/ThreeDViewer";
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

      {/* Hermes dashboard pages (endpoint-backed) */}
      {page === "status" && <StatusPage />}
      {page === "gateway" && <GatewayPage />}
      {page === "gateway-status" && <GatewayStatusPage />}
      {page === "config" && <HermesConfigPage />}
      {page === "config-defaults" && <ConfigDefaultsPage />}
      {page === "env" && <EnvPage />}
      {page === "files" && <FilesPage />}
      {page === "logs" && <LogsPage />}
      {page === "webhooks" && <WebhooksPage />}
      {page === "pairing" && <PairingPage />}
      {page === "plugins" && <HermesPluginsPage />}
      {page === "profiles" && <ProfilesPage />}
      {page === "system" && <SystemPage />}
      {page === "docs" && <DocsPage />}
      {page === "memory-providers" && <MemoryProvidersPage />}
      {page === "cron" && <HermesCronPage />}
      {page === "mcp" && <HermesMcpPage />}
      {page === "channels" && <ChannelsPage />}
      {page === "toolsets" && <ToolsetsPage />}
      {page === "model-info" && <ModelInfoPage />}
      {page === "analytics-usage" && <HermesAnalyticsPage />}
      {page === "analytics-models" && <HermesAnalyticsPage />}
      {page === "models" && <HermesModelsPage />}
      {page === "skills" && <HermesSkillsPage />}
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
      )}

      {page === "control" && (
        <ControlCenter onClose={() => setPage("organize")} />
      )}

      {activeSession && <ChatPanel session={activeSession} />}
      {activeRepo && <ChatPanel repo={activeRepo} />}
      {newChat && !activeSession && !activeRepo && <ChatPanel session={null} />}
    </div>
    </ThemeProvider>
  );
}
