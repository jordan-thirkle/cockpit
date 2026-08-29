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
export const GatewayPage = () => (
  <ApiPage title="Gateway" subtitle="Messaging gateway connections" fetcher={getGateway} redact={redactSecrets} />
);
export const GatewayStatusPage = () => (
  <ApiPage title="Gateway Status" fetcher={getGatewayStatus} redact={redactSecrets} />
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
