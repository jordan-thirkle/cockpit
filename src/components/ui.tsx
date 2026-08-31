import { useMemo, useState, type ReactNode } from "react";

/**
 * Shared panel UX primitives (P3).
 *
 * Everything here is CLIENT-SIDE ONLY — no new API surface, no invented
 * endpoints (AGENTS.md). These turn the raw JSON dumps that most Hermes-backed
 * panels used to render into scannable, searchable, copyable views with real
 * empty states.
 */

// ── Copy button ───────────────────────────────────────────────────────────────

/** Copy arbitrary text to the clipboard, with transient "Copied" feedback. */
export function CopyButton({
  value,
  label = "Copy JSON",
  title,
}: {
  value: unknown;
  label?: string;
  title?: string;
}) {
  const [done, setDone] = useState(false);
  const text = typeof value === "string" ? value : safeStringify(value);

  const copy = async () => {
    const ok = await writeClipboard(text);
    if (!ok) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 1400);
  };

  return (
    <button
      type="button"
      className="btn-ghost dv-copy"
      onClick={copy}
      title={title ?? `Copy ${text.length.toLocaleString()} characters`}
      aria-live="polite"
    >
      {done ? "✓ Copied" : label}
    </button>
  );
}

/**
 * navigator.clipboard is unavailable on insecure origins (the LAN dashboard is
 * plain http://…:3001), so fall back to the legacy textarea + execCommand path
 * rather than silently doing nothing.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** JSON.stringify that survives cycles / BigInt instead of throwing mid-render. */
export function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === "bigint") return String(v);
        if (typeof v === "object" && v !== null) {
          if (seen.has(v as object)) return "[Circular]";
          seen.add(v as object);
        }
        return v;
      },
      2,
    ) ?? String(value);
  } catch {
    return String(value);
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="dv-empty">
      <div className="dv-empty-title">{title}</div>
      {hint && <div className="dv-empty-hint">{hint}</div>}
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Filter…",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="dv-search">
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="dv-search-clear"
          title="Clear filter"
          aria-label="Clear filter"
          onClick={() => onChange("")}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── Value formatting ──────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Pretty-print a scalar with a tone class so booleans/nulls/numbers read fast. */
function Scalar({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <span className="dv-v dv-null">—</span>;
  if (typeof value === "boolean")
    return (
      <span className={`dv-v dv-bool ${value ? "yes" : "no"}`}>
        {value ? "true" : "false"}
      </span>
    );
  if (typeof value === "number")
    return <span className="dv-v dv-num">{formatNumber(value)}</span>;
  const s = String(value);
  if (s === "") return <span className="dv-v dv-null">(empty)</span>;
  if (/^https?:\/\//.test(s))
    return (
      <a className="dv-v dv-link" href={s} target="_blank" rel="noreferrer noopener">
        {s}
      </a>
    );
  if (isIsoDate(s))
    return (
      <span className="dv-v" title={s}>
        {new Date(s).toLocaleString()}
      </span>
    );
  return <span className="dv-v">{s}</span>;
}

function formatNumber(n: number): string {
  // Epoch-ish seconds/ms stay raw (they're IDs as often as they are times);
  // ordinary magnitudes get thousands separators for scannability.
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) >= 1000) return n.toLocaleString();
  return String(n);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const isIsoDate = (s: string) => ISO_RE.test(s) && !Number.isNaN(Date.parse(s));

/** Humanize a snake_case / camelCase key into a label. */
export function humanKey(k: string): string {
  const spaced = k
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Short one-line summary of a nested value, used for collapsed sections. */
function summarize(v: unknown): string {
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  if (isObj(v)) {
    const n = Object.keys(v).length;
    return `${n} field${n === 1 ? "" : "s"}`;
  }
  return "";
}

/** Best-effort display name for an item in a list of objects. */
function itemLabel(v: Record<string, unknown>, index: number): string {
  for (const k of ["name", "title", "id", "label", "key", "slug", "path", "provider", "model"]) {
    const raw = v[k];
    if (typeof raw === "string" && raw.trim()) return raw;
    if (typeof raw === "number") return String(raw);
  }
  return `#${index + 1}`;
}

// ── Key/value rows ────────────────────────────────────────────────────────────

function KVRows({ entries }: { entries: Array<[string, unknown]> }) {
  return (
    <div className="dv-kv">
      {entries.map(([k, v]) => (
        <div className="dv-kv-row" key={k}>
          <div className="dv-k" title={k}>
            {humanKey(k)}
          </div>
          <div className="dv-kv-val">
            <Scalar value={v} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A nested object/array rendered as a collapsible section. */
function Section({
  label,
  value,
  defaultOpen,
}: {
  label: string;
  value: unknown;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`dv-section${open ? " open" : ""}`}>
      <button
        type="button"
        className="dv-section-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dv-caret">{open ? "▾" : "▸"}</span>
        <span className="dv-section-title">{humanKey(label)}</span>
        <span className="dv-section-count">{summarize(value)}</span>
      </button>
      {open && <div className="dv-section-body">{renderNode(value)}</div>}
    </div>
  );
}

/** Recursive structured renderer for one value. */
function renderNode(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return <div className="dv-inline-empty">Empty list</div>;
    // A flat array of scalars reads best as chips / lines.
    if (value.every((v) => !isObj(v) && !Array.isArray(v))) {
      const longish = value.some((v) => typeof v === "string" && v.length > 60);
      if (longish)
        return (
          <div className="dv-lines">
            {value.map((v, i) => (
              <div className="dv-line" key={i}>
                <span className="dv-line-n">{i + 1}</span>
                <span className="dv-line-t">{String(v)}</span>
              </div>
            ))}
          </div>
        );
      return (
        <div className="dv-chips">
          {value.map((v, i) => (
            <span className="dv-chip" key={i}>
              {String(v)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="dv-items">
        {value.map((v, i) => (
          <div className="dv-item" key={i}>
            <div className="dv-item-head">
              {isObj(v) ? itemLabel(v, i) : `#${i + 1}`}
            </div>
            <div className="dv-item-body">{renderNode(v)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (isObj(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <div className="dv-inline-empty">Empty object</div>;
    const flat = entries.filter(([, v]) => !isObj(v) && !Array.isArray(v));
    const nested = entries.filter(([, v]) => isObj(v) || Array.isArray(v));
    return (
      <>
        {flat.length > 0 && <KVRows entries={flat} />}
        {nested.map(([k, v]) => (
          <Section key={k} label={k} value={v} defaultOpen={nested.length <= 3} />
        ))}
      </>
    );
  }

  return (
    <div className="dv-scalar">
      <Scalar value={value} />
    </div>
  );
}

// ── Search filtering ──────────────────────────────────────────────────────────

/** Does any key or scalar anywhere inside `value` contain `needle`? */
function matches(value: unknown, needle: string): boolean {
  if (Array.isArray(value)) return value.some((v) => matches(v, needle));
  if (isObj(value))
    return Object.entries(value).some(
      ([k, v]) => k.toLowerCase().includes(needle) || matches(v, needle),
    );
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(needle);
}

/**
 * Filter the top level of `data` to the parts that match `q`.
 * Arrays keep matching items; objects keep matching keys (or keys whose value
 * matches). Nested structure inside a kept branch is preserved untouched, so
 * a hit never hides its own context.
 */
function filterData(data: unknown, q: string): unknown {
  const needle = q.trim().toLowerCase();
  if (!needle) return data;
  if (Array.isArray(data)) return data.filter((v) => matches(v, needle));
  if (isObj(data)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase().includes(needle) || matches(v, needle)) out[k] = v;
    }
    return out;
  }
  return matches(data, needle) ? data : undefined;
}

const countOf = (data: unknown): number =>
  Array.isArray(data) ? data.length : isObj(data) ? Object.keys(data).length : data == null ? 0 : 1;

// ── DataView: the panel body ───────────────────────────────────────────────────

export interface DataViewProps {
  data: unknown;
  /** Noun for the count chip, e.g. "entries", "skills". */
  unit?: string;
  /** Shown when the payload itself is empty. */
  emptyTitle?: string;
  emptyHint?: ReactNode;
  /** Start on the raw-JSON tab (useful for log-ish payloads). */
  rawFirst?: boolean;
}

/**
 * Searchable + copyable structured view of an arbitrary API payload.
 * Replaces the bare `<pre>` JSON dump that every ApiPage used to fall back to.
 */
export function DataView({
  data,
  unit = "entries",
  emptyTitle = "Nothing to show",
  emptyHint,
  rawFirst = false,
}: DataViewProps) {
  const [q, setQ] = useState("");
  const [raw, setRaw] = useState(rawFirst);

  const total = countOf(data);
  const filtered = useMemo(() => filterData(data, q), [data, q]);
  const shown = countOf(filtered);
  const rawText = useMemo(() => safeStringify(q ? filtered : data), [filtered, data, q]);

  if (total === 0)
    return (
      <>
        <div className="dv-toolbar">
          <span className="dv-count">0 {unit}</span>
          <div className="dv-toolbar-right">
            <CopyButton value={data} />
          </div>
        </div>
        <EmptyState title={emptyTitle} hint={emptyHint} />
      </>
    );

  return (
    <>
      <div className="dv-toolbar">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={`Filter ${unit}…`}
          ariaLabel={`Filter ${unit}`}
        />
        <span className="dv-count">
          {q ? `${shown} / ${total}` : total} {unit}
        </span>
        <div className="dv-toolbar-right">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRaw((r) => !r)}
            aria-pressed={raw}
            title={raw ? "Show structured view" : "Show raw JSON"}
          >
            {raw ? "Structured" : "Raw JSON"}
          </button>
          <CopyButton value={q ? filtered : data} />
        </div>
      </div>

      {shown === 0 ? (
        <EmptyState
          title={`No match for “${q}”`}
          hint="Clear the filter to see everything."
        />
      ) : raw ? (
        <pre className="json-view">{rawText}</pre>
      ) : (
        <div className="dv-body">{renderNode(filtered)}</div>
      )}
    </>
  );
}

// ── SearchableList: for panels that already render their own cards ────────────

/**
 * Wraps a card list with a filter box + count + empty state, without taking
 * over the panel's own item rendering.
 */
export function SearchableList<T>({
  items,
  unit,
  keyOf,
  textOf,
  renderItem,
  emptyTitle,
  emptyHint,
  copyValue,
}: {
  items: T[];
  unit: string;
  keyOf: (item: T, i: number) => string;
  textOf: (item: T) => string;
  renderItem: (item: T, i: number) => ReactNode;
  emptyTitle: string;
  emptyHint?: ReactNode;
  copyValue?: unknown;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? items.filter((it) => textOf(it).toLowerCase().includes(needle))
    : items;

  if (items.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />;

  return (
    <>
      <div className="dv-toolbar">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={`Filter ${unit}…`}
          ariaLabel={`Filter ${unit}`}
        />
        <span className="dv-count">
          {needle ? `${filtered.length} / ${items.length}` : items.length} {unit}
        </span>
        <div className="dv-toolbar-right">
          <CopyButton value={copyValue ?? items} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title={`No match for “${q}”`} hint="Clear the filter to see everything." />
      ) : (
        <div className="card-grid">{filtered.map((it, i) => (
          <div key={keyOf(it, i)} className="dv-cardwrap">{renderItem(it, i)}</div>
        ))}</div>
      )}
    </>
  );
}
