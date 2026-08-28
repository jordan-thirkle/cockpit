import { useEffect, useState } from "react";
import {
  getMemoryStatus,
  type MemoryStatus,
} from "@/lib/hermesApi";

function fmtBytes(n?: number): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Memory panel (feature #2): surfaces Hermes's memory subsystem status
// (Letta-style "advanced memory" analogue). Read-only view of provider
// readiness + MEMORY.md / USER.md footprint.
export function MemoryPanel() {
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMemoryStatus()
      .then((s) => alive && setStatus(s))
      .catch((e) => alive && setErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  if (err) return <div className="mem-empty">Memory status unavailable.</div>;
  if (!status) return <div className="mem-empty">Loading memory…</div>;

  return (
    <div className="memory">
      <h3>Memory</h3>
      <div className="mem-row">
        <span className="mem-key">Active provider</span>
        <span className="mem-val">{status.active ?? "none"}</span>
      </div>
      {status.providers && status.providers.length > 0 && (
        <div className="mem-providers">
          {status.providers.map((p) => (
            <span
              key={p.name}
              className={`mem-chip ${p.ready ? "ready" : ""}`}
              title={p.ready ? "ready" : "not configured"}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
      {status.memory_file_sizes && (
        <div className="mem-files">
          {Object.entries(status.memory_file_sizes).map(([name, size]) => (
            <div className="mem-row" key={name}>
              <span className="mem-key">{name}</span>
              <span className="mem-val mono">{fmtBytes(size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
