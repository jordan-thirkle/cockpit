// Host for the second batch of vendored Hermes dashboard pages
// (Env, Files, Logs, Webhooks, Pairing, Profiles, System, Docs, Channels).
//
// Same integration contract as HermesPages.tsx: each upstream page is mounted
// inside a MemoryRouter + I18nProvider + PageHeader context so it runs inside
// Cockpit's `setPage` routing untouched. See vendor/README.md for the
// vendoring convention (verbatim copy + @ts-nocheck + alias rewrites).
import { lazy } from "react";
import { HermesPageHost } from "@/hermes/HermesPages";

const VendorEnv = lazy(() => import("@/hermes/vendor/pages/EnvPage"));
const VendorFiles = lazy(() => import("@/hermes/vendor/pages/FilesPage"));
const VendorLogs = lazy(() => import("@/hermes/vendor/pages/LogsPage"));
const VendorWebhooks = lazy(() => import("@/hermes/vendor/pages/WebhooksPage"));
const VendorPairing = lazy(() => import("@/hermes/vendor/pages/PairingPage"));
const VendorProfiles = lazy(() => import("@/hermes/vendor/pages/ProfilesPage"));
const VendorSystem = lazy(() => import("@/hermes/vendor/pages/SystemPage"));
const VendorDocs = lazy(() => import("@/hermes/vendor/pages/DocsPage"));
const VendorChannels = lazy(() => import("@/hermes/vendor/pages/ChannelsPage"));

export const EnvPage = () => (
  <HermesPageHost>
    <VendorEnv />
  </HermesPageHost>
);
export const FilesPage = () => (
  <HermesPageHost>
    <VendorFiles />
  </HermesPageHost>
);
export const LogsPage = () => (
  <HermesPageHost>
    <VendorLogs />
  </HermesPageHost>
);
export const WebhooksPage = () => (
  <HermesPageHost>
    <VendorWebhooks />
  </HermesPageHost>
);
export const PairingPage = () => (
  <HermesPageHost>
    <VendorPairing />
  </HermesPageHost>
);
export const ProfilesPage = () => (
  <HermesPageHost>
    <VendorProfiles />
  </HermesPageHost>
);
export const SystemPage = () => (
  <HermesPageHost>
    <VendorSystem />
  </HermesPageHost>
);
export const DocsPage = () => (
  <HermesPageHost>
    <VendorDocs />
  </HermesPageHost>
);
export const ChannelsPage = () => (
  <HermesPageHost>
    <VendorChannels />
  </HermesPageHost>
);
