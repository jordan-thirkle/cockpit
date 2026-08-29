// @ts-nocheck -- vendored pages import Hermes's theme module. Cockpit already
// ships its own theme system (src/themes), so we re-export from there instead
// of vendoring Hermes's full theme engine (integrate, don't rebuild). Only the
// symbols the ported pages actually use are surfaced; the rest are typed-loose
// stubs so imports resolve without dragging in Hermes's theme internals.
export { ThemeProvider, useTheme } from "@/themes";
export { PRESETS as BUILTIN_THEMES, DEFAULT_THEME_ID as defaultTheme } from "@/themes";

// Hermes theme module also exposes font choices; Cockpit's theme system folds
// fonts into presets, so provide minimal compatible stubs.
export const FONT_CHOICES: any[] = [];
export const THEME_DEFAULT_FONT_ID = "default";
export const getFontChoice = (_id: string): any => null;
export const isOverrideFont = (_id: string): boolean => false;

export type FontChoice = any;
export type FontCategory = any;
export type DashboardTheme = any;
export type ThemeLayer = any;
export type ThemeListEntry = any;
export type ThemeListResponse = any;
export type ThemePalette = any;
