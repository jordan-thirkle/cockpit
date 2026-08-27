import { useState } from "react";
import { cockpitStore, type CockpitFolder } from "@/lib/cockpitStore";

export function Sidebar({
  activeFolder,
  onSelect,
  sessionCount,
}: {
  activeFolder: string;
  onSelect: (id: string) => void;
  sessionCount: (folderId: string) => number;
}) {
  const folders = cockpitStore.getFolders();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const submitNew = async () => {
    const n = name.trim();
    if (!n) return;
    const f = await cockpitStore.createFolder(n);
    setName("");
    setCreating(false);
    onSelect(f.id);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand">
          <div className="brand-mark">J</div>
          <div>
            <div className="brand-name">Cockpit</div>
            <div className="brand-sub">byjtt.com · Hermes</div>
          </div>
        </div>
      </div>

      <div className="sidebar-scroll">
        {folders.map((f: CockpitFolder) => (
          <div
            key={f.id}
            className={`folder${f.system ? " system" : ""}${
              activeFolder === f.id ? " active" : ""
            }`}
            onClick={() => onSelect(f.id)}
          >
            <span className="folder-icon">{f.icon ?? "▦"}</span>
            <span className="folder-name">{f.name}</span>
            <span className="folder-count">{sessionCount(f.id)}</span>
          </div>
        ))}

        {creating ? (
          <div className="folder" style={{ padding: "6px 10px" }}>
            <input
              autoFocus
              value={name}
              placeholder="Folder name…"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
                if (e.key === "Escape") setCreating(false);
              }}
              style={{
                flex: 1,
                background: "var(--canvas)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                color: "var(--text)",
                padding: "4px 8px",
                fontSize: 13,
              }}
            />
          </div>
        ) : (
          <div
            className="folder"
            onClick={() => setCreating(true)}
            style={{ color: "var(--text-faint)" }}
          >
            <span className="folder-icon">＋</span>
            <span className="folder-name">New folder</span>
          </div>
        )}
      </div>

      <div className="sidebar-foot">
        <span>Hermes v0.20.6</span>
      </div>
    </aside>
  );
}
