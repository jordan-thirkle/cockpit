import { useMemo, useState } from "react";
import { ApiPage } from "./Page";
import { getAchievements } from "@/lib/hermesApi";
import { CopyButton, EmptyState, SearchInput } from "./ui";

// Real Hermes achievements — backed by the hermes-achievements dashboard plugin.
interface Achievement {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  tier?: string;
  unlocked?: boolean;
  progress?: number;
  progress_pct?: number;
}

const pctOf = (a: Achievement) =>
  Math.max(0, Math.min(100, a.progress_pct ?? a.progress ?? 0));

/**
 * Grid of achievements with a filter box, an unlocked/locked segmented filter,
 * and a real progress summary — so the panel answers "what's left?" at a glance
 * instead of being an unsorted wall of cards.
 */
function AchievementGrid({ items }: { items: Achievement[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "unlocked" | "locked">("all");

  const unlockedCount = items.filter((a) => a.unlocked).length;
  const needle = q.trim().toLowerCase();

  const shown = useMemo(() => {
    let list = items;
    if (tab === "unlocked") list = list.filter((a) => a.unlocked);
    if (tab === "locked") list = list.filter((a) => !a.unlocked);
    if (needle)
      list = list.filter((a) =>
        `${a.name ?? ""} ${a.description ?? ""} ${a.category ?? ""} ${a.tier ?? ""}`
          .toLowerCase()
          .includes(needle),
      );
    // Closest-to-done first among locked; unlocked sink to the bottom of their tab.
    return [...list].sort((a, b) => {
      if (!!a.unlocked !== !!b.unlocked) return a.unlocked ? 1 : -1;
      return pctOf(b) - pctOf(a);
    });
  }, [items, tab, needle]);

  const overall = Math.round((unlockedCount / Math.max(1, items.length)) * 100);

  return (
    <>
      <div className="dv-toolbar">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Filter achievements…"
          ariaLabel="Filter achievements"
        />
        <div className="source-filter" role="group" aria-label="Filter by unlock state">
          {(["all", "unlocked", "locked"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              className={tab === t ? "sf-btn active" : "sf-btn"}
              onClick={() => setTab(t)}
            >
              {t === "all" ? "All" : t === "unlocked" ? "Unlocked" : "Locked"}
            </button>
          ))}
        </div>
        <span className="dv-count">
          {unlockedCount} / {items.length} unlocked · {overall}%
        </span>
        <div className="dv-toolbar-right">
          <CopyButton value={items} />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={needle ? `No match for “${q}”` : "Nothing in this view"}
          hint="Try a different filter."
        />
      ) : (
        <div className="card-grid">
          {shown.map((a, i) => {
            const unlocked = !!a.unlocked;
            const pct = pctOf(a);
            return (
              <div className={`info-card ${unlocked ? "unlocked" : ""}`} key={a.id ?? i}>
                <div className="info-card-title">
                  {unlocked ? "★ " : "☆ "}
                  {a.name ?? "(unnamed)"}
                </div>
                <div className="info-card-sub">{a.description ?? ""}</div>
                <div className="ach-progress">
                  <div className="ach-bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="info-card-meta">
                  {a.category ?? "uncategorized"} · {pct}%{a.tier ? ` · ${a.tier}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export const AchievementsPage = () => (
  <ApiPage
    title="Achievements"
    subtitle="Your Hermes milestones (live from hermes-achievements plugin)"
    fetcher={getAchievements}
    notAvailableMessage="Achievements plugin (hermes-achievements) isn't installed in this Hermes build — enable it to track milestones."
    render={(d: any) => {
      const list = d?.achievements ?? d?.state?.achievements ?? (Array.isArray(d) ? d : []);
      const items: Achievement[] = Array.isArray(list) ? list : [];
      if (items.length === 0)
        return (
          <EmptyState
            title="No achievement data yet"
            hint="Keep using Hermes — milestones appear here as the plugin records activity."
          />
        );
      return <AchievementGrid items={items} />;
    }}
  />
);
