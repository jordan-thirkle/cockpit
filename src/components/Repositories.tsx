import { useState } from "react";
import { repoStore, type CockpitRepo } from "@/lib/cockpitStore";
import { showToast } from "./Toasts";
import { onKeyActivate } from "@/lib/a11y";

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
  const [linkError, setLinkError] = useState("");

  const state = repoStore.getState();
  const repos = repoStore.getRepos();

  const doLink = async () => {
    const u = ghUser.trim();
    if (!u) return;
    // Verify the username exists via the public GitHub API before storing it.
    // This makes "Link GitHub" honest: we do not accept a name the user made up.
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) {
        setGhUser("");
        setLinking(false);
        setLinkError(
          res.status === 404
            ? `No GitHub user named "${u}" — check the spelling.`
            : `GitHub API returned ${res.status} — try again in a moment.`,
        );
        return;
      }
      const json = (await res.json()) as { login?: string };
      if (!json.login || json.login.toLowerCase() !== u.toLowerCase()) {
        setGhUser("");
        setLinking(false);
        setLinkError(`No GitHub user named "${u}" — check the spelling.`);
        return;
      }
    } catch {
      // Network/API unavailable — do not store an unverified username.
      setGhUser("");
      setLinking(false);
      setLinkError("Couldn't reach the GitHub API — check your connection and retry.");
      return;
    }
    // Cockpit stores only the verified username (no token). The agent uses the
    // existing `gh`/GITHUB_TOKEN auth path for actual repo operations. "Link GitHub"
    // here means "the GitHub account exists at this username", not "we hold a token".
    try {
      await repoStore.setLinked(true, u);
      setLinking(false);
      setGhUser("");
      setLinkError("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const doAdd = async () => {
    const o = owner.trim();
    const n = name.trim();
    if (!o || !n) return;
    try {
      await repoStore.addRepo(o, n, "main");
      setOwner("");
      setName("");
      setAdding(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="repos">
      <div className="repos-head">
        <span className="repos-title">Repositories</span>
        {state.linked && state.user && (
          <span className="repos-gh" title="Verified GitHub account">
            @{state.user}
          </span>
        )}
      </div>

      {!state.linked && !linking && (
        <div
          className="folder"
          onClick={() => setLinking(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => onKeyActivate(e, () => setLinking(true))}
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
            placeholder="GitHub username (verified via API)"
            value={ghUser}
            onChange={(e) => setGhUser(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLink()}
          />
          {linkError && <div className="repo-link-error">{linkError}</div>}
          <div className="repo-link-note">
            Verifies the username via the public GitHub API before storing it.
            Uses Hermes's existing <code>gh</code>/GITHUB_TOKEN auth for repo ops.
            No token stored in Cockpit.
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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => onKeyActivate(e, () => onOpenRepo(r))}
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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => onKeyActivate(e, () => setAdding(true))}
          style={{ color: "var(--muted)" }}
        >
          <span className="folder-icon">＋</span>
          <span className="folder-name">Add repository</span>
        </div>
      )}
    </div>
  );
}
