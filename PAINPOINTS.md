# Cockpit — Verified Hermes Pain Points (evidence)

> Sourced free from the live GitHub Issues API for `NousResearch/hermes-agent`
> (2026-08-28). These are REAL, user-reported friction points — not invented.
> They directly inform the Cockpit Control Center + Guided Onboarding design.

## Method
- `GET https://api.github.com/repos/NousResearch/hermes-agent/issues` (free, no key).
- Filtered to issues (excluded PRs). Sorted by comment count.
- Reddit/X were attempted but blocked from this host (rate-limited JSON / need
  browser); GitHub issues are the verified source. Re-run periodically.

## Recurring themes (from issue titles)
1. **Config / CLI friction** — `config set` non-interactive writes fail (exit 2),
   missing `--quiet` scripting output (#96764, #96767). → Guided config UI needed.
2. **Connections / reconciliation bugs** — SSH-only `connection.json` never
   reconciled into `connections.json` (#96742); Desktop stuck "Connecting…"
   after backend ready (#96743); WhatsApp bridge death invisible (#96758).
   → Connection health panel + clear status.
3. **Provider / model edge cases** — OpenRouter free models return HTTP 413
   instead of a meaningful error (#96739); Ollama GLM think-tag leak (#96735);
   Claude Korean garbling in tool-calls (#96771). → Provider status + friendly errors.
4. **UX gaps** — screenshot/image attachments in live-turn steering (#96759);
   per-turn/per-session memory skip (#96724); Pet & HUD mode (#96719);
   session model audit / bulk reset (#96745). → Capability discoverability.
5. **Tooling correctness** — schema_sanitizer injects `properties:{}` (#96734);
   approvals false-positive on grep bracket (#96776); preflight compression stall
   (#96775); browser_exec 420s Windows timeout (#96731). → Tool health visibility.

## Implication for Cockpit
The Control Center must make these *visible and guided*:
- A **Connections** card showing real status (not "Connecting…" forever).
- A **Providers/Models** card with friendly error translation (413 → "model at capacity, try X").
- A **Config** card that wraps `config set` non-interactively (no exit-2 surprises).
- A **Tools/Skills/MCP** browser with plain-language descriptions (discoverability).
- First-run **Onboarding** that pre-empts setup friction.

This is the evidence base for the "supreme 10/10, understood by all" goal.
