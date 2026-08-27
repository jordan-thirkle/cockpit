# Contributing to Cockpit

Thanks for helping make Hermes dashboards better.

## Dev setup

```bash
npm install
npm run dev      # Vite dev server with a proxy to a running Hermes dashboard on :3001
```

Point the dev proxy (or `HERMES_WEB_DIST` for a production serve) at a Hermes
dashboard that has basic auth configured and is reachable on your LAN.

## Architecture rules

- **Never patch the Hermes source.** Cockpit is a separate SPA served via
  `HERMES_WEB_DIST`. All backend contact goes through the documented
  `/api/*` and `/api/pty` endpoints in `src/lib/hermesApi.ts`.
- **Keep custom state out of Hermes `state.db`.** Persist to
  `HERMES_HOME/data/cockpit/*.json` via `writeJsonFile`.
- **Calm, premium, byjtt-branded.** No neon/synthwave/cyan-magenta "AI slop"
  (explicit brand rule). Warm near-black canvas, terracotta `#BE3718` signal.

## Before opening a PR

- `npm run build` must pass (tsc + vite).
- Run `npm run typecheck`.
- Keep the README and `llms.txt` in sync if you change the architecture.

## License

By contributing you agree your contributions are released under the MIT License.
