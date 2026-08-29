# Changelog

All notable changes to Cockpit are documented here. Format: keep newest first
under the relevant heading; link to the tracking issue where one exists.

## [Unreleased]

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
