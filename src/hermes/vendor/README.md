# Vendored Hermes dashboard UI

Everything under this directory is copied **verbatim** from
`hermes-agent/web/src/**` (pages + the components/lib/hooks/contexts/i18n/plugins
closure they import) and from `hermes-agent/apps/shared/src` (vendored as
`shared/`). Constitutional rule: integrate solved work, don't rebuild it.

Hermes Agent is MIT-licensed; this vendored code remains © Nous Research and
contributors under the MIT license — see the repo-root `NOTICE` file. Do not
hand-edit these files: they are not type-owned by Cockpit and are replaced
wholesale on refresh.

## What is currently vendored

Only **pages actually hosted** by `src/hermes/HermesPages.tsx` (currently:
Models) plus their import closure. Everything else Hermes renders in Cockpit
through the ApiPage-based panels in `src/components/Pages.tsx`. Re-vendor a
page only when you host it — vendoring unused pages just ships dead code.

## Refreshing against a newer hermes-agent

```bash
export HERMES_SRC=/path/to/hermes-agent/web/src
export HERMES_SHARED=/path/to/hermes-agent/apps/shared/src
# COCKPIT_SRC defaults to ./src
python3 scripts/vendor_pages.py
```

The script copies the TARGET_PAGES closure, rewrites aliases, records nothing
machine-specific. Record the upstream commit you vendored from in the
`Upstream rev` line below so refreshes stay auditable.

Only mechanical adaptations are applied by the copy script:

1. `@/lib/api` → `@/hermes/api` (Cockpit's verified transport shim).
2. `@/...` → `@/hermes/vendor/...`, `@hermes/shared` → `@/hermes/vendor/shared`.
3. A `// @ts-nocheck` header, because these files are not type-owned by Cockpit
   (the shim types API payloads as `any`).

Do not hand-edit. To refresh, re-run the vendoring against a newer
hermes-agent checkout.

Hosted by `src/hermes/HermesPages.tsx` (MemoryRouter + I18nProvider +
PageHeader context) so the upstream pages run inside Cockpit's `setPage`
routing untouched.

Upstream rev: <fill in the hermes-agent commit hash of the last vendoring>
