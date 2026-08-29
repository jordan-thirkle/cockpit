// Hermes solved-UI page host.
//
// The components under `src/hermes/vendor/` are Hermes's own shipped dashboard
// pages, vendored verbatim (see vendor/README.md). They expect a react-router
// context, Hermes's i18n provider and a PageHeader context. Cockpit routes with
// its own `setPage` state, so we mount each vendored page inside a MemoryRouter
// and supply the minimal providers they need — the least invasive adapter that
// keeps the upstream components untouched.
import { Suspense, lazy, useMemo, useState, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { I18nProvider } from "@/hermes/vendor/i18n/context";
import { PageHeaderContext } from "@/hermes/vendor/contexts/page-header-context";

const VendorSkills = lazy(() => import("@/hermes/vendor/pages/SkillsPage"));
const VendorModels = lazy(() => import("@/hermes/vendor/pages/ModelsPage"));
const VendorAnalytics = lazy(() => import("@/hermes/vendor/pages/AnalyticsPage"));
const VendorCron = lazy(() => import("@/hermes/vendor/pages/CronPage"));
const VendorMcp = lazy(() => import("@/hermes/vendor/pages/McpPage"));
const VendorPlugins = lazy(() => import("@/hermes/vendor/pages/PluginsPage"));
const VendorConfig = lazy(() => import("@/hermes/vendor/pages/ConfigPage"));

export function HermesPageHost({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const [afterTitle, setAfterTitle] = useState<ReactNode>(null);
  const [end, setEnd] = useState<ReactNode>(null);
  const header = useMemo(
    () => ({ setAfterTitle, setEnd, setTitle }),
    [],
  );
  return (
    <MemoryRouter>
      <I18nProvider>
        <PageHeaderContext.Provider value={header}>
          <div className="hermes-page">
            <header className="hermes-page__header">
              <h1>{title}</h1>
              {afterTitle}
              <div className="hermes-page__end">{end}</div>
            </header>
            <Suspense fallback={<div className="hermes-page__loading">Loading…</div>}>
              {children}
            </Suspense>
          </div>
        </PageHeaderContext.Provider>
      </I18nProvider>
    </MemoryRouter>
  );
}

export const HermesSkillsPage = () => (
  <HermesPageHost>
    <VendorSkills />
  </HermesPageHost>
);
export const HermesModelsPage = () => (
  <HermesPageHost>
    <VendorModels />
  </HermesPageHost>
);
export const HermesAnalyticsPage = () => (
  <HermesPageHost>
    <VendorAnalytics />
  </HermesPageHost>
);
export const HermesCronPage = () => (
  <HermesPageHost>
    <VendorCron />
  </HermesPageHost>
);
export const HermesMcpPage = () => (
  <HermesPageHost>
    <VendorMcp />
  </HermesPageHost>
);
export const HermesPluginsPage = () => (
  <HermesPageHost>
    <VendorPlugins />
  </HermesPageHost>
);
export const HermesConfigPage = () => (
  <HermesPageHost>
    <VendorConfig />
  </HermesPageHost>
);
