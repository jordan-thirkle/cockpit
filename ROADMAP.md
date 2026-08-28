# Cockpit — Repositories Feature Spec (ROADMAP)

> Goal: make working on GitHub repos from Cockpit as effortless and themeable
> as Hermes's own theme system. A repo is a first-class surface: link GitHub,
> click a repo, get a chat pre-scoped to that repo with PR actions.

## Principles
- **Reuse Hermes's GitHub auth, never reinvent it.** Hermes reads
  `GITHUB_TOKEN` env or `gh auth token` (verified in `hermes_cli/copilot_auth.py`,
  `doctor.py`). Cockpit must NOT store GitHub tokens — it relies on the same
  `gh`/env the backend already uses. "Link GitHub" = verify `gh auth status`
  (backend-side) and surface the linked username.
- **Repo work happens through Hermes's github skills** (clone → edit → PR,
  never push to main — matches Jordan's workflow rules). Cockpit is the *shell*
  that scopes the chat + exposes quick actions; the agent does the git work.
- **Themeable + extensible.** Repos are data objects in the same
  `HERMES_HOME/data/cockpit/*.json` store as folders. New repo panels = one
  entry, no core changes. Uses the existing token/CSS system.
- **Update-safe.** Pure frontend + metadata; no Hermes patching.

## Data model (src/lib/cockpitStore.ts)
```ts
interface CockpitRepo {
  id: string;            // "r-<owner>-<name>"
  owner: string;         // "byjtt"
  name: string;          // "cockpit"
  branch: string;        // default branch (main/master)
  clonePath?: string;    // optional local clone; if absent, "clone on demand"
  icon?: string;
  order: number;
}
// store.github = { linked: boolean, user?: string, repos: CockpitRepo[] }
```

## UI surfaces
1. **Sidebar → "Repositories" section** (below Folders):
   - "Link GitHub" button (calls backend `gh auth status`; shows linked user).
   - Repo rows: icon + `owner/name` + branch chip. Click → opens repo-scoped chat.
   - "+ Add repo" → owner/name form (manual link; no token needed).
2. **Repo-scoped chat** (ChatPanel variant):
   - Header banner: `owner/name @ branch` + clone status.
   - Toolbar: "Clone" (if no clonePath), "New PR" (runs github-PR flow), "Open on GitHub".
   - The PTY session is the normal Hermes terminal; repo context is shown, not forced.
3. **Theming**: repo rows/chips use existing tokens; a `--signal` branch chip,
   hover states from `--surface-2`. Fully theme-driven.

## Backend touchpoints (all already exist)
- GitHub auth: `gh auth status` / `gh auth token` (Hermes uses these).
- Repo ops: Hermes `github-*` skills (clone, PR, review) driven via chat.
- Cockpit metadata: `/api/fs/write-text` (existing).

## Out of scope (deferred)
- In-browser file tree / diff viewer (agent does this via chat for now).
- Auto-clone on click (user triggers via toolbar; respects disk intent).

## Build order
1. Data model + store methods (repos, github link state).
2. Sidebar Repositories section + Link/Add UI.
3. Repo-scoped ChatPanel (banner + PR/Clone/Open actions).
4. Theming pass + a 4th theme ("By JTT · Slate") to show extensibility.
5. Security re-audit (no tokens stored) + commit.

## Honest limitation
This shell *orchestrates* repo work; it does not replace `git`. The agent (via
Hermes github skills) performs clone/edit/PR. Cockpit makes that 10x easier to
start and track — which is the actual value.
