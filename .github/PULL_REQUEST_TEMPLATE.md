## Title

Use a conventional-commit prefix:

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, deps, tooling
- `docs:` — documentation only
- `refactor:` — code change that neither fixes a bug nor adds a feature

## What changed

- (bulleted list of the main changes)

## How to test

1. (step-by-step reproduction instructions for the reviewer)

## Checklist

- [ ] `npm run build` passes locally
- [ ] `npm run typecheck` passes locally
- [ ] Related issue is linked (e.g. `Fixes #123`)
- [ ] Screenshots / recordings attached (if this is a UI change)
- [ ] No new console errors introduced
- [ ] No Hermes source was edited (Cockpit rides existing endpoints only — see AGENTS.md)
