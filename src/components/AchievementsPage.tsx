import { ApiPage } from "./Page";
import { getAchievements } from "@/lib/hermesApi";

// Real Hermes achievements — backed by the hermes-achievements dashboard plugin.
export const AchievementsPage = () => (
  <ApiPage
    title="Achievements"
    subtitle="Your Hermes milestones (live from hermes-achievements plugin)"
    fetcher={getAchievements}
    notAvailableMessage="Achievements plugin (hermes-achievements) isn't installed in this Hermes build — enable it to track milestones."
    render={(d: any) => {
      const list = d?.achievements ?? d?.state?.achievements ?? (Array.isArray(d) ? d : []);
      const items = Array.isArray(list) ? list : [];
      if (items.length === 0)
        return <div className="page-state">No achievement data yet — run Hermes a bit more.</div>;
      return (
        <div className="card-grid">
          {items.map((a: any, i: number) => {
            const unlocked = !!a.unlocked;
            const pct = Math.max(0, Math.min(100, a.progress_pct ?? a.progress ?? 0));
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
                  {a.category ?? ""} · {pct}%{a.tier ? ` · ${a.tier}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      );
    }}
  />
);
