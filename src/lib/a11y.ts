// Keyboard activation for click-only rows (nav items, folders, repo rows,
// session rows). Divs styled as buttons aren't keyboard-reachable by default;
// pair this with role="button" + tabIndex={0} so Tab + Enter/Space works.
// The CSS :focus-visible ring for these classes already exists in index.css.
export function onKeyActivate(e: React.KeyboardEvent, fn: () => void): void {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
}
