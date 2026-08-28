import { useState } from "react";
import { repoStore, type CockpitRepo } from "@/lib/cockpitStore";

export function Repositories({
  onOpenRepo,
}: {
  onOpenRepo: (repo: CockpitRepo) => void;
}) {
  const [linking, setLinking] = useState(false);
  const [ghUser, setGhUser] = useState("");
  const [adding, setAdding] = useState(false);
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");

  const state = repoStore.getState();
  const repos = repoStore.getRepos();

  const doLink = async () => {
    const u = ghUser.trim();
    if (!u) return;
    // Cockpit stores only the linked username (no token). The agent uses the
    // existing `gh`/GITHUB_TOKEN auth path for actual repo operations.
    await repoStore.setLinked(true, u);
    setLinking(false);
    setGhUser("");
  };

  const doAdd = async () => {
    const o = owner.trim();
    const n = name.trim();
    if (!o || !n) return;
    await repoStore.addRepo(o, n, "main");
    setOwner("");
    setName("");
    setAdding(false);
  };

  return (
    <div className="repos">
      <div className="repos-head">
        <span className="repos-title">Repositories</span>
        {state.linked && state.user && (
          <span className="repos-gh" title="Linked GitHub account">
            @{state.user}
          </span>
        )}
      </div>

      {!state.linked && !linking && (
        <div
          className="folder"
          onClick={() => setLinking(true)}
          style={{ color: "var(--muted)" }}
        >
          <span className="folder-icon">⚲</span>
          <span className="folder-name">Link GitHub</span>
        </div>
      )}

      {linking && (
        <div className="repo-link-box">
          <input
            autoFocus
            placeholder="GitHub username"
            value={ghUser}
            onChange={(e) => setGhUser(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLink()}
          />
          <div className="repo-link-note">
            Uses Hermes's existing <code>gh</code>/GITHUB_TOKEN auth. No token stored in Cockpit.
          </div>
          <div className="repo-link-actions">
            <button className="btn-primary" onClick={doLink}>
              Link
            </button>
            <button className="btn-ghost" onClick={() => setLinking(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {repos.map((r) => (
        <div
          key={r.id}
          className="folder repo-row"
          onClick={() => onOpenRepo(r)}
          title={`${r.owner}/${r.name} @ ${r.branch}`}
        >
          <span className="folder-icon">{r.icon ?? "❖"}</span>
          <span className="folder-name repo-name">
            <span className="repo-owner">{r.owner}/</span>
            {r.name}
          </span>
          <span className="repo-branch">{r.branch}</span>
        </div>
      ))}

      {adding ? (
        <div className="repo-link-box">
          <input
            autoFocus
            placeholder="owner (e.g. byjtt)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
          <input
            placeholder="repo (e.g. cockpit)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doAdd()}
          />
          <div className="repo-link-actions">
            <button className="btn-primary" onClick={doAdd}>
              Add
            </button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="folder"
          onClick={() => setAdding(true)}
          style={{ color: "var(--muted)" }}
        >
          <span className="folder-icon">＋</span>
          <span className="folder-name">Add repository</span>
        </div>
      )}
    </div>
  );
}
