# Cockpit — Verified Hermes Pain Points (evidence)

> These are REAL, user-reported friction points — not invented.
> They directly inform the Cockpit Control Center + Guided Onboarding design.

## Method

Sources, all free, no paid tools:

1. **`NousResearch/hermes-agent` GitHub Issues API** — `GET https://api.github.com/repos/NousResearch/hermes-agent/issues` (free, no key). Filtered to issues, sorted by comment count. Date: 2026-08-28.
2. **Third-party aggregations of Reddit/X/V2EX/linux.do community posts**, accessed via the articles below. These are secondary sources that quote or paraphrase real user posts; the original community threads are cited where known (kilo.ai, V2EX, linux.do, Reddit r/AISEOInsider / r/AI_Agents / r/LocalLLaMA). We did not fabricate any quote — every line below traces to a source URL.

## Setup friction (the #1 activation problem)

### "Command not found" after a clean install

> "I spent a Saturday afternoon setting up Hermes Agent. Install script ran clean. No errors. I typed hermes into my terminal and got nothing. Literally nothing. 'Command not found.' Three hours later, after bouncing between GitHub issues, Discord messages, and half a dozen blog posts that each covered one specific error, I had it running. The fix for my problem was one line: source ~/.bashrc. One line. Three hours."

— [betterclaw.io — Hermes Agent Not Working? Every Error and Fix (2026)](https://www.betterclaw.io/blog/hermes-agent-not-working)

The same article calls this "the single most common Hermes Agent error. It's not broken. Your shell just doesn't know where the binary is yet."

### Setup is not the finish line

> "Installing Hermes Agent is not the finish line. The useful milestone is one completed job that you can verify. The fastest setup path is deliberately small: one model, one surface, one workflow, and one acceptance test. Add gateways, cron jobs, skills, Docker, or a VPS only after that path works."

— [hermes-agent.ai — Hermes Agent Setup Guide (2026)](https://hermes-agent.ai/blog/hermes-agent-setup-guide)

> "A current tutorial tells beginners to use one model, one surface, and one workflow before expanding. A current Hermes Desktop user spent two days trying to schedule LinkedIn work, then learned the local runtime could not run while the computer was off and still lacked end-to-end delivery proof."

— [hermes-agent.ai — Hermes Agent Setup Guide (2026)](https://hermes-agent.ai/blog/hermes-agent-setup-guide)

### Setup loops

> "A subset of users reported that the hermes setup wizard could get stuck in a loop or require repeated tries. In some threads, users described spending 10–15 minutes cycling the setup because it wouldn't finish properly."

— [aiagentstore.ai — The 20 Biggest Problems with Hermes Agent (ranked)](https://aiagentstore.ai/agentic-ai-and-workflow-automation/en/the-20-biggest-problems-with-hermes-agent-what-thousands-of-reddit-and-x-users-are-actually-struggling-with-ranked) (citing community Q&A threads)

## Self-evaluation / trust (the agent never admits it failed)

### "It always thinks it did a good job"

> "It always thinks it did a good job. ALWAYS… [my task] got everything jumbled up but it thought it kicked ass!"

— Reddit user, quoted via [kilo.ai analysis of 1,300+ Reddit comments](https://kilo.ai), aggregated at [aiagentstore.ai](https://aiagentstore.ai/agentic-ai-and-workflow-automation/en/the-20-biggest-problems-with-hermes-agent-what-thousands-of-reddit-and-x-users-are-actually-struggling-with-ranked)

> "'Hermes always thinks it did well' is the main problem"

— kilo.ai analysis of 1,300+ Reddit comments, same source as above.

The aiagentstore article rates this as **High impact**: "Users find it alarming that Hermes never flags its own mistakes. Dozens of comments on r/OpenClaw and related subs lamented that Hermes's self-checking loop is unreliable… Many regard this as a critical safety issue because it undermines trust in the agent's autonomy."

### Self-improvement overwrites manual edits

> "The overwriting-your-manual-edits part is a total dealbreaker. If I spent time tuning a specific skill, having the agent 'self-improve' it back into a jumbled mess sounds like a nightmare"

— veteran user, quoted via [kilo.ai](https://kilo.ai), same source as above.

## Stability / release cycle

### "3 of Hermes' releases didn't even work"

> "Hermes has had 6 releases to [OpenClaw's] 82 releases… 3 of Hermes' releases didn't even work. Don't listen to claims of it being more stable because it hasn't been around"

— Reddit comment, quoted via [kilo.ai](https://kilo.ai), same source as above.

### "42 days, 4 major releases"

> "In 42 days 4 major releases – migrating my workflow now might need a rewrite by next month"

— [V2EX user](https://www.v2ex.com) (Chinese AI community), quoted via [aiagentstore.ai](https://aiagentstore.ai/agentic-ai-and-workflow-automation/en/the-20-biggest-problems-with-hermes-agent-what-thousands-of-reddit-and-x-users-are-actually-struggling-with-ranked)

This maps to the "Too-Rapid Evolution (Frequent Breaking Changes)" problem in the same article: "the fast-paced development means a working setup can quickly require reconfiguration or adjustment."

## Integrations / multi-agent gap

### Fewer channels than competitors

> "OpenClaw has more integrations; Hermes has a subjectively better memory system"

— Reddit user, quoted via [kilo.ai](https://kilo.ai), same source as above.

### Single-agent architecture limits scale

> "Single-agent architecture… for cross-domain tasks [context] costs explode. I've kept my team running OpenClaw and only view Hermes as basic infrastructure candidates"

— [V2EX user](https://www.v2ex.com), quoted via [aiagentstore.ai](https://aiagentstore.ai/agentic-ai-and-workflow-automation/en/the-20-biggest-problems-with-hermes-agent-what-thousands-of-reddit-and-x-users-are-actually-struggling-with-ranked)

## CLI / UX bugs

### Inputs drift, output freezes then flushes

> "sometimes the CLI has a bug – new inputs drift into previous chat history, and progress output freezes then suddenly flushes a bunch on hitting Enter"

— [linux.do](https://linux.do) (Chinese AI community), quoted via [aiagentstore.ai](https://aiagentstore.ai/agentic-ai-and-workflow-automation/en/the-20-biggest-problems-with-hermes-agent-what-thousands-of-reddit-and-x-users-are-actually-struggling-with-ranked)

### Progress display lies about being stuck

> "after leaving a task running, the display 'said it was doing nothing' until they pressed a key, then a flood of messages appeared at once"

— [linux.do](https://linux.do), same source as above.

These are rated **Low annoyance** in the aiagentstore article but "it makes using the CLI frustrating" and "affected users occasionally missed seeing intermediate steps."

## Memory / skill bloat

### "Won't memory usage become terrifying?"

> "For every finished task it stores a skill. If run long-term won't memory usage become terrifying? And if a task fails, won't the saved memory pollute the agent?"

— [linux.do](https://linux.do), quoted via [aiagentstore.ai](https://aiagentstore.ai/agentic-ai-and-workflow-automation/en/the-20-biggest-problems-with-hermes-agent-what-thousands-of-reddit-and-x-users-are-actually-struggling-with-ranked)

The same article notes: "Several community posts echo 'how do we purge or manage memory?' and note that every 'skill' ends up in your .hermes folder."

## GitHub Issues — specific bugs (live API, NousResearch/hermes-agent, 2026-08-28)

1. **Config / CLI friction** — `config set` non-interactive writes fail (exit 2), missing `--quiet` scripting output (#96764, #96767). → Guided config UI needed.
2. **Connections / reconciliation bugs** — SSH-only `connection.json` never reconciled into `connections.json` (#96742); Desktop stuck "Connecting…" after backend ready (#96743); WhatsApp bridge death invisible (#96758). → Connection health panel + clear status.
3. **Provider / model edge cases** — OpenRouter free models return HTTP 413 instead of a meaningful error (#96739); Ollama GLM think-tag leak (#96735); Claude Korean garbling in tool-calls (#96771). → Provider status + friendly errors.
4. **UX gaps** — screenshot/image attachments in live-turn steering (#96759); per-turn/per-session memory skip (#96724); Pet & HUD mode (#96719); session model audit / bulk reset (#96745). → Capability discoverability.
5. **Tooling correctness** — schema_sanitizer injects `properties:{}` (#96734); approvals false-positive on grep bracket (#96776); preflight compression stall (#96775); browser_exec 420s Windows timeout (#96731). → Tool health visibility.

## Implication for Cockpit

The Control Center must make these *visible and guided*:

- A **Connections** card showing real status (not "Connecting…" forever).
- A **Providers/Models** card with friendly error translation (413 → "model at capacity, try X").
- A **Config** card that wraps `config set` non-interactively (no exit-2 surprises).
- A **Tools/Skills/MCP** browser with plain-language descriptions (discoverability).
- First-run **Onboarding** that pre-empts setup friction (PATH reload + `hermes doctor` guidance, "one model, one surface, one workflow" activation-first path).
- **Memory/Skills browser** with list-size visibility and prune actions (addresses the "won't memory usage become terrifying?" concern).
- Plain-language copy that directly names these pain points so users feel understood, not sold to.

This is the evidence base for the "supreme 10/10, understood by all" goal.

---

*Sources last verified: 2026-08-28. Re-run hermes_web.py search + extract on the source URLs above to refresh. No paid tools used.*
