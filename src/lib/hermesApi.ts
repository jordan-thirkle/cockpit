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

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
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
    throw new Error(`${res.status} ${url}: ${await safeText(res)}`);
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

export async function getAuthMe(): Promise<{ user_id?: string } | null> {
  if (!isAuthRequired()) return { user_id: "local" };
  try {
    return await fetchJSON<{ user_id?: string }>("/api/auth/me");
  } catch {
    return null;
  }
}

// ── Sessions ────────────────────────────────────────────────────────────
// Backend caps the /api/sessions LIST limit at 100 (422 if exceeded). Clamp
// here so callers can't accidentally 422 the Chats / 3D Graph panels.
const SESSIONS_LIST_MAX = 100;
export function getSessions(
  limit = SESSIONS_LIST_MAX,
  offset = 0,
  order: "created" | "recent" = "recent",
): Promise<PaginatedSessions> {
  const safeLimit = Math.max(1, Math.min(limit, SESSIONS_LIST_MAX));
  return fetchJSON<PaginatedSessions>(
    `/api/sessions?limit=${safeLimit}&offset=${offset}&order=${order}`,
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

export function archiveSession(id: string, archive = true): Promise<{ ok: boolean }> {
  return fetchJSON(`/api/sessions/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archive }),
  });
}

export function exportSession(id: string): Promise<{ markdown?: string; [k: string]: unknown }> {
  return fetchJSON(`/api/sessions/${encodeURIComponent(id)}/export`);
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
export async function buildWsAuthParam(): Promise<[string, string]> {
  if (isAuthRequired()) {
    const { ticket } = await fetchJSON<{ ticket: string; ttl_seconds: number }>(
      "/api/auth/ws-ticket",
      { method: "POST" },
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
  } catch (err) {
    // 404 = the file simply doesn't exist yet (fresh install): defaults are
    // correct. ANY other failure (401, 500, network) must throw — returning
    // defaults here would put empty defaults in memory and the next persist()
    // would overwrite the user's real saved data with them.
    if (isNotFoundError(err)) return fallback;
    throw err;
  }
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b/.test(msg) || /not[-_ ]?found/i.test(msg);
}

export async function writeJsonFile(name: string, data: unknown): Promise<void> {
  // Use the fs write-text endpoint (managed, HERMES_HOME-rooted).
  // Backend model uses `content` (not `text`) and will NOT auto-create
  // parent dirs. NOTE: do NOT fall back to localStorage on failure — that
  // created a split-brain where the browser "saved" locally but the server
  // file stayed stale, so changes vanished on reload. Surface errors instead.
  const res = await fetch(`${BASE}/api/fs/write-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      path: `${COCKPIT_DIR}/${name}.json`,
      content: JSON.stringify(data, null, 2),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Cockpit could not save "${name}" (HTTP ${res.status}). ` +
        `If this is a fresh install, create the directory data/cockpit/ inside the ` +
        `Hermes working directory first (see README → First run). ${body.slice(0, 160)}`,
    );
  }
}
// ── Full Hermes dashboard surface (verified: every route returns 401 when
//    unauthenticated, i.e. the route EXISTS on this backend — so these are
//    real, endpoint-backed pages, not faked UI). ──────────────────────────
export const getStatus = () => fetchJSON<any>("/api/status");
// NOTE: this dashboard build exposes NO standalone GET /api/gateway or
// /api/gateway/status route (only POST restart/drain/start/stop). The gateway
// state lives inside /api/status (gateway_running, gateway_state, components.
// gateway, ...). Point both reads there rather than 404-ing — never invent a
// backend endpoint (AGENTS.md ONE rule).
export const getGateway = () => fetchJSON<any>("/api/status");
export const getGatewayStatus = () => fetchJSON<any>("/api/status");
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
export const getMcpServers = () => fetchJSON<any>("/api/mcp/servers");
export const getMessagingPlatforms = () =>
  fetchJSON<any>("/api/messaging/platforms");
export const getModelInfo = () => fetchJSON<any>("/api/model/info");
export const getPairing = () => fetchJSON<any>("/api/pairing");
export const getCronJobs = () => fetchJSON<any>("/api/cron/jobs");
export const getWebhooks = () => fetchJSON<any>("/api/webhooks");
export const getPlugins = () => fetchJSON<any>("/api/dashboard/plugins");
export const getProfiles = () => fetchJSON<any>("/api/profiles");
export const getAchievements = () =>
  fetchJSON<any>("/api/dashboard/plugins/hermes-achievements/state");
export const getSystem = () => fetchJSON<any>("/api/system/stats");
export const getMemoryProviders = () =>
  fetchJSON<any>("/api/memory");
export const getFiles = () =>
  fetchJSON<any>("/api/fs/list?path=.");
export const getLogs = (n = 200) =>
  fetchJSON<any>(`/api/logs?n=${n}`);

// ── Docs ──────────────────────────────────────────────────────────────────────
// Hermes ships a real docs tree under <HERMES_HOME>/docs/ (ADRs, design docs,
// RFCS, etc.). It is exposed through the managed-files API already used by the
// Files panel:
//   GET /api/fs/list?path=docs         → directory listing
//   GET /api/fs/read-text?path=docs/X  → file content (content-type aware)
//
// No dedicated /api/docs route exists on any backend, so we ride the existing
// managed-files surface instead of inventing one (AGENTS.md ONE rule).
//
// Response shapes (from the real backend, verified live):
//   list:   { entries: [{ name, path, isDirectory, size?, mtime? }], ... }
//   read:   { text: string, language: string, byteSize: number, ... }
export interface DocEntry {
  name: string;
  path: string;       // full filesystem path (for read-text)
  isDirectory: boolean;
  size?: number | null;
  mtime?: number | null;
  /** Relative path used as the item key + click target (e.g. "ADR.md",
   *  "rfcs/design-doc.md"). */
  rel: string;
}

export interface DocFileContent {
  text: string;
  language: string;
  byteSize: number;
  /** True when the backend reported the file as binary (e.g. a PDF). */
  binary: boolean;
}

/** List the top-level docs tree. Returns folders + markdown files. */
export async function getDocsTree(): Promise<DocEntry[]> {
  const r = await fetchJSON<{ entries?: Array<{ name: string; path: string; isDirectory: boolean; size?: number | null; mtime?: number | null }> }>(
    "/api/fs/list?path=docs",
  );
  const entries = r.entries ?? [];
  return entries.map((e) => ({
    ...e,
    rel: e.name,
  }));
}

/** Read a single docs file by its relative path inside docs/. */
export async function getDocFile(rel: string): Promise<DocFileContent | null> {
  try {
    const r = await fetchJSON<{ text?: string; language?: string; byteSize?: number; binary?: boolean }>(
      `/api/fs/read-text?path=docs/${encodeURIComponent(rel)}`,
    );
    if (!r.text) return null;
    return {
      text: r.text,
      language: r.language ?? "markdown",
      byteSize: r.byteSize ?? 0,
      binary: r.binary ?? false,
    };
  } catch {
    return null;
  }
}

/** Legacy alias kept for any panel still importing getDocs as a single
 *  fetcher that returns the tree. New docs-aware panels call getDocsTree /
 *  getDocFile directly. */
export const getDocs = () => getDocsTree();

// ── JsonRpcGatewayClient (singleton) ─────────────────────────────────────
// Minimal JSON-RPC 2.0 client over the Hermes gateway WebSocket (/api/ws).
// Reuses buildWsAuthParam() for auth (ticket/token modes). No external deps.
// Handles: connect, reconnect with exponential backoff, NDJSON parsing,
// request/response matching via id, event emission (open, close, error, message).

type JsonRpcRequest<T = unknown> = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: T;
};

type GatewayEvent = "open" | "close" | "error" | "message";

class JsonRpcGatewayClient {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000; // 30s cap
  private readonly baseReconnectDelay = 1000; // 1s base
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pending = new Map<string | number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private listeners = new Map<GatewayEvent, Set<(data?: unknown) => void>>();
  private connecting = false;
  private closedIntentionally = false;

  private constructor() {}

  static instance: JsonRpcGatewayClient | null = null;
  static getInstance(): JsonRpcGatewayClient {
    if (!JsonRpcGatewayClient.instance) {
      JsonRpcGatewayClient.instance = new JsonRpcGatewayClient();
    }
    return JsonRpcGatewayClient.instance;
  }

  on<E extends GatewayEvent>(event: E, handler: (data?: unknown) => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler);
    this.listeners.set(event, set);
    return () => {
      set.delete(handler);
    };
  }

  private emit<E extends GatewayEvent>(event: E, data?: unknown) {
    this.listeners.get(event)?.forEach((h) => {
      try {
        h(data);
      } catch {
        /* ignore listener errors */
      }
    });
  }

  private async buildUrl(): Promise<string> {
    const [name, value] = await buildWsAuthParam();
    const qs = new URLSearchParams();
    qs.set(name, value);
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}${BASE}/api/ws?${qs.toString()}`;
  }

  private scheduleReconnect() {
    if (this.closedIntentionally || this.reconnectTimer) return;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) +
        Math.random() * 500,
      this.maxReconnectDelay
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        /* connect() handles its own retry */
      });
    }, delay);
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.connecting) return;
    this.connecting = true;
    this.closedIntentionally = false;

    try {
      this.url = await this.buildUrl();
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.emit("open");
      };

      ws.onmessage = (event) => {
        const text = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
        // Handle NDJSON (multiple JSON objects separated by newlines)
        for (const line of text.trim().split("\n")) {
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg && typeof msg === "object" && "id" in msg) {
              // Response to a request
              const pending = this.pending.get(msg.id);
              if (pending) {
                this.pending.delete(msg.id);
                if ("error" in msg && msg.error) {
                  pending.reject(new Error(msg.error.message ?? "JSON-RPC error"));
                } else {
                  pending.resolve(msg.result);
                }
              }
            } else if (msg && typeof msg === "object" && "method" in msg) {
              // Notification / event from server
              this.emit("message", msg);
            }
          } catch {
            /* ignore parse errors */
          }
        }
      };

      ws.onclose = (e) => {
        this.connecting = false;
        this.ws = null;
        this.emit("close", { code: e.code, reason: e.reason });
        if (!this.closedIntentionally) {
          this.reconnectAttempts++;
          this.scheduleReconnect();
        }
      };

      ws.onerror = (e) => {
        this.emit("error", e);
      };
    } catch (err) {
      this.connecting = false;
      this.emit("error", err);
      if (!this.closedIntentionally) {
        this.reconnectAttempts++;
        this.scheduleReconnect();
      }
      throw err;
    }
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    await this.connect();
    const id = crypto.randomUUID();
    const request: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws?.send(JSON.stringify(request));
      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`JSON-RPC request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  close() {
    this.closedIntentionally = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(1000, "Client closed");
    this.ws = null;
    this.pending.forEach((p) => p.reject(new Error("Gateway client closed")));
    this.pending.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export function getGatewayClient(): JsonRpcGatewayClient {
  return JsonRpcGatewayClient.getInstance();
}

// ── Session creation via JSON-RPC sidecar (same path stock Hermes uses) ──
/**
 * Create a fresh chat session on the backend (JSON-RPC sidecar over /api/ws,
 * same path stock Hermes ChatSidebar uses). Returns the new session id.
 * This is what "New chat" in the cockpit hits so the session shows up in the
 * session list and can be resumed later, rather than spawning an anonymous
 * PTY that never gets a persisted row.
 */
export async function createSession(opts?: { source?: string; profile?: string | null }): Promise<{ session_id: string }> {
  const client = getGatewayClient();
  return client.request("session.create", {
    close_on_disconnect: true,
    source: opts?.source ?? "tool",
    profile: opts?.profile ?? null,
  });
}
