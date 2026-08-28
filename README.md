# Cockpit

> **Cockpit** is a bespoke, open-source dashboard shell and chat organizer for [Hermes Agent](https://github.com/NousResearch/hermes-agent) — the agentic coding/automation framework by Nous Research. Cockpit lets you **organize Hermes chat sessions into folders and workspaces** (byjtt.com, Jordan, Toolkit, Archive, Inbox) and **chat from a calm, byjtt-branded interface** instead of a flat session list.

Cockpit rides the stock Hermes backend through the `HERMES_WEB_DIST` environment variable. It is a **completely separate SPA** served by `hermes dashboard`, so running `hermes update` **never breaks your customizations**, and the Cockpit repo is cleanly open-source-able without forking Hermes itself.

---

## Why Cockpit

- **Organize chats the way you work.** Stock Hermes has rename + search but no folders. Cockpit gives you a folder sidebar, assign-any-session-to-a-folder, unassigned "Inbox", and an "Archive" for done work. Folder assignment persists server-side across restarts.
- **Survives `hermes update`.** Cockpit is built to its own `dist/` and pointed at via `HERMES_WEB_DIST`. The Hermes install updates independently; your UI is untouched.
- **Works behind basic auth / LAN.** It replicates the stock dashboard's auth flow (cookie + single-use WebSocket ticket), so it works on a gated, non-loopback bind (e.g. `http://<LAN-IP>:3001`) exactly like the stock UI.
- **Doesn't touch Hermes internals.** Folder metadata is stored in `HERMES_HOME/data/cockpit/*.json` via the dashboard's own file API — outside `state.db`, outside the git clone.
- **Calm, premium, byjtt-branded.** Warm light-paper canvas with the verified byjtt.com tokens; a terracotta `#BE3718` signal used sparingly. Pluggable themes (see `src/themes/`). No cyan/magenta "AI slop" neon.

## Quick start

```bash
git clone https://github.com/byjtt/cockpit.git
cd cockpit
npm install
npm run build
```

Then serve it through your existing `hermes dashboard` by pointing `HERMES_WEB_DIST` at Cockpit's `dist/`:

```bash
# Windows (PowerShell)
$env:HERMES_WEB_DIST = "$PWD\dist"
hermes dashboard --port 3001 --host 0.0.0.0 --no-open

# Linux / macOS
HERMES_WEB_DIST="$PWD/dist" hermes dashboard --port 3001 --host 0.0.0.0 --no-open
```

For a push-button build+relaunch, use the included scripts: `deploy.ps1` (Windows) / `deploy.sh` (Linux/macOS).

Open `http://127.0.0.1:3001` (local) or `http://<LAN-IP>:3001` (LAN, where `<LAN-IP>` is this machine's address). Log in with your Hermes basic-auth credentials.

> Requires a `hermes dashboard` with `dashboard.basic_auth` configured. See the [Hermes docs](https://hermes-agent.nousresearch.com/docs/) for enabling basic auth.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Cockpit SPA (this repo, built to dist/)                     │
│  React 19 + TypeScript + Vite, served via HERMES_WEB_DIST   │
└───────────────┬─────────────────────────────────────────────┘
                │  /api/sessions, /api/auth/*, /api/fs/*
                │  WebSocket /api/pty (single-use ?ticket=)
                ▼
┌─────────────────────────────────────────────────────────────┐
│  hermes dashboard  (stock, updates independently)            │
│  FastAPI backend: auth, sessions, PTY, file API             │
└───────────────┬─────────────────────────────────────────────┘
                │  manages
                ▼
   HERMES_HOME/data/cockpit/*.json   ← Cockpit's folder metadata
   (outside state.db, outside the git install)
```

| Concern | Where it lives |
|---|---|
| Backend transport (auth, sessions, PTY, file API) | [`src/lib/hermesApi.ts`](src/lib/hermesApi.ts) |
| Folder/workspace data model + persistence | [`src/lib/cockpitStore.ts`](src/lib/cockpitStore.ts) |
| xterm.js PTY terminal | [`src/components/ChatPanel.tsx`](src/components/ChatPanel.tsx) |
| Three-pane shell (folders · sessions · chat) | [`src/App.tsx`](src/App.tsx) |
| Theme (calm dark byjtt register) | [`src/index.css`](src/index.css) |

## Configuration

There is essentially **one** configuration surface: the `HERMES_WEB_DIST` environment variable. Everything else is derived from the live Hermes backend. No config files to drift, no version pins to chase.

## Customization

- **Rebrand:** edit `src/index.css` (color tokens at the top) and `public/favicon.svg`.
- **Default folders:** edit `DEFAULT_FOLDERS` in `src/lib/cockpitStore.ts`.
- **Add panels:** the middle pane (`SessionList`) and `WorkspacePanel` are where workspace quick-links / notes render.

## FAQ

**Does `hermes update` break Cockpit?** No. Cockpit's `dist/` sits outside the Hermes install; updating Hermes never touches it.

**Where is Cockpit's data stored?** In `HERMES_HOME/data/cockpit/*.json` — outside `state.db`, so it does not interfere with Hermes's session store or updates.

**Is it compatible with Hermes basic auth / LAN access?** Yes. It reproduces the stock dashboard's auth handshake (cookie + single-use WebSocket ticket) and works behind a gated, non-loopback bind.

**Do I need to fork Hermes?** No. Cockpit is a separate frontend consumed by the stock dashboard through `HERMES_WEB_DIST`.

## License

[MIT](LICENSE) — © 2026 By JTT.
