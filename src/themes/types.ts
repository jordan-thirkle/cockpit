// Cockpit theme contract.
// Mirrors Hermes dashboard's approach: a theme is just a named bag of CSS
// custom properties (design tokens). Adding a theme = appending one entry to
// PRESETS below (or, later, loading server-side user themes via the API).
// The active theme's tokens are injected onto :root at runtime, so every
// component styles itself from var(--token) and never hardcodes a color.

export interface ThemeTokens {
  // Surfaces
  "--paper": string; // page background
  "--ink": string; // primary text
  "--surface": string; // raised panels / cards
  "--surface-2": string; // nested panels
  "--line": string; // hairline borders
  "--muted": string; // secondary text
  "--chip": string; // tags / chips background
  // Brand
  "--signal": string; // reserved accent (used sparingly, ≤10%)
  "--signal-soft"?: string; // softer accent for TEXT-ON-DARK (links/values); light themes omit and fall back to --signal
  "--ok": string; // success / live
  "--warn": string; // attention
  "--danger": string; // destructive / error
  "--on-signal": string; // text/icon color drawn on --signal fills (active nav, primary buttons)
  // Type
  "--font-display": string;
  "--font-mono": string;
  // Geometry
  "--radius": string;
  "--radius-sm": string;
}

export interface ThemePreset {
  id: string;
  name: string;
  // "light" | "dark" — used only for the picker badge + default text color hint
  mode: "light" | "dark";
  tokens: ThemeTokens;
}

// Optional server-side user theme (future): { id, name, tokens, source: "user" }
export type ThemeEntry = ThemePreset;
