import { useState, useEffect, useMemo, type ReactNode } from "react";
import { ApiPage, redactSecrets } from "./Page";
import { SearchInput, EmptyState, CopyButton } from "./ui";
import {
  getStatus,
  getGateway,
  getGatewayStatus,
  getConfig,
  getConfigDefaults,
  getEnv,
  getFiles,
  getLogs,
  getWebhooks,
  getMessagingPlatforms,
  getPairing,
  getPlugins,
  getProfiles,
  getSystem,
  getDocs,
  getMemoryProviders,
  getCronJobs,
  getMcpServers,
  getSkills,
  getToolsets,
  getModelInfo,
  getAnalyticsUsage,
  getAnalyticsModels,
  type DocEntry,
  type DocFileContent,
  getDocsTree,
  getDocFile,
  fetchJSON,
} from "@/lib/hermesApi";

// ── Simple JSON-backed pages (mirror their Hermes dashboard counterpart) ──
export const StatusPage = () => (
  <ApiPage title="Status" subtitle="Hermes runtime + gateway health" fetcher={getStatus} redact={redactSecrets} />
);
// ── Status tiles (shared by the two Gateway-derived panels) ──
type Tone = "ok" | "warn" | "err" | "muted" | "signal";
const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  err: "var(--danger)",
  muted: "var(--muted)",
  signal: "var(--signal)",
};

// Partial shape of the /api/status payload the Gateway-derived panels consume.
// Typed so a backend field rename surfaces at compile time (not as a silent
// "—"/unknown tile like the original /api/gateway 404 did).
interface StatusPayload {
  gateway_running?: boolean;
  gateway_state?: string;
  gateway_busy?: boolean;
  gateway_drainable?: boolean;
  gateway_mode?: string;
  gateway_exit_reason?: string;
  restart_drain_timeout?: number;
  components?: { gateway?: { status?: string; state?: string } };
  version?: string;
  release_date?: string;
  config_version?: number;
  latest_config_version?: number;
  active_sessions?: number;
  profiles?: string[];
  overall?: string;
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="info-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {tone && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: TONE_COLOR[tone],
              flex: "0 0 auto",
            }}
          />
        )}
        <span className="info-card-title">{label}</span>
      </div>
      <div
        className="info-card-sub"
        style={{
          fontSize: 13,
          marginTop: 8,
          color: tone ? TONE_COLOR[tone] : undefined,
          fontWeight: 600,
          minHeight: "auto",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// Map a known status/state string → tile tone.
const STATUS_TONE: Record<string, Tone> = {
  ok: "ok",
  running: "ok",
  ready: "ok",
  valid: "ok",
  healthy: "ok",
  connected: "ok",
  live: "ok",
  degraded: "warn",
  warn: "warn",
  draining: "warn",
  none: "muted",
  stopped: "err",
  error: "err",
  dead: "err",
  down: "err",
  failed: "err",
  unhealthy: "err",
};
const toneOf = (s: unknown): Tone | undefined =>
  typeof s === "string" ? STATUS_TONE[s.toLowerCase()] : undefined;

// Gateway: focused connection/health view (gateway_* + components.gateway).
export const GatewayPage = () => (
  <ApiPage
    title="Gateway"
    subtitle="Messaging gateway connection + health"
    fetcher={getGateway}
    redact={redactSecrets}
    render={(d: any) => {
      const s = d as StatusPayload;
      const gw = s.components?.gateway ?? {};
      const drain = s.restart_drain_timeout;
      return (
        <div className="card-grid">
          <StatusTile
            label="Running"
            value={s.gateway_running ? "yes" : "no"}
            tone={s.gateway_running ? "ok" : "err"}
          />
          <StatusTile
            label="State"
            value={s.gateway_state ?? "unknown"}
            tone={toneOf(s.gateway_state)}
          />
          <StatusTile
            label="Busy"
            value={s.gateway_busy ? "busy" : "idle"}
            tone={s.gateway_busy ? "warn" : "ok"}
          />
          <StatusTile
            label="Drainable"
            value={s.gateway_drainable ? "yes" : "no"}
            tone={s.gateway_drainable ? "warn" : "muted"}
          />
          <StatusTile
            label="Mode"
            value={s.gateway_mode ?? "unknown"}
            tone={s.gateway_mode && s.gateway_mode !== "none" ? "signal" : "muted"}
          />
          <StatusTile
            label="Restart drain timeout"
            value={typeof drain === "number" ? `${drain}s` : "—"}
            tone="muted"
          />
          <StatusTile
            label="Exit reason"
            value={s.gateway_exit_reason ?? "—"}
            tone={s.gateway_exit_reason ? "warn" : "muted"}
          />
          <StatusTile
            label="Component health"
            value={gw.status ?? "unknown"}
            tone={toneOf(gw.status)}
          />
          <StatusTile
            label="Component state"
            value={gw.state ?? "unknown"}
            tone={toneOf(gw.state)}
          />
        </div>
      );
    }}
  />
);

// Gateway Status: broader runtime + delivery status (non-gateway runtime fields,
// with gateway_running/gateway_state repeated as a quick indicator).
export const GatewayStatusPage = () => (
  <ApiPage
    title="Gateway Status"
    subtitle="Hermes runtime + delivery status"
    fetcher={getGatewayStatus}
    redact={redactSecrets}
    render={(d: any) => {
      const s = d as StatusPayload;
      const cfgUpToDate = s.config_version === s.latest_config_version;
      return (
        <div className="card-grid">
          <StatusTile label="Version" value={s.version ?? "—"} tone="signal" />
          <StatusTile label="Release date" value={s.release_date ?? "—"} tone="muted" />
          <StatusTile
            label="Config version"
            value={
              s.config_version != null
                ? `${s.config_version}${cfgUpToDate ? " (latest)" : ` / latest ${s.latest_config_version}`}`
                : "—"
            }
            tone={cfgUpToDate ? "ok" : "warn"}
          />
          <StatusTile
            label="Active sessions"
            value={typeof s.active_sessions === "number" ? s.active_sessions : "—"}
            tone="signal"
          />
          <StatusTile
            label="Profiles"
            value={Array.isArray(s.profiles) ? s.profiles.join(", ") : "—"}
            tone="muted"
          />
          <StatusTile
            label="Gateway"
            value={s.gateway_running ? "running" : "stopped"}
            tone={s.gateway_running ? "ok" : "err"}
          />
          <StatusTile
            label="Gateway state"
            value={s.gateway_state ?? "unknown"}
            tone={toneOf(s.gateway_state)}
          />
          <StatusTile
            label="Overall"
            value={s.overall ?? "unknown"}
            tone={toneOf(s.overall)}
          />
        </div>
      );
    }}
  />
);
export const ConfigPage = () => (
  <ApiPage title="Config" subtitle="Resolved configuration" fetcher={getConfig} redact={redactSecrets} />
);
export const ConfigDefaultsPage = () => (
  <ApiPage title="Config Defaults" fetcher={getConfigDefaults} redact={redactSecrets} />
);
export const EnvPage = () => (
  <ApiPage title="Environment" subtitle="Environment variables (values redacted)" fetcher={getEnv} redact={redactSecrets} />
);
export const FilesPage = () => (
  <ApiPage title="Files" subtitle="Managed file browser (HERMES_HOME rooted)" fetcher={getFiles} redact={redactSecrets} />
);
export const LogsPage = () => (
  <ApiPage title="Logs" subtitle="Recent runtime logs" fetcher={() => getLogs(200)} redact={redactSecrets} />
);
export const WebhooksPage = () => (
  <ApiPage
    title="Webhooks"
    subtitle="Registered webhook subscriptions"
    fetcher={getWebhooks}
    render={(d: any) => {
      const list = Array.isArray(d) ? d : d?.webhooks ?? d?.entries ?? [];
      const items = Array.isArray(list) ? list : [];
      return (
        <div className="card-grid webhook-grid">
          {items.length === 0 && <div className="page-state">No webhooks configured.</div>}
          {items.map((w: any, i: number) => (
            <div className="info-card webhook-card" key={w?.id ?? w?.name ?? i}>
              <div className="webhook-card-header">
                <span className="webhook-icon">🔗</span>
                <div className="webhook-card-title-row">
                  <div className="info-card-title webhook-title">{w?.name ?? w?.id ?? "(unnamed)"}</div>
                  {w?.enabled === false && <span className="webhook-badge disabled">Inactive</span>}
                  {w?.enabled !== false && <span className="webhook-badge enabled">Active</span>}
                </div>
              </div>
              <div className="info-card-sub webhook-url">
                {w?.url && <code className="webhook-url-code">{w.url}</code>}
              </div>
              {w?.events && Array.isArray(w.events) && w.events.length > 0 && (
                <div className="webhook-events">
                  {w.events.map((e: string, ei: number) => (
                    <span key={ei} className="webhook-event-tag">{e}</span>
                  ))}
                </div>
              )}
              <div className="webhook-meta">
                {w?.secret && <span className="webhook-tag secret">🔐 Secret configured</span>}
                {w?.createdAt && <span className="webhook-tag created">Created: {new Date(w.createdAt).toLocaleDateString()}</span>}
              </div>
              <div className="webhook-actions">
                <button className="btn-ghost btn-sm" title="Test webhook">Test</button>
                <button className="btn-ghost btn-sm" title="Edit webhook">Edit</button>
                <button className="btn-ghost btn-sm" title="View raw JSON">JSON</button>
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
export const PairingPage = () => (
  <ApiPage title="Pairing" subtitle="Device / DM authorization" fetcher={getPairing} redact={redactSecrets} />
);
export const PluginsPage = () => (
  <ApiPage title="Plugins" subtitle="Installed dashboard plugins" fetcher={getPlugins} redact={redactSecrets} />
);
export const ProfilesPage = () => (
  <ApiPage title="Profiles" subtitle="Hermes named profiles" fetcher={getProfiles} redact={redactSecrets} />
);
export const SystemPage = () => (
  <ApiPage title="System" subtitle="Host + dependency report" fetcher={getSystem} redact={redactSecrets} />
);
// ── Docs browser ────────────────────────────────────────────────────────────────
//
// Rides the managed-files API that the Files panel already uses — no new
// backend endpoint (AGENTS.md ONE rule). The backend exposes the real docs/
// tree via:
//   GET /api/fs/list?path=docs         → directory listing
//   GET /api/fs/read-text?path=docs/X  → file content (content-type aware)
//
// If the backend doesn't ship a docs/ tree, degrades to the same calm "not
// available" state as any other optional panel (ApiPage's 404→na handling
// on the tree fetch).
//
// UI: two-panel layout — left = collapsible tree (folders lazy-loaded on
// first open), right = markdown-ish renderer for .md files. Subfolders fetch
// on demand via the same /api/fs/list?path=docs/<rel> surface. Non-text files
// (PDF etc.) show name + size only.


const INLINE_CODE_RE = /`([^`]+)`/g;
const HEADING_RE = /^(#{1,6})\s+(.*)$/gm;
const HR_RE = /^(?:[-*_]\s*){3,}$/gm;

/** DocEntry with optionally-loaded children attached at runtime.
 *  We tack _children on so the recursive DocsTree can render subfolders
 *  without a separate type — the tree only reads it, never passes it back
 *  to the API. */
interface DocEntryWithChildren extends DocEntry {
  _children?: DocEntry[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Guard so the mdFragment trim loop can safely check `.type`/`.props` without
 *  tripping TS on the full `ReactNode` union (strings, promises, portals, …).
 *  Returns `boolean` (no type predicate) so callers narrow via the returned flag
 *  rather than via a bad `n is ...` predicate. */
function isDivNode(n: ReactNode): boolean {
  if (typeof n !== "object" || n === null) return false;
  const o = n as unknown as Record<string, unknown>;
  return o.type === "div" && typeof o.props === "object";
}

function mdFragment(src: string): ReactNode[] {
  const lines: ReactNode[] = [];
  const raw = src.replace(/\r\n?/g, "\n");
  const block = raw.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let codeText = "";
  while (i < block.length) {
    const line = block[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        lines.push(<pre key={`code-${i}`} className="doc-code">{escapeHtml(codeText)}</pre>);
        codeText = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeText = "";
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeText = (codeText ? codeText + "\n" : "") + line;
      i++;
      continue;
    }
    if (HR_RE.test(trimmed)) {
      lines.push(<hr key={`hr-${i}`} className="doc-hr" />);
      i++;
      continue;
    }
    if (trimmed === "") {
      lines.push(<div key={`sp-${i}`} className="doc-spacer" />);
      i++;
      continue;
    }
    const heading = HEADING_RE.exec(trimmed);
    if (heading) {
      lines.push(
        <h2 key={`h-${i}`} className={`doc-h doc-h-${Math.min(heading[1].length, 2)}`}>
          {heading[2]}
        </h2>,
      );
      i++;
      continue;
    }
    lines.push(<p key={`p-${i}`} className="doc-p">{inlineMd(line)}</p>);
    i++;
  }
  if (inCodeBlock && codeText)
    lines.push(<pre key="code-trail" className="doc-code">{escapeHtml(codeText)}</pre>);
  while (
    lines.length &&
    isDivNode(lines[0]) &&
    (lines[0] as any).props?.className === "doc-spacer"
  )
    lines.shift();
  while (
    lines.length &&
    isDivNode(lines[lines.length - 1]) &&
    (lines[lines.length - 1] as any).props?.className === "doc-spacer"
  )
    lines.pop();
  return lines;
}

function inlineMd(text: string): ReactNode {
  const parts = text.split(INLINE_CODE_RE);
  return parts.map((p, i) => {
    if (i % 2 === 1) return <code key={i} className="doc-inline-code">{escapeHtml(p)}</code>;
    return <span key={i}>{linkify(p)}</span>;
  });
}

function linkify(text: string): ReactNode {
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  const segs = text.split(urlRe);
  return segs.map((s, i) => {
    if (i % 2 === 1)
      return <a key={i} href={s} target="_blank" rel="noreferrer noopener" className="doc-link">{s}</a>;
    return escapeHtml(s);
  });
}

function fileIcon(e: DocEntry): ReactNode {
  if (e.name.endsWith(".md") || e.name.endsWith(".markdown"))
    return <span className="doc-icon doc-icon-md">📄</span>;
  if (e.name.endsWith(".pdf")) return <span className="doc-icon doc-icon-pdf">📕</span>;
  if (e.name.endsWith(".svg") || e.name.endsWith(".png") || e.name.endsWith(".jpg"))
    return <span className="doc-icon doc-icon-img">🖼</span>;
  return <span className="doc-icon doc-icon-file">📄</span>;
}

interface DocsTreeProps {
  entries: DocEntryWithChildren[];
  openFile: string | null;
  onOpenFile: (rel: string | null) => void;
  openSubfolder: string | null;
  onToggleSubfolder: (rel: string) => void;
  depth?: number;
}

function DocsTree({ entries, openFile, onOpenFile, openSubfolder, onToggleSubfolder, depth = 0 }: DocsTreeProps) {
  const indent = depth * 12;
  return (
    <div className="doc-tree">
      {entries.map((e) => {
        if (e.isDirectory) {
          const childCount = (e._children ?? []).length;
          return (
            <div key={e.rel} className="doc-folder" style={{ paddingLeft: indent }}>
              <button
                type="button"
                className="doc-folder-head"
                onClick={() => onToggleSubfolder(e.rel)}
                aria-expanded={openSubfolder === e.rel}
              >
                <span className="doc-folder-caret">{openSubfolder === e.rel ? "▾" : "▸"}</span>
                <span className="doc-folder-icon">📁</span>
                <span className="doc-folder-name">{e.name}</span>
                {childCount > 0 && <span className="doc-folder-count">{childCount}</span>}
              </button>
              {openSubfolder === e.rel && e._children && (
                <DocsTree
                  entries={e._children}
                  openFile={openFile}
                  onOpenFile={onOpenFile}
                  openSubfolder={openSubfolder}
                  onToggleSubfolder={onToggleSubfolder}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        }
        return (
          <button
            key={e.rel}
            type="button"
            className={`doc-file${openFile === e.rel ? " open" : ""}`}
            style={{ paddingLeft: indent }}
            onClick={() => onOpenFile(openFile === e.rel ? null : e.rel)}
            title={e.size != null ? `${e.size.toLocaleString()} bytes` : undefined}
          >
            <span className="doc-file-icon">{fileIcon(e)}</span>
            <span className="doc-file-name">{e.name}</span>
            {openFile === e.rel && <span className="doc-file-open-badge">open</span>}
          </button>
        );
      })}
    </div>
  );
}

interface DocReaderProps {
  rel: string;
  onClose: () => void;
  byteSize?: number | null;
}

function DocReader({ rel, onClose, byteSize }: DocReaderProps) {
  const [content, setContent] = useState<DocFileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getDocFile(rel)
      .then((c) => {
        if (!alive) return;
        if (!c) { setError("Could not read the file."); setLoading(false); return; }
        setContent(c);
        setLoading(false);
      })
      .catch((e) => { if (!alive) return; setError(e?.message ?? String(e)); setLoading(false); });
    return () => { alive = false; };
  }, [rel]);
  if (loading)
    return (
      <div className="doc-reader">
        <div className="doc-reader-head">
          <button type="button" className="doc-back-btn" onClick={onClose}>← Back to tree</button>
          <span className="doc-reader-title">{rel}</span>
        </div>
        <div className="page-state"><span className="spinner" aria-hidden /> Loading…</div>
      </div>
    );
  if (error || !content)
    return (
      <div className="doc-reader">
        <div className="doc-reader-head">
          <button type="button" className="doc-back-btn" onClick={onClose}>← Back to tree</button>
          <span className="doc-reader-title">{rel}</span>
        </div>
        <div className="page-state err">{error ?? "Could not load this document."}</div>
      </div>
    );
  if (content.binary || content.language === "binary" || content.text.trim() === "") {
    const sz = byteSize != null ? byteSize.toLocaleString() : content.byteSize.toLocaleString();
    return (
      <div className="doc-reader">
        <div className="doc-reader-head">
          <button type="button" className="doc-back-btn" onClick={onClose}>← Back to tree</button>
          <span className="doc-reader-title">{rel}</span>
        </div>
        <div className="doc-binary-state">
          <EmptyState title={`${rel} — binary or empty`} hint={`${sz} bytes · not rendered as text`} />
        </div>
      </div>
    );
  }
  const langLabel = content.language && content.language !== "markdown" ? ` · ${content.language}` : "";
  return (
    <div className="doc-reader">
      <div className="doc-reader-head">
        <button type="button" className="doc-back-btn" onClick={onClose}>← Back to tree</button>
        <span className="doc-reader-title">
          {rel}
          <span className="doc-reader-meta">{content.byteSize.toLocaleString()} bytes{langLabel}</span>
        </span>
        <CopyButton value={content.text} label="Copy text" title={`Copy ${content.text.length.toLocaleString()} characters`} />
      </div>
      <div className="doc-body">{mdFragment(content.text)}</div>
    </div>
  );
}

export const DocsPage = () => {
  const [tree, setTree] = useState<DocEntry[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [openSubfolder, setOpenSubfolder] = useState<string | null>(null);
  const [treeFilter, setTreeFilter] = useState("");
  const [subfolderContents, setSubfolderContents] = useState<Map<string, DocEntry[]>>(() => new Map());

  const needle = treeFilter.trim().toLowerCase();

  // fetch root docs tree on mount
  useEffect(() => {
    let alive = true;
    getDocsTree()
      .then((entries) => {
        if (!alive) return;
        setTree(entries);
        setTreeLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setTreeError(e?.message ?? String(e));
        setTreeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // lazy-load a subfolder the first time it's opened
  useEffect(() => {
    if (!openSubfolder || subfolderContents.has(openSubfolder)) return;
    let alive = true;
    fetchJSON<{
      entries?: Array<{
        name: string;
        path: string;
        isDirectory: boolean;
        size?: number | null;
        mtime?: number | null;
      }>;
    }>(`/api/fs/list?path=docs/${encodeURIComponent(openSubfolder)}`)
      .then((r) => {
        if (!alive) return;
        const kids = (r.entries ?? []).map((e) => ({
          ...e,
          rel: `${openSubfolder}/${e.name}`,
        }));
        setSubfolderContents((prev) => new Map(prev).set(openSubfolder, kids));
      })
      .catch(() => {
        if (!alive) return;
        setSubfolderContents((prev) => new Map(prev).set(openSubfolder, []));
      });
    return () => {
      alive = false;
    };
  }, [openSubfolder, subfolderContents]);

  // merge loaded subfolder children into the render tree
  const renderTree: DocEntryWithChildren[] = useMemo(() => {
    const out: DocEntryWithChildren[] = [];
    for (const e of tree) {
      const kids = subfolderContents.get(e.rel);
      out.push(kids ? { ...e, _children: kids } : e);
    }
    return out;
  }, [tree, subfolderContents]);

  // filter the *rendered* tree (which has _children attached) so we can search
  // inside folders too, without tripping TS on DocEntry._children.
  const filteredTree: DocEntryWithChildren[] = needle
    ? renderTree.filter(
        (e) =>
          e.name.toLowerCase().includes(needle) ||
          (e._children ?? []).some((c) => c.name.toLowerCase().includes(needle)),
      )
    : renderTree;

  if (treeLoading)
    return (
      <div className="page">
        <header className="page-head">
          <div className="page-head-row">
            <div>
              <h1>Docs</h1>
              <p className="page-sub">Local documentation index — filter by title or path</p>
            </div>
          </div>
        </header>
        <div className="page-state"><span className="spinner" aria-hidden /> Loading docs tree…</div>
      </div>
    );

  if (treeError || tree.length === 0)
    return (
      <ApiPage
        title="Docs"
        subtitle="Local documentation index — filter by title or path"
        fetcher={getDocs}
        redact={redactSecrets}
        notAvailableMessage="Local documentation isn't shipped in this Hermes build."
        unit="documents"
        emptyTitle="No documents indexed"
        emptyHint="This Hermes build did not ship a local docs index."
      />
    );

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-row">
          <div>
            <h1>Docs</h1>
            <p className="page-sub">Local documentation index — filter by title or path</p>
          </div>
          <div className="page-head-actions">
            <CopyButton value={tree} label="Copy tree" />
          </div>
        </div>
        <div className="doc-search-row">
          <SearchInput value={treeFilter} onChange={setTreeFilter} placeholder="Filter docs…" ariaLabel="Filter docs" />
        </div>
      </header>
      <div className="doc-layout">
        <div className="doc-tree-panel">
          {treeFilter && (
            <div className="doc-filter-info">Showing {filteredTree.length} of {tree.length} top-level items</div>
          )}
          <DocsTree
            entries={filteredTree.length ? filteredTree : renderTree}
            openFile={openFile}
            onOpenFile={setOpenFile}
            openSubfolder={openSubfolder}
            onToggleSubfolder={setOpenSubfolder}
          />
          {treeFilter && filteredTree.length === 0 && (
            <div className="doc-empty-filter">No match for <span className="doc-filter-q">“{treeFilter}”</span></div>
          )}
        </div>
        <div className="doc-reader-panel">
          {openFile ? (
            <DocReader rel={openFile} onClose={() => setOpenFile(null)} byteSize={tree.find((e) => e.rel === openFile)?.size} />
          ) : (
            <div className="doc-reader-placeholder">
              <div className="doc-reader-placeholder-icon">📄</div>
              <div className="doc-reader-placeholder-title">Select a document</div>
              <div className="doc-reader-placeholder-hint">Pick a file from the tree to read it here. Folders expand inline.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export const MemoryProvidersPage = () => (
  <ApiPage title="Memory Providers" fetcher={getMemoryProviders} redact={redactSecrets} />
);
export const CronPage = () => (
  <ApiPage
    title="Cron Jobs"
    subtitle="Scheduled autonomous jobs"
    fetcher={getCronJobs}
    render={(d: any) => {
      const list = Array.isArray(d) ? d : d?.jobs ?? d?.entries ?? [];
      const items = Array.isArray(list) ? list : [];
      return (
        <div className="card-grid cron-grid">
          {items.length === 0 && <div className="page-state">No cron jobs configured.</div>}
          {items.map((j: any, i: number) => (
            <div className="info-card cron-card" key={j?.name ?? j?.id ?? i}>
              <div className="cron-card-header">
                <span className="cron-icon">⏰</span>
                <div className="cron-card-title-row">
                  <div className="info-card-title cron-title">{j?.name ?? j?.id ?? "(unnamed)"}</div>
                  {j?.enabled === false && <span className="cron-badge disabled">Paused</span>}
                  {j?.enabled !== false && <span className="cron-badge enabled">Active</span>}
                </div>
              </div>
              <div className="info-card-sub cron-schedule">
                {j?.schedule && <span className="cron-tag schedule">📅 {j.schedule}</span>}
                {j?.timezone && <span className="cron-tag tz">🌍 {j.timezone}</span>}
              </div>
              {j?.lastRun && (
                <div className="info-card-sub cron-last-run">
                  Last run: {new Date(j.lastRun).toLocaleString()}
                  {j?.lastRunStatus && <span className={`cron-status ${j.lastRunStatus}`}>({j.lastRunStatus})</span>}
                </div>
              )}
              <div className="cron-actions">
                <button className="btn-ghost btn-sm" title="Run now">Run</button>
                <button className="btn-ghost btn-sm" title="Edit cron job">Edit</button>
                <button className="btn-ghost btn-sm" title="View raw JSON">JSON</button>
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
export const McpPage = () => (
  <ApiPage
    title="MCP Servers"
    subtitle="Model Context Protocol servers"
    fetcher={getMcpServers}
    render={(d: any) => {
      const list = Array.isArray(d) ? d : d?.servers ?? d?.entries ?? [];
      const items = Array.isArray(list) ? list : [];
      return (
        <div className="card-grid mcp-grid">
          {items.length === 0 && <div className="page-state">No MCP servers configured.</div>}
          {items.map((s: any, i: number) => (
            <div className="info-card mcp-card" key={s?.name ?? s?.id ?? i}>
              <div className="mcp-card-header">
                <span className="mcp-icon">🔌</span>
                <div className="mcp-card-title-row">
                  <div className="info-card-title mcp-title">{s?.name ?? s?.id ?? "(unnamed)"}</div>
                  {s?.status === "connected" && <span className="mcp-badge connected">Connected</span>}
                  {s?.status === "disconnected" && <span className="mcp-badge disconnected">Disconnected</span>}
                  {s?.status === "error" && <span className="mcp-badge error">Error</span>}
                  {!s?.status && <span className="mcp-badge unknown">Unknown</span>}
                </div>
              </div>
              <div className="info-card-sub mcp-transport">
                {s?.transport && <span className="mcp-tag">{s.transport}</span>}
                {s?.command && <span className="mcp-tag cmd">{s.command}</span>}
                {s?.url && <span className="mcp-tag url">{s.url}</span>}
              </div>
              {s?.tools && Array.isArray(s.tools) && s.tools.length > 0 && (
                <div className="mcp-tools">
                  {s.tools.map((tool: any, ti: number) => (
                    <span key={ti} className="tool-tag">{typeof tool === "string" ? tool : tool?.name ?? "tool"}</span>
                  ))}
                </div>
              )}
              <div className="mcp-actions">
                <button className="btn-ghost btn-sm" title="Reconnect">Reconnect</button>
                <button className="btn-ghost btn-sm" title="Edit MCP server">Edit</button>
                <button className="btn-ghost btn-sm" title="View raw JSON">JSON</button>
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
export const ChannelsPage = () => (
  <ApiPage title="Channels" subtitle="Connected chat surfaces (Telegram, Discord, …)" fetcher={getMessagingPlatforms} redact={redactSecrets} />
);
export const ToolsetsPage = () => (
  <ApiPage
    title="Toolsets"
    subtitle="Enabled tool categories"
    fetcher={getToolsets}
    render={(d: any) => {
      const list = Array.isArray(d) ? d : d?.toolsets ?? d?.entries ?? [];
      const items = Array.isArray(list) ? list : [];
      return (
        <div className="card-grid toolset-grid">
          {items.length === 0 && <div className="page-state">No toolsets configured.</div>}
          {items.map((t: any, i: number) => (
            <div className="info-card toolset-card" key={t?.name ?? t?.id ?? i}>
              <div className="toolset-card-header">
                <span className="toolset-icon">🔧</span>
                <div className="toolset-card-title-row">
                  <div className="info-card-title toolset-title">{t?.name ?? t?.id ?? "(unnamed)"}</div>
                  {t?.enabled === false && <span className="toolset-badge disabled">Disabled</span>}
                  {t?.enabled !== false && <span className="toolset-badge enabled">Enabled</span>}
                </div>
              </div>
              <div className="info-card-sub toolset-description">
                {t?.description ?? t?.category ?? ""}
              </div>
              {t?.tools && Array.isArray(t.tools) && (
                <div className="toolset-tools">
                  {t.tools.map((tool: any, ti: number) => (
                    <span key={ti} className="tool-tag">{typeof tool === "string" ? tool : tool?.name ?? "tool"}</span>
                  ))}
                </div>
              )}
              <div className="toolset-actions">
                <button className="btn-ghost btn-sm" title="Configure toolset">Configure</button>
                <button className="btn-ghost btn-sm" title="View raw JSON">JSON</button>
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
export const ModelInfoPage = () => (
  <ApiPage
    title="Model Info"
    subtitle="Configured models & providers"
    fetcher={getModelInfo}
    render={(d: any) => {
      const list = Array.isArray(d) ? d : d?.models ?? d?.entries ?? [];
      const items = Array.isArray(list) ? list : [];
      return (
        <div className="card-grid model-grid">
          {items.length === 0 && <div className="page-state">No models configured.</div>}
          {items.map((m: any, i: number) => (
            <div className="info-card model-card" key={m?.name ?? m?.id ?? i}>
              <div className="model-card-header">
                <span className="model-icon">🤖</span>
                <div className="model-card-title-row">
                  <div className="info-card-title model-title">{m?.name ?? m?.id ?? "(unnamed)"}</div>
                  {m?.provider && <span className="model-provider">{m.provider}</span>}
                </div>
              </div>
              <div className="info-card-sub model-meta">
                {m?.model && <span className="model-tag">Model: {m.model}</span>}
                {m?.context && <span className="model-tag">Context: {m.context.toLocaleString()}</span>}
                {m?.temperature != null && <span className="model-tag">Temp: {m.temperature}</span>}
              </div>
              <div className="model-actions">
                <button className="btn-ghost btn-sm" title="Edit model">Edit</button>
                <button className="btn-ghost btn-sm" title="View raw JSON">JSON</button>
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
export const AnalyticsUsagePage = () => (
  <ApiPage title="Analytics · Usage" subtitle="Usage over time" fetcher={() => getAnalyticsUsage(30)} redact={redactSecrets} />
);
export const AnalyticsModelsPage = () => (
  <ApiPage title="Analytics · Models" subtitle="Model breakdown" fetcher={() => getAnalyticsModels(30)} redact={redactSecrets} />
);

// Skills: richer — list names + let user inspect (raw JSON fallback for detail).
export const SkillsPage = () => (
  <ApiPage
    title="Skills"
    subtitle="Installed Hermes skills"
    fetcher={getSkills}
    render={(d: any) => {
      const list = Array.isArray(d) ? d : d?.skills ?? d?.entries ?? [];
      const items = Array.isArray(list) ? list : [];
      return (
        <div className="card-grid skills-grid">
          {items.length === 0 && <div className="page-state">No skills returned.</div>}
          {items.map((s: any, i: number) => (
            <div className="info-card skill-card" key={s?.name ?? i}>
              <div className="skill-card-header">
                <span className="skill-icon">🧠</span>
                <div className="skill-card-title-row">
                  <div className="info-card-title skill-title">{s?.name ?? "(unnamed)"}</div>
                  {s?.version && <span className="skill-version">{s.version}</span>}
                </div>
              </div>
              <div className="info-card-sub skill-description">
                {s?.description ?? s?.category ?? ""}
              </div>
              {s?.category && (
                <div className="skill-meta">
                  <span className="skill-tag">{s.category}</span>
                  {s?.author && <span className="skill-tag">by {s.author}</span>}
                </div>
              )}
              <div className="skill-actions">
                <button className="btn-ghost btn-sm" title="View raw JSON">JSON</button>
                <button className="btn-ghost btn-sm" title="Open skill folder">Open</button>
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
