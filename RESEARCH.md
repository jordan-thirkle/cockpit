# Cockpit — Competitive Research & Feature Matrix (verified 2026-08-28)

> Sourced from live GitHub repos via the GitHub API + README extraction (not
> memory). Cockpit's own API surface verified against the running Hermes
> install at `C:\Users\jorda\AppData\Local\hermes\hermes-agent`.

## The field (stars / license / last push — live)
| Project | Stars | License | What it actually is |
|---|---|---|---|
| Microsoft AutoGen | 60.7k | CC-BY-4.0 | Multi-agent programming framework (now Microsoft Agent Framework) |
| CrewAI | 57.7k | MIT | Role-playing multi-agent orchestration; has Tracing & Observability, Unified Control Plane |
| LangGraph | 40.6k | MIT | Low-level stateful agent orchestration; durable execution, Studio for graph viz |
| Letta (MemGPT) | 24.5k | Apache-2.0 | Stateful agents with **advanced memory** that learns/self-improves; memory + identity + conversations |
| Generative Agents (3D) | 22.0k | Apache-2.0 | Research: interactive 3D simulacra (Smallville) — agents as avatars in a world |
| Helicone | 6.1k | Apache-2.0 | LLM observability: agent tracing, cost & latency, datasets, playground |
| AgentOps | 5.8k | MIT | Agent monitoring: **replay analytics**, LLM cost management, framework integrations |

## What the leaders do that Cockpit does NOT (verified feature lines)
- **Observability/tracing** — Helicone ("Agent Tracing", "Cost & Latency Tracking"), CrewAI ("Tracing & Observability… metrics, logs, traces"), AgentOps ("step-by-step agent execution graphs").
- **Replay/scrub** — AgentOps ("Replay Analytics and Debugging").
- **Memory view** — Letta ("advanced memory that can learn and self-improve", memory/identity/conversations available across sessions).
- **Multi-agent graph / roles / handoffs** — CrewAI (role-based agents, "collaborative intelligence"), AutoGen (multi-agent apps).
- **3D agent space** — Generative Agents (Smallville): agents as avatars moving/collaborating in a rendered world. Rare; a genuine differentiator.

## Cockpit's verified backend surface (what we CAN build on)
From the running Hermes web_server.py:
- `GET /api/sessions` — list (title, model, archived, updated). ✅ used.
- `GET /api/sessions/{id}` — **detail stays complete** (line 5918) → structured per-session data is reachable via API (trace/tool-call view is feasible).
- `/api/memory`, `/api/memory/providers/{name}/config`, `/api/memory/reset` — Hermes has a **memory subsystem** Cockpit can surface (Letta-style memory panel is buildable).
- `POST /api/sessions/{id}/rename`, `…/delete`, `…/archive` — ✅ used.
- `/api/events` — sidebar event stream (keyed by channel).
- `wss /api/pty?channel=&ticket=` — live terminal. ✅ used.
- `/api/fs/write-text` — Cockpit metadata store. ✅ used.

## What is NOT cleanly exposed (needs backend work or state.db reads)
- No `/api/cost`, `/api/tokens`, `/api/latency` → cost panel needs usage instrumentation.
- No `/api/agents` or multi-agent graph endpoint → agent canvas must be derived from session/event data or added backend-side.
- 3D view, command palette, x.com share, workflow-states → pure frontend/Cockpit-layer, no backend dep.

## Verdict
Cockpit today (folders + terminal + themes) covers ~2 of ~13 leader capabilities.
The credible build order, grounded in verified gaps:
1. **Trace/tool-call view** — feasible via `/api/sessions/{id}` detail. (highest leverage)
2. **Memory panel** — feasible via `/api/memory/*`.
3. **Workflow states** (Inbox/Active/Blocked/Published) + **command palette** — pure frontend.
4. **Multi-agent canvas** (2D) — derive from events; 3D (R3F, already a Hermes dep) is the showcase.
5. **Capabilities surface** (skills/MCP/webhooks) — your stated next evolution.
6. **x.com share loop** — your edge; needs X creds.
7. Cost/latency — defer until backend exposes usage.

Honest maturity rating: **3.5 / 10** (solid shell, not a command center).
