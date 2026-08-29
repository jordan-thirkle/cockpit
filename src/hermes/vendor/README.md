# Vendored Hermes dashboard UI

Everything under this directory is copied **verbatim** from
`hermes-agent/web/src/**` (pages + the components/lib/hooks/contexts/i18n/plugins
closure they import) and from `hermes-agent/apps/shared/src` (vendored as
`shared/`). Constitutional rule: integrate solved work, don't rebuild it.

Only two mechanical adaptations were applied by the copy script:

1. `@/lib/api` → `@/hermes/api` (Cockpit's verified transport shim).
2. `@/...` → `@/hermes/vendor/...`, `@hermes/shared` → `@/hermes/vendor/shared`.
3. A `// @ts-nocheck` header, because these files are not type-owned by Cockpit
   (the shim types API payloads as `any`).

Do not hand-edit. To refresh, re-run the vendoring against a newer
hermes-agent checkout.

Hosted by `src/hermes/HermesPages.tsx` (MemoryRouter + I18nProvider +
PageHeader context) so the upstream pages run inside Cockpit's `setPage`
routing untouched.
