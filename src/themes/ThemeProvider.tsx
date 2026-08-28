import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRESETS, DEFAULT_THEME_ID } from "./presets";
import type { ThemePreset, ThemeTokens } from "./types";

const STORAGE_KEY = "cockpit.theme";

function applyTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) {
    root.style.setProperty(k, v);
  }
  // expose mode for any CSS that needs a light/dark branch
  const preset = PRESETS.find((p) => p.tokens === tokens);
  root.setAttribute("data-theme-mode", preset?.mode ?? "light");
}

function resolveInitial(): ThemePreset {
  if (typeof window === "undefined") return PRESETS[0];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const found = PRESETS.find((p) => p.id === saved);
    if (found) return found;
  }
  return PRESETS.find((p) => p.id === DEFAULT_THEME_ID) ?? PRESETS[0];
}

interface ThemeCtx {
  active: ThemePreset;
  themes: ThemePreset[];
  setTheme: (id: string) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ThemePreset>(resolveInitial);

  useEffect(() => {
    applyTokens(active.tokens);
    window.localStorage.setItem(STORAGE_KEY, active.id);
    document.title = "Cockpit — By JTT";
  }, [active]);

  const value = useMemo<ThemeCtx>(
    () => ({
      active,
      themes: PRESETS,
      setTheme: (id: string) => {
        const next = PRESETS.find((p) => p.id === id);
        if (next) setActive(next);
      },
    }),
    [active]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
