import { useState } from "react";
import { cockpitStore, type CockpitFolder } from "@/lib/cockpitStore";
import { showToast } from "./Toasts";

// First-run guided onboarding. Explains Cockpit in plain language and lets
// the user pick a use-case that tailors their workspace. Stored once.
const PRESETS: { id: string; label: string; icon: string; blurb: string }[] = [
  { id: "coder", label: "Coder", icon: "💻", blurb: "Build features, fix bugs, review PRs." },
  { id: "vibe", label: "Vibe coder", icon: "✨", blurb: "Describe what you want; watch it get built." },
  { id: "webdev", label: "Web developer", icon: "🌐", blurb: "Sites, APIs, deploys, SEO." },
  { id: "gamedev", label: "Game developer", icon: "🎮", blurb: "Prototypes, 3D, shaders, builds." },
  { id: "designer", label: "Designer", icon: "🎨", blurb: "Brand, UI, assets, concepts." },
  { id: "anything", label: "Anything", icon: "🔆", blurb: "General purpose — keep it flexible." },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = async () => {
    try {
      // Tailor: nudge default folders to match the use-case.
      for (const id of picked) {
        const map: Record<string, Partial<CockpitFolder>> = {
          gamedev: { subtitle: "Game dev: prototypes, 3D, builds" },
          webdev: { subtitle: "Web: sites, APIs, SEO" },
          designer: { subtitle: "Design: brand, UI, assets" },
        };
        if (map[id]) {
          const f = cockpitStore.getFolder("byjtt") ?? cockpitStore.getFolder("toolkit");
          if (f) await cockpitStore.updateFolder(f.id, map[id]);
        }
      }
      await cockpitStore.setSeenOnboarding();
    } catch (err) {
      // Never trap the user in onboarding — dismiss anyway, surface the error.
      showToast(
        `Could not save onboarding prefs: ${err instanceof Error ? err.message : err}`,
      );
    }
    onDone();
  };

  return (
    <div className="onboard-overlay" role="dialog" aria-label="Welcome to Cockpit">
      <div className="onboard-card">
        {step === 0 && (
          <>
            <div className="onboard-emoji">🛰️</div>
            <h1>Welcome to Cockpit</h1>
            <p className="onboard-lead">
              Cockpit is your friendly control room for <b>Hermes</b> — the AI
              assistant that can code, build, and automate. No jargon, no setup
              headaches: we'll show you what each part does and help you start.
            </p>
            <button className="btn-primary onboard-next" onClick={() => setStep(1)}>
              Get started
            </button>
            <button className="onboard-skip" onClick={finish}>
              Skip — I'll explore myself
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h2>What will you mostly do?</h2>
            <p className="onboard-lead">Pick any that fit — we'll tailor your space.</p>
            <div className="onboard-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`onboard-preset${picked.includes(p.id) ? " sel" : ""}`}
                  onClick={() => toggle(p.id)}
                >
                  <span className="onboard-preset-icon">{p.icon}</span>
                  <span className="onboard-preset-label">{p.label}</span>
                  <span className="onboard-preset-blurb">{p.blurb}</span>
                </button>
              ))}
            </div>
            <div className="onboard-actions">
              <button className="btn-ghost" onClick={() => setStep(0)}>
                Back
              </button>
              <button className="btn-primary" onClick={finish}>
                Finish & open Cockpit
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
