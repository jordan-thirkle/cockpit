# LTS Roadmap

Cockpit follows a "long-term hardened fixes over quick patches" ethos.
When a bug is found, the preferred fix is the durable one — cover the root
cause, add a gate that prevents regression, and rerun the relevant critic
lane before merging. Quick patches are acceptable only when they are a
clear step toward the durable fix or when the durable fix is blocked by
an external dependency.

## Support tiers

| Tier | Cadence | What we keep current |
|------|---------|----------------------|
| Stable | Every push / PR merge | Branch `main` — build green, typecheck clean, critic lanes re-run on anything that touches UI, auth, or session data |
| Released snapshots | Ad-hoc | Tagged releases (future) — point-in-time builds with a known-good dependency set |

## What gets priority

1. **Security** — auth, session, API boundaries, dependency supply-chain.
   - CI runs `npm audit` on every push and PR now (added 2026-09-02).
   - GitHub secret scanning + push protection are enabled on the repo.
   - Dependabot auto-PRs dependency and GitHub Actions updates weekly.
2. **Build integrity** — anything that breaks the build is fixed before
   anything else. CI is the gate.
3. **UX regressions** — panels that go back to raw JSON, error leakage,
   broken flows, or layouts that surprise a new user. The P3 critic lane
   is the intended gate here.
4. **Performance** — regressions in initial load or panel render cost.
   The P4 perf lane is the intended gate here.
5. **Accessibility** — regressions in keyboard navigation, focus,
   color contrast, and screen-reader behavior. The P5 a11y lane is the
   intended gate here.

## What we don't do

- Hot-patch `main` without a CI-verified build.
- Merge a fix without re-running the relevant critic lane when the change
  touches the UI, auth, or session plumbing.
- Accept "works on my machine" as the final state for a bug that touches
  the served dashboard.

## Future: tagged releases

Right now Cockpit ships from `main` directly. The next step toward LTS
is tagging point-in-time releases with a known-good dependency set and a
release notes entry. When that happens, this document will list the
supported release branch and the deprecation policy for older releases.
Until then, `main` is the supported version and the build gate is the
protection.

## Cadence

- Weekly: Dependabot opens PRs for npm and GitHub Actions updates.
- On push / PR: CI runs `npm ci`, `npm audit`, and `npm run build`.
- On significant changes: re-run the relevant critic lane (P3/P4/P5)
  before merging.
