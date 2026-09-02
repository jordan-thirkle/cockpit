import { useState } from "react";
import { cockpitStore, type CockpitFolder } from "@/lib/cockpitStore";
import { ThemePicker } from "@/themes";
import { Repositories } from "./Repositories";
import { onKeyActivate } from "@/lib/a11y";
import { showToast } from "./Toasts";

type NavItem = { id: string; label: string; group: string };

const PAGES: NavItem[] = [
  { id: "organize", label: "Organize", group: "Cockpit" },
  { id: "control", label: "Control Center", group: "Cockpit" },
  { id: "3d", label: "3D Session Graph", group: "Cockpit" },
  { id: "achievements", label: "Achievements", group: "Cockpit" },
  { id: "skills", label: "Skills", group: "Hermes" },
  { id: "model-info", label: "Model", group: "Hermes" },
  { id: "toolsets", label: "Toolsets", group: "Hermes" },
  { id: "channels", label: "Channels", group: "Hermes" },
  { id: "cron", label: "Cron Jobs", group: "Hermes" },
  { id: "mcp", label: "MCP Servers", group: "Hermes" },
  { id: "webhooks", label: "Webhooks", group: "Hermes" },
  { id: "plugins", label: "Plugins", group: "Hermes" },
  { id: "profiles", label: "Profiles", group: "Hermes" },
  { id: "pairing", label: "Pairing", group: "Hermes" },
  { id: "memory-providers", label: "Memory", group: "Hermes" },
  { id: "analytics-usage", label: "Analytics · Usage", group: "Hermes" },
  { id: "analytics-models", label: "Analytics · Models", group: "Hermes" },
  { id: "config", label: "Config", group: "Hermes" },
  { id: "config-defaults", label: "Config Defaults", group: "Hermes" },
  { id: "env", label: "Environment", group: "Hermes" },
  { id: "files", label: "Files", group: "Hermes" },
  { id: "logs", label: "Logs", group: "Hermes" },
  { id: "gateway", label: "Gateway", group: "Hermes" },
  { id: "gateway-status", label: "Gateway Status", group: "Hermes" },
  { id: "system", label: "System", group: "Hermes" },
  { id: "docs", label: "Docs", group: "Hermes" },
  { id: "status", label: "Status", group: "Hermes" },
];

export function Sidebar({
  activeFolder,
  page,
  mobileOpen,
  onCloseMobile,
  onPage,
  onSelect,
  onOpenRepo,
  sessionCount,
}: {
  activeFolder: string;
  page: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onPage: (p: string) => void;
  onSelect: (id: string) => void;
  onOpenRepo: (repo: import("@/lib/cockpitStore").CockpitRepo) => void;
  sessionCount: (folderId: string) => number;
}) {
  const folders = cockpitStore.getFolders();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  // 27 panels is too many to scan by eye — a local filter (labels only, no
  // renaming/reordering of the nav itself) makes the sidebar navigable.
  const [navQuery, setNavQuery] = useState("");
  const navNeedle = navQuery.trim().toLowerCase();
  const visiblePages = navNeedle
    ? PAGES.filter(
        (p) =>
          p.label.toLowerCase().includes(navNeedle) ||
          p.group.toLowerCase().includes(navNeedle),
      )
    : PAGES;

  const submitNew = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      const f = await cockpitStore.createFolder(n);
      setName("");
      setCreating(false);
      onSelect(f.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  let lastGroup = "";

  return (
    <>
      <div
        className={`sidebar-backdrop${mobileOpen ? " show" : ""}`}
        onClick={onCloseMobile}
        aria-hidden
      />
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
      <div className="sidebar-head">
        <div className="brand">
          <div className="brand-mark">J</div>
          <div>
            <div className="brand-name">Cockpit</div>
            <div className="brand-sub">byjtt.com · Hermes</div>
          </div>
        </div>
        <div className="brand-head-right">
          <ThemePicker />
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="nav-filter">
          <input
            type="search"
            value={navQuery}
            placeholder="Jump to panel…"
            aria-label="Filter panels"
            onChange={(e) => setNavQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter opens the single remaining match — keyboard-first nav.
              if (e.key === "Enter" && visiblePages.length > 0) {
                onPage(visiblePages[0].id);
                setNavQuery("");
              }
              if (e.key === "Escape") setNavQuery("");
            }}
          />
        </div>
        {visiblePages.length === 0 && (
          <div className="nav-empty">No panel matches “{navQuery}”</div>
        )}
        {visiblePages.map((it) => {
          const showGroup = it.group !== lastGroup;
          lastGroup = it.group;
          return (
            <div key={it.id}>
              {showGroup && <div className="nav-group">{it.group}</div>}
              <div
                className={`nav-item${page === it.id ? " active" : ""}`}
                onClick={() => onPage(it.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => onKeyActivate(e, () => onPage(it.id))}
              >
                {it.label}
              </div>
            </div>
          );
        })}

        <div className="nav-group">Folders</div>
        {folders.map((f: CockpitFolder) => (
          <div
            key={f.id}
            className={`folder${f.system ? " system" : ""}${
              activeFolder === f.id ? " active" : ""
            }`}
            onClick={() => {
              onPage("organize");
              onSelect(f.id);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              onKeyActivate(e, () => {
                onPage("organize");
                onSelect(f.id);
              })
            }
          >
            <span className="folder-icon">{f.icon ?? "▦"}</span>
            <span className="folder-name">{f.name}</span>
            <span className="folder-count">{sessionCount(f.id)}</span>
          </div>
        ))}

        {creating ? (
          <div className="folder" style={{ padding: "6px 10px" }}>
            <input
              autoFocus
              value={name}
              placeholder="Folder name…"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
                if (e.key === "Escape") setCreating(false);
              }}
              style={{
                flex: 1,
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                color: "var(--ink)",
                padding: "4px 8px",
                fontSize: 13,
              }}
            />
          </div>
        ) : (
          <div
            className="folder"
            onClick={() => setCreating(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => onKeyActivate(e, () => setCreating(true))}
            style={{ color: "var(--muted)" }}
          >
            <span className="folder-icon">＋</span>
            <span className="folder-name">New folder</span>
          </div>
        )}
      </div>

      <div className="sidebar-foot">
        <span>by JTT</span>
      </div>

      <Repositories onOpenRepo={onOpenRepo} />
    </aside>
    </>
  );
}
