import { type ReactNode } from "react";
import { ApiPage, redactSecrets } from "./Page";
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
  <ApiPage title="Files" subtitle="Managed file browser (HERMES_HOME rooted)" fetcher={() => getFiles("/")} redact={redactSecrets} />
);
export const LogsPage = () => (
  <ApiPage title="Logs" subtitle="Recent runtime logs" fetcher={() => getLogs(200)} redact={redactSecrets} />
);
export const WebhooksPage = () => (
  <ApiPage title="Webhooks" subtitle="Registered webhook subscriptions" fetcher={getWebhooks} redact={redactSecrets} />
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
export const DocsPage = () => (
  <ApiPage title="Docs" subtitle="Local documentation index" fetcher={getDocs} redact={redactSecrets} />
);
export const MemoryProvidersPage = () => (
  <ApiPage title="Memory Providers" fetcher={getMemoryProviders} redact={redactSecrets} />
);
export const CronPage = () => (
  <ApiPage title="Cron Jobs" subtitle="Scheduled autonomous jobs" fetcher={getCronJobs} redact={redactSecrets} />
);
export const McpPage = () => (
  <ApiPage title="MCP Servers" subtitle="Model Context Protocol servers" fetcher={getMcpServers} redact={redactSecrets} />
);
export const ChannelsPage = () => (
  <ApiPage title="Channels" subtitle="Connected chat surfaces (Telegram, Discord, …)" fetcher={getMessagingPlatforms} redact={redactSecrets} />
);
export const ToolsetsPage = () => (
  <ApiPage title="Toolsets" subtitle="Enabled tool categories" fetcher={getToolsets} redact={redactSecrets} />
);
export const ModelInfoPage = () => (
  <ApiPage title="Model Info" fetcher={getModelInfo} redact={redactSecrets} />
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
        <div className="card-grid">
          {items.length === 0 && <div className="page-state">No skills returned.</div>}
          {items.map((s: any, i: number) => (
            <div className="info-card" key={s?.name ?? i}>
              <div className="info-card-title">{s?.name ?? "(unnamed)"}</div>
              <div className="info-card-sub">
                {s?.description ?? s?.category ?? ""}
              </div>
            </div>
          ))}
        </div>
      );
    }}
  />
);
