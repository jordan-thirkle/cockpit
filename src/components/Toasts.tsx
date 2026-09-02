import { useEffect, useState } from "react";

// Minimal toast host — surfaces Cockpit metadata/save failures instead of
// letting them die as unhandled promise rejections (which looked like silent
// data loss: the UI kept working, then the change vanished on reload).
export type ToastKind = "error" | "info" | "ok";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (toasts: Toast[]) => void;

let current: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(current);
}

export function showToast(message: string, kind: ToastKind = "error"): void {
  const t: Toast = { id: nextId++, message, kind };
  current = [...current, t];
  emit();
  window.setTimeout(() => dismissToast(t.id), kind === "error" ? 8000 : 4500);
}

export function dismissToast(id: number): void {
  current = current.filter((t) => t.id !== id);
  emit();
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(current);

  useEffect(() => {
    const l: Listener = (t) => setItems([...t]);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span className="toast-msg">{t.message}</span>
          <button
            type="button"
            className="toast-x"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/** Run an async store mutation; surface failures as a toast instead of an
 *  unhandled rejection. Use for every cockpitStore/repoStore write path. */
export async function runMutation(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    showToast(err instanceof Error ? err.message : String(err));
  }
}
