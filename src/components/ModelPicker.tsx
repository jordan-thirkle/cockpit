import { useEffect, useMemo, useState } from "react";
import {
  getModelOptions,
  setModel,
  type ModelOptionProvider,
} from "@/lib/hermesApi";

// Two-stage model picker that mirrors Hermes's own dashboard picker:
// pick a provider, then a model within it. Applies via the real
// POST /api/model/set (writes config.yaml; applies to NEW sessions).
export function ModelPicker({ onClose }: { onClose: () => void }) {
  const [providers, setProviders] = useState<ModelOptionProvider[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [currentProvider, setCurrentProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [query, setQuery] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getModelOptions()
      .then((r) => {
        const next = r.providers ?? [];
        setProviders(next);
        setCurrentModel(String(r.model ?? ""));
        setCurrentProvider(String(r.provider ?? ""));
        setSelectedSlug(
          (next.find((p) => p.is_current) ?? next[0])?.slug ?? "",
        );
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => providers.find((p) => p.slug === selectedSlug) ?? null,
    [providers, selectedSlug],
  );
  const models = selected?.models ?? [];

  const q = query.trim().toLowerCase();
  const filteredProviders = useMemo(() => {
    if (!q) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.models ?? []).some((m) => m.toLowerCase().includes(q)),
    );
  }, [providers, q]);
  const filteredModels = useMemo(() => {
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, q]);

  const apply = async () => {
    if (!selectedSlug || !selectedModel || applying) return;
    setApplying(true);
    setError(null);
    try {
      const res = await setModel({
        scope: "main",
        provider: selectedSlug,
        model: selectedModel,
      });
      if (res.confirm_required) {
        setError(res.confirm_message || "This model needs confirmation.");
        return;
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="mp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mp-card">
        <header className="mp-head">
          <h2>Switch model</h2>
          <p className="mp-current">
            current: {currentModel || "(unknown)"}
            {currentProvider && ` · ${currentProvider}`}
          </p>
          <button className="mp-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="mp-search">
          <input
            autoFocus
            placeholder="Filter providers and models…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading && <div className="mp-loading">Loading models…</div>}
        {error && <div className="mp-error">{error}</div>}

        {!loading && !error && (
          <div className="mp-cols">
            <div className="mp-providers">
              {filteredProviders.map((p) => (
                <button
                  key={p.slug}
                  className={`mp-prov${p.slug === selectedSlug ? " active" : ""}`}
                  onClick={() => {
                    setSelectedSlug(p.slug);
                    setSelectedModel("");
                  }}
                >
                  <span>{p.name}</span>
                  <span className="mp-count">
                    {(p.models ?? []).length || 0}
                  </span>
                </button>
              ))}
            </div>
            <div className="mp-models">
              {filteredModels.map((m) => (
                <button
                  key={m}
                  className={`mp-model${m === selectedModel ? " active" : ""}`}
                  onClick={() => setSelectedModel(m)}
                >
                  {m}
                  {m === currentModel && <span className="mp-now">current</span>}
                </button>
              ))}
              {filteredModels.length === 0 && (
                <div className="mp-empty">No models match.</div>
              )}
            </div>
          </div>
        )}

        <footer className="mp-foot">
          <span className="mp-note">
            Saves to config.yaml — applies to new sessions.
          </span>
          <div className="mp-actions">
            <button className="btn-ghost" onClick={onClose} disabled={applying}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={apply}
              disabled={!selectedSlug || !selectedModel || applying}
            >
              {applying ? "Switching…" : "Switch"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
