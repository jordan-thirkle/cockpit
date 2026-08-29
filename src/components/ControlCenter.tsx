import { useEffect, useState } from "react";
import {
  listSkills,
  listProviders,
  getConfigSchema,
  type SkillEntry,
  type ProviderInfo,
  type ConfigSchema,
} from "@/lib/hermesApi";
import { GuideCard } from "./GuideCard";
import content from "@/lib/controlCenterContent.json";

type Aspect = {
  what: string;
  why: string;
  steps?: string[];
  gotcha?: string;
};
const C: Record<string, Aspect> = content as Record<string, Aspect>;

// Control Center — exposes every aspect of Hermes as a plain-language,
// accessible card. Live data only where a verified endpoint exists;
// otherwise a guided launch-pad that opens the right chat command.
export function ControlCenter({ onClose }: { onClose?: () => void }) {
  const [skills, setSkills] = useState<SkillEntry[] | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [config, setConfig] = useState<ConfigSchema | null>(null);

  useEffect(() => {
    listSkills().then(setSkills).catch(() => setSkills([]));
    listProviders().then(setProviders).catch(() => setProviders([]));
    getConfigSchema().then(setConfig).catch(() => setConfig(null));
  }, []);

  // "Open in chat" opens a fresh Cockpit tab (a real Hermes session) and
  // copies the guiding prompt to the clipboard so the user can paste it
  // immediately. Cockpit has no /chat?prompt= route (that would be a
  // Hermes-core change), so we don't pretend one exists — we seed the
  // clipboard instead, which is honest and actually useful.
  const openChat = (hint: string) => {
    try {
      void navigator.clipboard?.writeText(hint);
    } catch {
      /* clipboard may be blocked; the hint is also shown in the card */
    }
    window.open("/", "_blank");
  };

  return (
    <div className="control-center">
      <div className="cc-head">
        <h2>Control Center</h2>
        {onClose && (
          <button className="cc-close" onClick={onClose}>
            ← Back
          </button>
        )}
        <p className="cc-sub">
          Every part of Hermes, explained simply. Cards marked <b>Live</b> show
          real data; <b>Guided</b> cards open a chat that sets things up for you.
        </p>
      </div>

      <div className="cc-grid">
        {/* LIVE: Skills (195 dirs readable via /api/fs) */}
        <GuideCard
          icon="✦"
          title="Skills"
          live
          what={C.skills.what}
          why={C.skills.why}
          chatHint="Browse and enable skills"
          onOpenChat={() => openChat("Browse my installed Hermes skills and suggest which to enable for my work.")}
        >
          {skills === null ? (
            <span className="cc-loading">Loading skills…</span>
          ) : (
            <div className="cc-count">
              <strong>{skills.length}</strong> skills installed
              <div className="cc-chips">
                {skills.slice(0, 8).map((s) => (
                  <span key={s.name} className="cc-chip">
                    {s.name}
                  </span>
                ))}
                {skills.length > 8 && <span className="cc-chip">+{skills.length - 8} more</span>}
              </div>
            </div>
          )}
        </GuideCard>

        {/* LIVE: Providers */}
        <GuideCard
          icon="⚙"
          title="Providers & Models"
          live
          what={C.providers.what}
          why={C.providers.why}
          chatHint="Show and configure providers"
          onOpenChat={() => openChat("Show my configured Hermes providers and help me add one.")}
        >
          {providers === null ? (
            <span className="cc-loading">Loading providers…</span>
          ) : (
            <div className="cc-count">
              <strong>{providers.length}</strong> connected
              <div className="cc-chips">
                {providers.slice(0, 6).map((p) => (
                  <span key={p.id} className="cc-chip">
                    {p.name ?? p.id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GuideCard>

        {/* LIVE: Config (schema) */}
        <GuideCard
          icon="⚡"
          title="Configuration"
          live
          what={C.config.what}
          why={C.config.why}
          chatHint="Show and edit config"
          onOpenChat={() => openChat("Show my Hermes config and explain the most useful settings.")}
        >
          {config ? (
            <div className="cc-count">
              <strong>{(config.category_order ?? Object.keys(config.fields)).length}</strong>{" "}
              setting groups
            </div>
          ) : (
            <span className="cc-loading">Loading…</span>
          )}
        </GuideCard>

        {/* GUIDED: Tools */}
        <GuideCard
          icon="🛠"
          title="Tools & Toolsets"
          what={C.tools.what}
          why={C.tools.why}
          chatHint="Configure toolsets"
          onOpenChat={() => openChat("Show my available Hermes toolsets and help me enable the right ones.")}
        />

        {/* GUIDED: MCP */}
        <GuideCard
          icon="🔌"
          title="MCP Servers"
          what={C.mcp.what}
          why={C.mcp.why}
          chatHint="Set up an MCP server"
          onOpenChat={() => openChat("Help me add an MCP server to Hermes with a clear example.")}
        />

        {/* GUIDED: Bots */}
        <GuideCard
          icon="🤖"
          title="Bots"
          what={C.bots.what}
          why={C.bots.why}
          chatHint="Create a bot"
          onOpenChat={() => openChat("Help me create a named Bot in Hermes for my main workflow.")}
        />

        {/* LIVE (memory panel exists) */}
        <GuideCard
          icon="🧠"
          title="Memory"
          live
          what={C.memory.what}
          why={C.memory.why}
          chatHint="View memory"
          onOpenChat={() => openChat("Show my Hermes memory and how to improve it.")}
        />

        {/* GUIDED: Cron */}
        <GuideCard
          icon="⏰"
          title="Cron Jobs"
          what={C.cron.what}
          why={C.cron.why}
          chatHint="Set up a scheduled task"
          onOpenChat={() => openChat("Help me create a scheduled Cron job in Hermes.")}
        />

        {/* GUIDED: Gateway */}
        <GuideCard
          icon="📡"
          title="Gateway (Telegram & more)"
          what={C.gateway.what}
          why={C.gateway.why}
          chatHint="Connect a gateway"
          onOpenChat={() => openChat("Help me connect Hermes to Telegram via the gateway.")}
        />

        {/* GUIDED: Connections */}
        <GuideCard
          icon="🔗"
          title="Connections"
          what={C.connections.what}
          why={C.connections.why}
          chatHint="Check connections"
          onOpenChat={() => openChat("Check my Hermes connections and fix any that are broken.")}
        />
      </div>
    </div>
  );
}
