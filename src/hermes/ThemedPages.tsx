// Cockpit-themed structured views for dashboard surfaces that have no
// upstream Hermes page to vendor (the constitutional "integrate, don't
// rebuild" rule only applies where Hermes already solved it). Each page hits
// the real, verified endpoint and renders a clean structured view instead of
// a raw JSON dump, reusing the shared ApiPage loader + Cockpit's own
// .card-grid / .info-card theme primitives.
import { ApiPage, redactSecrets } from "@/components/Page";
import {
  getStatus,
  getGateway,
  getGatewayStatus,
  getConfigDefaults,
  getMemoryProviders,
  getToolsets,
  getModelInfo,
} from "@/lib/hermesApi";

/* ------------------------------------------------------------------ */
/*  Shared structured renderers                                       */
/* ------------------------------------------------------------------ */

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Pick a stable display title out of a loosely-typed record. */
function pickTitle(o: any): string {
  return (
    o?.name ??
    o?.id ??
    o?.key ??
    o?.title ??
    o?.provider ??
    o?.type ??
    "(unnamed)"
  );
}

/** Pick a stable subtitle out of a loosely-typed record. */
function pickSub(o: any): string {
  return (
    o?.description ??
    o?.summary ??
    o?.detail ??
    o?.subtitle ??
    o?.label ??
    ""
  );
}

/** A single key/value cell. */
function KV({ k, v }: { k: string; v: unknown }) {
  return (
    <div className="info-card">
      <div className="info-card-title">{k}</div>
      <div className="info-card-sub">{fmt(v)}</div>
    </div>
  );
}

/** Render an arbitrary record as a definition grid (secrets redacted). */
function RecordGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {}).filter(([k]) => !redactSecrets(k));
  if (entries.length === 0) return <div className="page-state">No data.</div>;
  return (
    <div className="card-grid">
      {entries.map(([k, v]) => (
        <KV key={k} k={k} v={v} />
      ))}
    </div>
  );
}

/** Render a list of records as info-cards (or a value grid if not records). */
function Cards({ items }: { items: unknown[] }) {
  if (items.length === 0) return <div className="page-state">Nothing returned.</div>;
  const records = items.filter((i) => i && typeof i === "object" && !Array.isArray(i)) as any[];
  if (records.length === items.length && records.length > 0) {
    return (
      <div className="card-grid">
        {records.map((o, i) => (
          <div className="info-card" key={o?.id ?? o?.name ?? i}>
            <div className="info-card-title">{fmt(pickTitle(o))}</div>
            {pickSub(o) ? (
              <div className="info-card-sub">{pickSub(o)}</div>
            ) : null}
            {Object.entries(o)
              .filter(([k]) => !redactSecrets(k) && !["name", "id", "key", "title", "provider", "type", "description", "summary", "detail", "subtitle", "label"].includes(k))
              .slice(0, 6)
              .map(([k, v]) => (
                <div className="info-card-meta" key={k}>
                  <strong>{k}:</strong> {fmt(v)}
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }
  // Primitive / mixed list
  return (
    <div className="card-grid">
      {items.map((v, i) => (
        <KV key={i} k={`#${i + 1}`} v={v} />
      ))}
    </div>
  );
}

/** Top-level dispatch: object -> grid, array -> cards, else single cell. */
function renderAny(data: unknown) {
  if (Array.isArray(data)) return <Cards items={data} />;
  if (data && typeof data === "object") return <RecordGrid data={data as Record<string, unknown>} />;
  return <KV k="value" v={data} />;
}

/* ------------------------------------------------------------------ */
/*  Pages                                                             */
/* ------------------------------------------------------------------ */

export const StatusPage = () => (
  <ApiPage
    title="Status"
    subtitle="Hermes runtime + gateway health"
    fetcher={getStatus}
    redact={redactSecrets}
    render={renderAny}
  />
);

export const GatewayPage = () => (
  <ApiPage
    title="Gateway"
    subtitle="Messaging gateway connections"
    fetcher={getGateway}
    redact={redactSecrets}
    render={renderAny}
  />
);

export const GatewayStatusPage = () => (
  <ApiPage
    title="Gateway Status"
    fetcher={getGatewayStatus}
    redact={redactSecrets}
    render={renderAny}
  />
);

export const ConfigDefaultsPage = () => (
  <ApiPage
    title="Config Defaults"
    subtitle="Factory-default configuration values"
    fetcher={getConfigDefaults}
    redact={redactSecrets}
    render={renderAny}
  />
);

export const MemoryProvidersPage = () => (
  <ApiPage
    title="Memory Providers"
    subtitle="Configured memory backends"
    fetcher={getMemoryProviders}
    redact={redactSecrets}
    render={renderAny}
  />
);

export const ToolsetsPage = () => (
  <ApiPage
    title="Toolsets"
    subtitle="Enabled tool categories"
    fetcher={getToolsets}
    redact={redactSecrets}
    render={renderAny}
  />
);

export const ModelInfoPage = () => (
  <ApiPage
    title="Model Info"
    subtitle="Active model + capability metadata"
    fetcher={getModelInfo}
    redact={redactSecrets}
    render={renderAny}
  />
);
