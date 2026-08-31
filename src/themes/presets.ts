import type { ThemePreset } from "./types";

// ── By JTT brand tokens (verified against the live byjtt.com repo, 2026-08-19) ──
// Light-paper default. Warm, editorial, physical-materials register.
// NO neon, NO glow/shadow/gradient, NO dark-military-grey. Hairlines only.
// Signal (vermilion) is reserved and used ≤10% of the surface area.
// Source of truth: byjtt-brand-systems skill → references/byjtt-com-current-brand.md
const BYJTT_PAPER: ThemePreset = {
  id: "byjtt-paper",
  name: "By JTT · Paper",
  mode: "light",
  tokens: {
    "--paper": "#f5f2eb",
    "--ink": "#161614",
    "--surface": "#fdfbf7",
    "--surface-2": "#f0ebe1",
    "--line": "#e3ddd2",
    "--muted": "#5a564f",
    "--chip": "#efe9df",
    "--signal": "#be3718",
    "--ok": "#2e7d32",
    "--warn": "#b07a1e",
    "--danger": "#a8281a",
    "--on-signal": "#ffffff",
    "--font-display": "'Space Grotesk', 'Geist', system-ui, sans-serif",
    "--font-mono": "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
    "--radius": "10px",
    "--radius-sm": "6px",
  },
};

// Carbon — a calm dark option for low-light work. Deliberately NOT cyan/magenta
// "AI slop": warm near-black with the same byjtt vermilion signal, brass focus.
const BYJTT_CARBON: ThemePreset = {
  id: "byjtt-carbon",
  name: "By JTT · Carbon",
  mode: "dark",
  tokens: {
    "--paper": "#161513",
    "--ink": "#f3efe6",
    "--surface": "#1e1c19",
    "--surface-2": "#26231f",
    "--line": "#34302a",
    "--muted": "#a39c8f",
    "--chip": "#2a2620",
    "--signal": "#be3718",
    "--signal-soft": "#e8834a",
    "--ok": "#56a878",
    "--warn": "#caa15a",
    "--danger": "#d4543a",
    "--on-signal": "#ffffff",
    "--font-display": "'Space Grotesk', 'Geist', system-ui, sans-serif",
    "--font-mono": "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
    "--radius": "10px",
    "--radius-sm": "6px",
  },
};

// Coast — a cooler, sun-bleached coastal variant (sand / bleached plaster /
// deep sea). Shows the system is extensible beyond the two house themes.
const BYJTT_COAST: ThemePreset = {
  id: "byjtt-coast",
  name: "By JTT · Coast",
  mode: "light",
  tokens: {
    "--paper": "#eef0ec",
    "--ink": "#15201d",
    "--surface": "#f7f8f5",
    "--surface-2": "#e4e8e3",
    "--line": "#d4dad4",
    "--muted": "#5d6b64",
    "--chip": "#e0e6e0",
    "--signal": "#1f6f6a",
    "--ok": "#2e7d32",
    "--warn": "#9a7b1e",
    "--danger": "#a8281a",
    "--on-signal": "#ffffff",
    "--font-display": "'Space Grotesk', 'Geist', system-ui, sans-serif",
    "--font-mono": "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
    "--radius": "10px",
    "--radius-sm": "6px",
  },
};

export const PRESETS: ThemePreset[] = [BYJTT_PAPER, BYJTT_CARBON, BYJTT_COAST];

export const DEFAULT_THEME_ID = "byjtt-paper";
