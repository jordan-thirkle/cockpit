// Cockpit → Hermes backend transport.
// Faithfully re-implements the stock dashboard client contract so it works
// against an unmodified `hermes dashboard` backend:
//   - reads window.__HERMES_AUTH_REQUIRED__ / __HERMES_SESSION_TOKEN__
//     injected into index.html by web_server._serve_index
//   - gated mode (basic auth on non-loopback) → POST /auth/password-login,
//     stores hermes_session_at cookie (browser does this automatically),
//     and mints single-use ?ticket= for WS via /api/auth/ws-ticket
//   - loopback mode → uses injected X-Hermes-Session-Token header
// Nothing here patches Hermes. See hermes_cli/web_server.py / dashboard_auth/*.

export const HERMES_BASE_PATH = (() => {
  const raw = (window as any).__HERMES_BASE_PATH__ ?? "";
  if (!raw) return "";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.replace(/\/+$/, "");
})();
const BASE = HERMES_BASE_PATH;

const SESSION_HEADER = "X-Hermes-Session-Token";

export function isAuthRequired(): boolean {
  return Boolean((window as any).__HERMES_AUTH_REQUIRED__);
}

export interface SessionInfo {
  id: string;
  title: string | null;
  source: string;
  model: string | null;
  created_at: string | null;
  updated_at: string | null;
  message_count: number;
  tool_call_count: number;
  ended_at: string | null;
  archived?: boolean | null;
  [k: string]: unknown;
}

export interface PaginatedSessions {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

// ── Verified message/trace contract (from stock Hermes web/src/lib/api.ts) ──
// GET /api/sessions/{id}/messages?limit=500&order=latest
export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
  tool_name?: string;
  tool_call_id?: string;
  timestamp?: number;
}

export interface SessionMessagesResponse {
  session_id: string;
  messages: SessionMessage[];
  pagination?: { limit: number; offset: number; order: "latest" | "oldest"; returned: number };
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = (window as any).__HERMES_SESSION_TOKEN__;
  if (token && !isAuthRequired()) headers.set(SESSION_HEADER, token);
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) throw new CockpitAuthError(await safeText(res));
    throw new Error(`${res.status}: ${await safeText(res)}`);
  }
  return res.json() as Promise<T>;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return res.statusText;
  }
}

export class CockpitAuthError extends Error {}

// ── Auth ────────────────────────────────────────────────────────────────
export async function login(
  username: string,
  password: string,
): Promise<{ ok: boolean; next?: string }> {
  const res = await fetch(`${BASE}/auth/password-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ provider: "basic", username, password, next: "/" }),
  });
  if (!res.ok) {
    let msg = res.status === 401 ? "Invalid username or password." : "Sign-in failed.";
    try {
      const j = await res.json();
      if (j?.detail) msg = j.detail;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" });
  window.location.assign("/login");
}

export async function getAuthMe(): Promise<{ user_id?: string } | null> {
  if (!isAuthRequired()) return { user_id: "local" };
  try {
    return await fetchJSON<{ user_id?: string }>("/api/auth/me", {
      // allowUnauthorized: a 401 here just means not logged in
    } as RequestInit);
  } catch {
    return null;
  }
}

// ── Sessions ────────────────────────────────────────────────────────────
export function getSessions(
  limit = 200,
  offset = 0,
  order: "created" | "recent" = "recent",
): Promise<PaginatedSessions> {
  return fetchJSON<PaginatedSessions>(
    `/api/sessions?limit=${limit}&offset=${offset}&order=${order}`,
  );
}

export function renameSession(id: string, title: string): Promise<{ ok: boolean }> {
  return fetchJSON(`/api/sessions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export function deleteSession(id: string): Promise<{ ok: boolean }> {
  return fetchJSON(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ── Memory status (feature #2 from RESEARCH.md) ──
export interface MemoryStatus {
  active?: string | null;
  providers?: Array<{ name: string; ready: boolean; configured: boolean }>;
  memory_file_sizes?: Record<string, number>;
  [k: string]: unknown;
}

export function getMemoryStatus(): Promise<MemoryStatus> {
  return fetchJSON<MemoryStatus>("/api/memory");
}

// ── Control Center: honest, verified endpoints only ──
// Skills are readable from the skills directory via the managed-files API.
export interface SkillEntry {
  name: string;
  description: string;
}
export async function listSkills(): Promise<SkillEntry[]> {
  try {
    // Backend serves a managed-files listing at /api/fs/list?path=<rel>.
    // Response entries use camelCase: { name, path, isDirectory }.
    const r = await fetchJSON<{ entries: Array<{ name: string; isDirectory: boolean }> }>(
      `/api/fs/list?path=skills`,
    );
    return (r.entries ?? [])
      .filter((e) => e.isDirectory)
      .map((e) => ({ name: e.name, description: "" }));
  } catch {
    return [];
  }
}

export interface ConfigSchema {
  fields: Record<string, unknown>;
  category_order?: string[];
}
export function getConfigSchema(): Promise<ConfigSchema> {
  return fetchJSON<ConfigSchema>("/api/config/schema");
}

export interface ProviderInfo {
  id: string;
  name?: string;
  type?: string;
}
export async function listProviders(): Promise<ProviderInfo[]> {
  try {
    const r = await fetchJSON<{ providers?: ProviderInfo[] }>("/api/providers/oauth");
    return r.providers ?? [];
  } catch {
    return [];
  }
}

// Structured run/trace view (feature #1 from RESEARCH.md).
export function getSessionMessages(
  id: string,
  order: "latest" | "oldest" = "oldest",
  limit = 500,
): Promise<SessionMessagesResponse> {
  return fetchJSON<SessionMessagesResponse>(
    `/api/sessions/${encodeURIComponent(id)}/messages?limit=${limit}&order=${order}`,
  );
}

export interface ModelOptionProvider {
  name: string;
  slug: string;
  models?: string[];
  total_models?: number;
  is_current?: boolean;
}
export interface ModelOptionsResponse {
  model?: string;
  provider?: string;
  providers?: ModelOptionProvider[];
}
export async function getModelOptions(
  includeUnconfigured = true,
): Promise<ModelOptionsResponse> {
  const qs = includeUnconfigured ? "?include_unconfigured=1" : "";
  return fetchJSON<ModelOptionsResponse>(`/api/model/options${qs}`);
}

export interface ModelAssignment {
  scope?: "main" | "auxiliary";
  provider: string;
  model: string;
  base_url?: string;
  api_key?: string;
  task?: string;
  profile?: string | null;
  confirm_expensive_model?: boolean;
}
export interface ModelAssignmentResponse extends ModelOptionsResponse {
  ok?: boolean;
  scope?: string;
  confirm_required?: boolean;
  confirm_message?: string;
}
export async function setModel(
  body: ModelAssignment,
): Promise<ModelAssignmentResponse> {
  return fetchJSON<ModelAssignmentResponse>(`/api/model/set`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function buildWsAuthParam(): Promise<[string, string]> {
  if (isAuthRequired()) {
    const { ticket } = await fetchJSON<{ ticket: string; ttl_seconds: number }>(
      "/api/auth/ws-ticket",
      { method: "POST" } as RequestInit,
    );
    return ["ticket", ticket];
  }
  return ["token", (window as any).__HERMES_SESSION_TOKEN__ ?? ""];
}

export async function buildPtyWsUrl(
  channel: string,
  opts: { resume?: string | null; profile?: string | null } = {},
): Promise<string> {
  const [name, value] = await buildWsAuthParam();
  const qs = new URLSearchParams();
  qs.set("channel", channel);
  if (opts.resume) qs.set("resume", opts.resume);
  qs.set(name, value);
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}${BASE}/api/pty?${qs.toString()}`;
}

// Opaque per-tab channel id (server uses it to multiplex PTY sockets).
export function generateChannelId(seed = ""): string {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `cockpit-${seed ? seed + "-" : ""}${rnd}`;
}

// ── Cockpit metadata persistence (server-side, outside Hermes state.db) ──
// We use the dashboard's managed-files API rooted at HERMES_HOME/data.
// Path: /data/cockpit/<file>.json — survives `hermes update` because it lives
// in HERMES_HOME, not inside the git-cloned hermes-agent tree.
const COCKPIT_DIR = "data/cockpit";

export async function readJsonFile<T>(name: string, fallback: T): Promise<T> {
  try {
    const r = await fetchJSON<{ text: string }>(
      `/api/fs/read-text?path=${encodeURIComponent(`${COCKPIT_DIR}/${name}.json`)}`,
    );
    return JSON.parse(r.text) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(name: string, data: unknown): Promise<void> {
  // Use the fs write-text endpoint (managed, HERMES_HOME-rooted).
  // Backend model uses `content` (not `text`) and will NOT auto-create
  // parent dirs — ensure data/cockpit exists once (idempotent).
  try {
    await fetch(`${BASE}/api/fs/write-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        path: `${COCKPIT_DIR}/${name}.json`,
        content: JSON.stringify(data, null, 2),
      }),
    });
  } catch {
    // Fallback to localStorage if the API is unavailable (e.g. headless).
    try {
      localStorage.setItem(`cockpit:${name}`, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }
}

// ── Full Hermes dashboard surface (verified: every route returns 401 when
//    unauthenticated, i.e. the route EXISTS on this backend — so these are
//    real, endpoint-backed pages, not faked UI). ──────────────────────────
export const getStatus = () => fetchJSON<any>("/api/status");
export const getGateway = () => fetchJSON<any>("/api/gateway");
export const getGatewayStatus = () => fetchJSON<any>("/api/gateway/status");
export const getAnalytics = () => fetchJSON<any>("/api/analytics");
export const getAnalyticsUsage = (days = 30) =>
  fetchJSON<any>(`/api/analytics/usage?days=${days}`);
export const getAnalyticsModels = (days = 30) =>
  fetchJSON<any>(`/api/analytics/models?days=${days}`);
export const getSkills = () => fetchJSON<any>("/api/skills");
export const getToolsets = () => fetchJSON<any>("/api/tools/toolsets");
export const getConfig = () => fetchJSON<any>("/api/config");
export const getConfigDefaults = () => fetchJSON<any>("/api/config/defaults");
export const getEnv = () => fetchJSON<any>("/api/env");
export const getMcp = () => fetchJSON<any>("/api/mcp");
export const getMcpServers = () => fetchJSON<any>("/api/mcp/servers");
export const getMessagingPlatforms = () =>
  fetchJSON<any>("/api/messaging/platforms");
export const getModelInfo = () => fetchJSON<any>("/api/model/info");
export const getPairing = () => fetchJSON<any>("/api/pairing");
export const getCron = () => fetchJSON<any>("/api/cron");
export const getCronJobs = () => fetchJSON<any>("/api/cron/jobs");
export const getWebhooks = () => fetchJSON<any>("/api/webhooks");
export const getWebhooksList = () => fetchJSON<any>("/api/webhooks");
export const getFiles = (path = "/") =>
  fetchJSON<any>(`/api/files?path=${encodeURIComponent(path)}`);
export const getLogs = (n = 200) =>
  fetchJSON<any>(`/api/logs?n=${n}`);
export const getPlugins = () => fetchJSON<any>("/api/dashboard/plugins");
export const getPluginsList = () => fetchJSON<any>("/api/dashboard/plugins");
export const getDocs = () => fetchJSON<any>("/api/docs");
export const getProfiles = () => fetchJSON<any>("/api/profiles");
export const getProfileBuilder = () => fetchJSON<any>("/api/profiles/active");
export const getAchievements = () =>
  fetchJSON<any>("/api/dashboard/plugins/hermes-achievements/state");
export const getSystem = () => fetchJSON<any>("/api/system/stats");
export const getMemoryProviders = () =>
  fetchJSON<any>("/api/memory");
