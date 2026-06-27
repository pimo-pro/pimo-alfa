import { loadProjectRecord } from "@/core/projects/projectsClient";
import type { SavedProjectRecord } from "@/core/projects/types";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";

import ProjetosShowroomPanel, { type ProjetosFocusLevel } from "../ProjetosShowroomPanel";
import {
  getProjetosSnapshot,
  setProjetosSnapshot,
} from "../projetosSnapshotCache";

function resolveFocusLevel(boxId?: string, pieceId?: string): ProjetosFocusLevel {
  if (pieceId) return "piece";
  if (boxId) return "box";
  return "project";
}

function snapshotMatchesProject(snapshot: SavedProjectRecord | null, projectId: string | undefined) {
  return snapshot !== null && projectId !== undefined && snapshot.id === projectId;
}

export default function ProjetosHubLayout({ children }: { children?: ReactNode }) {
  const { project: projectId, box: boxId, piece: pieceId } = useParams();
  const focusLevel = useMemo(() => resolveFocusLevel(boxId, pieceId), [boxId, pieceId]);

  const [snapshot, setSnapshot] = useState<SavedProjectRecord | null>(() => {
    const cached = getProjetosSnapshot();
    return snapshotMatchesProject(cached, projectId) ? cached : null;
  });
  const [loading, setLoading] = useState(() => !snapshotMatchesProject(getProjetosSnapshot(), projectId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError("Projeto não especificado na URL.");
      setLoading(false);
      return;
    }

    const cached = getProjetosSnapshot();
    if (snapshotMatchesProject(cached, projectId)) {
      setSnapshot(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadProjectRecord(projectId).then((record) => {
      if (cancelled) return;

      if (!record) {
        setSnapshot(null);
        setLoading(false);
        setError("Projeto não encontrado.");
        return;
      }

      setProjetosSnapshot(record);
      setSnapshot(record);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 240, background: "#f2f2f2" }}>
        HUB — Sidebar (placeholder)
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 56, background: "#e6e6e6" }}>
          HUB — Topbar (placeholder)
        </header>
        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {loading && <div style={{ padding: 16 }}>A carregar projeto…</div>}
          {!loading && error && <div style={{ padding: 16 }}>{error}</div>}
          {!loading && !error && (
            <ProjetosShowroomPanel
              snapshot={snapshot}
              focusLevel={focusLevel}
              projectId={projectId}
              boxId={boxId}
              pieceId={pieceId}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
