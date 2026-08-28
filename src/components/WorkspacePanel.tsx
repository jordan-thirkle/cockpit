import { useState } from "react";
import type { CockpitFolder } from "@/lib/cockpitStore";

export function WorkspacePanel({
  folder,
  onUpdate,
  onDelete,
}: {
  folder: CockpitFolder;
  onUpdate: (patch: Partial<CockpitFolder>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (folder.system) return null;

  return (
    <div className="workspace">
      <h3>Workspace · {folder.name}</h3>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            defaultValue={folder.subtitle ?? ""}
            placeholder="Subtitle"
            onBlur={(e) => onUpdate({ subtitle: e.target.value })}
            style={inputStyle}
          />
          <textarea
            defaultValue={folder.notes ?? ""}
            placeholder="Workspace notes…"
            rows={3}
            onBlur={(e) => onUpdate({ notes: e.target.value })}
            style={{ ...inputStyle, fontFamily: "var(--font-mono)", resize: "vertical" }}
          />
          <button className="btn-ghost" onClick={() => setEditing(false)}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="link-row">
            {(folder.links ?? []).map((l, i) => (
              <a key={i} className="link-chip" href={l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
            <button className="link-chip" onClick={() => setEditing(true)}>
              ✎ edit
            </button>
            <button className="link-chip" onClick={onDelete} style={{ color: "var(--danger)" }}>
              🗑 delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--paper)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
  borderRadius: 6,
  padding: "6px 9px",
  fontSize: 12,
  outline: "none",
};
