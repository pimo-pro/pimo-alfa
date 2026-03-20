/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

export function NotesField({ projectName }: { projectName: string }) {
  const storageKey = `pimo_project_notes:${projectName}`;
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) ?? "";
      setNotes(saved);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, notes);
    } catch {
      /* ignore */
    }
  }, [storageKey, notes]);

  return (
    <div>
      <textarea
        className="input input-sm"
        style={{ width: "100%", minHeight: 80 }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas do projeto (local)"
      />
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Nota atual:</div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--text-main)", background: "var(--surface)", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}>
          {notes || (<span style={{ color: "var(--text-muted)" }}>Nenhuma nota</span>)}
        </div>
      </div>
    </div>
  );
}
