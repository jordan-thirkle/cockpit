import { useTheme } from "./ThemeProvider";

// Compact theme picker — drops into the Cockpit header.
// Adding a theme later = one entry in presets.ts; it appears here automatically.
export function ThemePicker() {
  const { active, themes, setTheme } = useTheme();
  return (
    <label className="theme-picker" title="Theme">
      <span className="visually-hidden">Theme</span>
      <select
        value={active.id}
        onChange={(e) => setTheme(e.target.value)}
        aria-label="Theme"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
