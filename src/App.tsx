import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
import { ToastHost, showToast, runMutation } from "./components/Toasts";
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
// Hermes dashboard pages (endpoint-backed) — all live in one module, lazy-
// loaded as a single chunk so the 766-line Pages module (plus ui.tsx and
// controlCenterContent.json) stays out of the entry bundle.
const AnalyticsUsagePage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.AnalyticsUsagePage })),
);
const AnalyticsModelsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.AnalyticsModelsPage })),
);
const ConfigPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ConfigPage })),
);
const CronPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.CronPage })),
);
const McpPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.McpPage })),
);
const PluginsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.PluginsPage })),
);
const SkillsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.SkillsPage })),
);
const EnvPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.EnvPage })),
);
const FilesPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.FilesPage })),
);
const LogsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.LogsPage })),
);
const WebhooksPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.WebhooksPage })),
);
const PairingPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.PairingPage })),
);
const ProfilesPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ProfilesPage })),
);
const SystemPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.SystemPage })),
);
const DocsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.DocsPage })),
);
const ChannelsPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.ChannelsPage })),
);
const ControlCenter = lazy(() =>
  import("./components/ControlCenter").then((m) => ({ default: m.ControlCenter })),
);
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
  // Toast the first session-refresh failure only (a backend blip shouldn't
  // spam an error every 15s; recovery resets it).
  const refreshFailedOnce = useRef(false);
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
      showToast("Could not create a new session — is the Hermes backend reachable?");
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
    try {
      const data = await getSessions(100, 0, "recent");
      setSessions(data.sessions);
      refreshFailedOnce.current = false;
    } catch (err) {
      console.warn("refreshSessions failed:", err);
      if (!refreshFailedOnce.current) {
        refreshFailedOnce.current = true;
        showToast("Live session refresh failed — the list may be stale. Retrying every 15s.");
      }
    }
  };
  useEffect(() => {
    if (authed !== true) return;
    (async () => {
      await cockpitStore.load();
      await repoStore.load();
      const loadErr = cockpitStore.getLoadError() ?? repoStore.getLoadError();
      if (loadErr) {
        showToast(
          `Cockpit metadata could not be loaded from the server — folder/repo edits are disabled until you refresh. (${loadErr})`,
        );
      }
      let seen = false;
      try {
        seen = await cockpitStore.hasSeenOnboarding();
      } catch (err) {
        showToast(
          `Could not read the onboarding flag: ${err instanceof Error ? err.message : err}`,
        );
      }
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
    <ToastHost />
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
              await runMutation(async () => {
                await cockpitStore.assignSession(sid, fid);
                await refreshSessions();
              });
            }}
            onRefresh={() => refreshSessions()}
            onRename={async (id, title) => {
              await runMutation(async () => {
                await renameSession(id, title);
                await refreshSessions();
              });
            }}
            onDelete={async (id) => {
              await runMutation(async () => {
                await deleteSession(id);
                await refreshSessions();
              });
            }}
            onArchive={async (id, archive) => {
              await runMutation(async () => {
                await archiveSession(id, archive);
                await refreshSessions();
              });
            }}
            onExport={async (id) => {
              await runMutation(async () => {
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
                  showToast("Export returned no content for this session.");
                }
              });
            }}
          />
          {folder && (
            <>
              <WorkspacePanel
                folder={folder}
                onUpdate={async (patch) => {
                  await runMutation(async () => {
                    await cockpitStore.updateFolder(folder.id, patch);
                    setSessions((p) => [...p]);
                  });
                }}
                onDelete={async () => {
                  await runMutation(async () => {
                    await cockpitStore.deleteFolder(folder.id);
                    setActiveFolder("inbox");
                  });
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

      {activeSession && (
        <ChatPanel
          session={activeSession}
          onNewChat={handleNewChat}
          onClose={() => {
            setActiveSession(null);
            setActiveRepo(null);
            setNewChat(false);
          }}
        />
      )}
      {activeRepo && (
        <ChatPanel
          repo={activeRepo}
          onNewChat={handleNewChat}
          onClose={() => {
            setActiveSession(null);
            setActiveRepo(null);
            setNewChat(false);
          }}
        />
      )}
      {newChat && !activeSession && !activeRepo && (
        <ChatPanel
          session={newChatSession ?? null}
          onNewChat={handleNewChat}
          onClose={() => {
            setActiveSession(null);
            setActiveRepo(null);
            setNewChat(false);
          }}
        />
      )}
      </Suspense>
    </div>
    </ThemeProvider>
  );
}
