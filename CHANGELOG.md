# Changelog

All notable changes to Cockpit are documented here. Format: keep newest first
under the relevant heading; link to the tracking issue where one exists.

## [Unreleased]

### Fixes (2026-09-02 review pass)
- **Metadata failures surface instead of silently vanishing.** Every folder/repo/onboarding
  mutation catches persistence errors and shows a toast; the 15s session-refresh loop
  catches (first failure toasts, recovery resets). `readJsonFile` returns defaults ONLY on
  404 — auth/network/5xx failures block writes until a successful reload, so a transient
  backend blip can no longer be persisted over real data. Persist is refused while
  metadata is unloaded or errored.
- **Fresh-install persistence hint.** `writeJsonFile` errors name the missing
  `data/cockpit/` step; README/llms.txt document the one-time mkdir (README → First run).
- **Duplicate "Archive" option** removed from every session-assign dropdown (system
  folders were mapped into the select AND Archive was hardcoded below them).
- **Keyboard access.** Sidebar nav/folder rows, Repositories rows, and session rows are
  now focusable and Enter/Space-activatable (role=button + shared `src/lib/a11y.ts`
  helper) — the CSS focus rings previously targeted unreachable divs.
- **"Link GitHub" gives feedback** when the username check fails instead of closing silently.
- **`redactSecrets` no longer over-matches** benign fields ("authors", "hotkeys"); now
  word-boundary matched, with credential/signature/bearer added.
- **Repo links fixed.** README quick start and package.json metadata pointed at
  `byjtt/cockpit` (404); corrected to `jordan-thirkle/cockpit`.
- **ChatPanel:** `sessionId` included in the PTY effect deps.
- **Vite 7.1.5 → 7.3.6** (dev-server path-traversal advisories); `engines` corrected to
  node >=20.19.0 (Vite 7's real floor).

### Performance & tooling (2026-09-02 review pass)
- **Code-split the Hermes panels.** `Pages.tsx` (~17 endpoint-backed panels), `ui.tsx`
  and `ControlCenter` moved out of the entry chunk: entry 558KB → 531KB (155.4KB gzip).
- **ESLint** (typescript-eslint + react-hooks) and **Vitest** (9 store tests covering
  merge/assign/load-guard invariants) wired into CI; known compiler-era hook warnings
  triaged and documented in `eslint.config.js`.
- **Vendored tree pruned** to what Cockpit actually hosts (ModelsPage + closure; 38 dead
  files removed); `scripts/vendor_pages.py` now takes machine paths via env vars and
  vendors only hosted pages; vendor README records the upstream rev.
- **NOTICE** added: MIT attribution for the vendored hermes-agent code.
- **Docs redaction:** machine-specific paths/IP/usernames in AGENTS.md replaced with
  placeholders; `tsconfig.tsbuildinfo` untracked.

### Features (completed, uncommitted before this entry)
- **Repositories: verified GitHub link.** "Link GitHub" now hits the public
  GitHub API to confirm the username exists before storing it; no token is
  stored (Hermes's `gh`/`GITHUB_TOKEN` path is used for repo ops).
- **ChatPanel: repo workspace context seeding.** When a repo workspace is open,
  the PTY seeds a visible, honest context block (owner/name, branch, clone
  path, "never push to main") into the terminal on connect — the agent reads
  it like any other visible input.
- **ChatPanel: "Start work" button.** Copies a clear next-step prompt to the
  clipboard and focuses the terminal (the real work surface).
- **ControlCenter: guided prompts.** Every "Open in chat" card now copies a
  specific guiding prompt to the clipboard and opens a fresh Cockpit tab.
  (Cockpit has no `/chat?prompt=` route — that's a Hermes-core change — so the
  prompt is clipboard-seeded instead of faked.)
- **Sidebar: by JTT brand footer.** Replaced the "Hermes v0.20.6" label with
  "by JTT".
- **ControlCenter: Connections card.** Added a `connections` aspect to
  `controlCenterContent.json` with plain-language what/why/steps/gotcha.

### Fixes
- **`hermesApi.ts`: correct backend contract.** `listSkills` now calls
  `/api/fs/list?path=skills` (was `/api/fs?path=`) and maps the camelCase
  `isDirectory` field. `writeJsonFile` now sends `content` (was `text`) to
  `/api/fs/write-text`, matching the backend's `FsWriteText` model. This
  restores server-side persistence of folder/repo/onboarding metadata (which
  had silently fallen back to per-browser localStorage).

## [0.1.0] — 2026-08-28

### Features
- Bespoke Hermes dashboard shell: folder sidebar (byjtt.com, Jordan, Toolkit,
  Archive, Inbox) + session list + xterm.js PTY chat.
- Themeable byjtt light/calm dark registers; pluggable theme system.
- First-run guided Onboarding wizard.
- Control Center: plain-language cards for Skills (live), Providers (live),
  Configuration (live), Memory (live), Tools, MCP, Bots, Cron, Gateway.
- GitHub-linked Repositories surface (data model + sidebar section).
- Memory status panel; structured session trace/tool-call view (TraceView).
- Workspace panel quick-links/notes per folder.
- Server-side metadata persistence in `HERMES_HOME/data/cockpit/*.json`.
- Windows (`deploy.ps1`) + Linux/macOS (`deploy.sh`) one-shot build+relaunch.
- CI workflow (`.github/workflows/ci.yml`).

### Docs
- README, CONTRIBUTING, llms.txt, ROADMAP (Repositories spec), PAINPOINTS
  (verified user friction), RESEARCH (competitive matrix + backend audit).
