import { useEffect, useRef, useState, type ReactNode } from "react";
import { CopyButton, DataView } from "./ui";

export interface ApiPageProps {
  title: string;
  subtitle?: string;
  fetcher: () => Promise<any>;
  /** Render the loaded data. If omitted, pretty-printed JSON is shown. */
  render?: (data: any) => ReactNode;
  /** Filter the JSON dump (omit raw tokens/secrets). */
  redact?: (key: string) => boolean;
  /** Bump to force a refetch (e.g. after an action). */
  reloadKey?: unknown;
  /**
   * Shown (calm, not error-red) when the endpoint returns 404 — i.e. the
   * backing resource/plugin simply isn't present in this Hermes build.
   * Lets optional-plugin panels degrade gracefully instead of screaming
   * "Could not load" (per AGENTS.md: never invent the endpoint to paper over it).
   */
  notAvailableMessage?: string;
  /**
   * Noun used by the default view's count chip + filter placeholder
   * ("12 entries", "Filter entries…").
   */
  unit?: string;
  /** Empty-state copy for the default view when the payload has no content. */
  emptyTitle?: string;
  emptyHint?: ReactNode;
  /** Open the default view on the raw-JSON tab (log-ish payloads). */
  rawFirst?: boolean;
}

export function ApiPage({
  title,
  subtitle,
  fetcher,
  render,
  redact,
  reloadKey,
  notAvailableMessage,
  unit,
  emptyTitle,
  emptyHint,
  rawFirst,
}: ApiPageProps) {
  const [state, setState] = useState<"loading" | "ok" | "err" | "na">("loading");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  // Hold the latest fetcher in a ref so a new function identity (e.g. an inline
  // arrow `() => getX(30)` recreated every render) does NOT retrigger the effect
  // and cause an infinite refetch loop. The effect runs on mount + reloadKey.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetcherRef.current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setState("ok");
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e?.message ?? String(e);
        // A 404 means the backing resource/plugin isn't present in this build —
        // render a calm "not available" state, not an error. (AGENTS.md: don't
        // invent the endpoint to paper over it; just degrade gracefully.)
        if (/404/.test(msg)) {
          setError(msg);
          setState("na");
        } else {
          setError(msg);
          setState("err");
        }
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  return (
    <div className="page">
      <header className="page-head">
        <div className="page-head-row">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="page-sub">{subtitle}</p>}
          </div>
          {/* Custom-rendered panels get a copy affordance too — the default
              DataView already ships its own toolbar copy button. */}
          {state === "ok" && render && (
            <div className="page-head-actions">
              <CopyButton value={filterKeys(data, redact)} />
            </div>
          )}
        </div>
      </header>
      {state === "loading" && (
        <div className="page-state" role="status">
          <span className="spinner" aria-hidden /> Loading…
        </div>
      )}
      {state === "err" && (
        <div className="page-state err">
          Could not load. {error.includes("401") || error.includes("unauthenticated")
            ? "Sign in again or check your session."
            : error}
        </div>
      )}
      {state === "na" && (
        <div className="page-state">
          {notAvailableMessage ?? "Not available in this Hermes build."}
        </div>
      )}
      {state === "ok" &&
        (render ? (
          render(data)
        ) : (
          <DataView
            data={filterKeys(data, redact)}
            unit={unit ?? "entries"}
            emptyTitle={emptyTitle ?? "Nothing here yet"}
            emptyHint={emptyHint ?? "This endpoint responded, but returned no content."}
            rawFirst={rawFirst}
          />
        ))}
    </div>
  );
}

function filterKeys(obj: any, redact?: (k: string) => boolean): any {
  if (!redact || typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => filterKeys(v, redact));
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (redact(k)) continue;
    out[k] = filterKeys(v, redact);
  }
  return out;
}

const SECRET_KEYS = /token|secret|key|password|api_key|authorization|cookie|passwd|auth/i;
export const redactSecrets = (k: string) => SECRET_KEYS.test(k);
