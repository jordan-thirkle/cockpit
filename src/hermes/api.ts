// Integration shim: lets Hermes's solved page components (copied verbatim
// from hermes-agent/web/src/pages) run against Cockpit's verified transport.
//
// Hermes pages do `import { api } from "@/lib/api"` and call methods like
// `api.getSkills()`, `api.getModelOptions()`, plus import types
// (`SkillInfo`, `ModelOptionProvider`, ...). Cockpit's hermesApi already
// implements the SAME verified /api/* contract, so we re-export it and add
// the handful of name aliases Hermes uses. Where a method is purely
// interactive (install/uninstall a skill) and Cockpit has no equivalent, we
// provide a typed stub that surfaces "not available in Cockpit" rather than
// silently faking a backend call.
//
// This is the constitutional "integrate, don't reinvent" in action: we reuse
// Hermes's shipped UI components and only adapt the thin transport seam.

import * as H from "@/lib/hermesApi";

// Re-export Cockpit's transport under the `api` namespace Hermes pages expect.
const stubMethod = (name: string) => async (..._a: unknown[]) => {
  throw new Error(`api.${name}() is not wired in Cockpit (no verified endpoint).`);
};

// `api` is a Proxy over Cockpit's verified transport: known methods hit the
// real endpoint, unknown ones throw an honest "not wired" error instead of
// silently faking a response.
export const api: any = new Proxy({} as any, {
  get(_t, prop: string) {
    const v = (H as any)[prop];
    if (v !== undefined) return v;
    return stubMethod(prop);
  },
  has() {
    return true;
  },
});

export const HERMES_BASE_PATH = H.HERMES_BASE_PATH;
export const fetchJSON = H.fetchJSON;
export const authedFetch = (url: string, init?: RequestInit) => H.fetchJSON<any>(url, init);
export const buildWsAuthParam = H.buildWsAuthParam;
export const buildWsUrl = async (path: string) => {
  const [name, value] = await H.buildWsAuthParam();
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const base = H.HERMES_BASE_PATH.replace(/\/$/, "");
  const qs = value ? `?${encodeURIComponent(name)}=${encodeURIComponent(value)}` : "";
  return `${proto}//${location.host}${base}${path}${qs}`;
};

// Convenience named re-exports some pages import directly.
export const getSkills = H.getSkills;
export const getModels = H.getModelOptions;
export const getModelOptions = H.getModelOptions;
export const setModel = H.setModel;
export const getCronJobs = H.getCronJobs;
export const getMcpServers = H.getMcpServers;
export const getPlugins = H.getPlugins;
export const getConfig = H.getConfig;
export const getConfigDefaults = H.getConfigDefaults;
export const getConfigSchema = H.getConfigSchema;
export const getMessagingPlatforms = H.getMessagingPlatforms;
export const getAnalyticsUsage = H.getAnalyticsUsage;
export const getAnalyticsModels = H.getAnalyticsModels;
export const getStatus = H.getStatus;
export const getGateway = H.getGateway;
export const getGatewayStatus = H.getGatewayStatus;
export const getEnv = H.getEnv;
export const getToolsets = H.getToolsets;
export const getWebhooks = H.getWebhooks;
export const getPairing = H.getPairing;
export const getProfiles = H.getProfiles;
export const getMemoryStatus = H.getMemoryStatus;
export const getSessions = H.getSessions;
export const getSessionMessages = H.getSessionMessages;

// ── Type aliases Hermes pages import from @/lib/api ──────────────────────
// We keep them loose (any) so vendored pages compile without porting
// Hermes's entire type system. Runtime shapes are verified against the
// backend via the 401/200 route-probe technique.
export type SkillInfo = any;
export type ToolsetInfo = any;
export type SkillHubResult = any;
export type SkillHubSource = any;
export type SkillHubInstalledEntry = any;
export type SkillHubPreview = any;
export type SkillHubScan = any;
export type SkillHubCategory = any;
export type ModelOptionProvider = any;
export type ModelOptionsResponse = any;
export type ModelInfo = any;
export type CronJob = any;
export type CronJobExecution = any;
export type McpServerInfo = any;
export type PluginInfo = any;
export type ConfigSchema = any;
export type ConfigField = any;
export type MessagingPlatform = any;
export type AnalyticsUsage = any;
export type AnalyticsModels = any;
export type GatewayStatus = any;
export type EnvVar = any;
export type ProfileInfo = any;
export type MemoryStatus = any;
export type SessionInfo = H.SessionInfo;
export type SessionMessage = H.SessionMessage;
export type DashboardTheme = any;

// Interactive stubs (Cockpit has no equivalent backend action yet).
// They throw a clear error instead of faking a call.
function notAvailable(fn: string): never {
  throw new Error(`${fn} is not available in Cockpit (no backend action wired).`);
}

export const installSkill = () => notAvailable("installSkill");
export const uninstallSkill = () => notAvailable("uninstallSkill");
export const getSkillHubPreview = () => notAvailable("getSkillHubPreview");
export const scanSkillHub = () => notAvailable("scanSkillHub");
export const createAutomation = () => notAvailable("createAutomation");
export const getAutomationBlueprints = () => notAvailable("getAutomationBlueprints");

// ── Additional loose type aliases used by vendored Hermes pages ──────────
export type AnalyticsResponse = any;
export type AnalyticsDailyEntry = any;
export type AnalyticsModelEntry = any;
export type AnalyticsSkillEntry = any;
export type AuxiliaryModelsResponse = any;
export type AuxiliaryTaskAssignment = any;
export type MoaConfigResponse = any;
export type MoaModelSlot = any;
export type ModelsAnalyticsModelEntry = any;
export type ModelsAnalyticsResponse = any;
export type CronDeliveryTarget = any;
export type HubAgentPluginRow = any;
export type MemoryProviderConfig = any;
export type MemoryProviderField = any;
export type MemoryProviderInfo = any;
export type MemoryProviderSetupInfo = any;
export type MemoryProviderSetupResult = any;
export type PluginsHubResponse = any;
export type McpCatalogDiagnostic = any;
export type McpCatalogEntry = any;
export type McpHttpAuth = any;
export type McpServer = any;
export type McpServerCreate = any;
export type McpTestResult = any;
export type ToolsetConfig = any;
export type ToolsetProvider = any;
export type AutomationBlueprint = any;
export type AutomationBlueprintField = any;
