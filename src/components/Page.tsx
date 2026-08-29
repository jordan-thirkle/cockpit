import { useEffect, useRef, useState, type ReactNode } from "react";

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
}

export function ApiPage({ title, subtitle, fetcher, render, redact, reloadKey }: ApiPageProps) {
  const [state, setState] = useState<"loading" | "ok" | "err">("loading");
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
        setError(e?.message ?? String(e));
        setState("err");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </header>
      {state === "loading" && <div className="page-state">Loading…</div>}
      {state === "err" && (
        <div className="page-state err">
          Could not load. {error.includes("401") || error.includes("unauthenticated")
            ? "Sign in again or check your session."
            : error}
        </div>
      )}
      {state === "ok" &&
        (render ? (
          render(data)
        ) : (
          <pre className="json-view">
            {JSON.stringify(filterKeys(data, redact), null, 2)}
          </pre>
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
