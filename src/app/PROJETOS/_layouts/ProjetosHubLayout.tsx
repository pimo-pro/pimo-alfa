import type { SavedProjectRecord } from "@/core/projects/types";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";

import ProjetosShowroomPanel, { type ProjetosFocusLevel } from "../ProjetosShowroomPanel";
import ProjetosElementSections from "../ProjetosElementSections";
import {
  getProjetosSnapshot,
  setProjetosSnapshot,
} from "../projetosSnapshotCache";
import {
  loadProjectRecordByPageSlug,
} from "../projetosProjectLoader";
import {
  snapshotMatchesProjetosPageSlug,
} from "../projetosPageSlug";

function resolveFocusLevel(boxId?: string, pieceId?: string): ProjetosFocusLevel {
  if (pieceId) return "piece";
  if (boxId) return "box";
  return "project";
}

function snapshotMatchesProject(snapshot: SavedProjectRecord | null, pageSlug: string | undefined) {
  return snapshotMatchesProjetosPageSlug(snapshot, pageSlug);
}

export default function ProjetosHubLayout({ children }: { children?: ReactNode }) {
  const { project: pageSlug, box: boxId, piece: pieceId } = useParams();
  const focusLevel = useMemo(() => resolveFocusLevel(boxId, pieceId), [boxId, pieceId]);

  const [snapshot, setSnapshot] = useState<SavedProjectRecord | null>(() => {
    const cached = getProjetosSnapshot();
    return snapshotMatchesProject(cached, pageSlug) ? cached : null;
  });
  const [loading, setLoading] = useState(() => !snapshotMatchesProject(getProjetosSnapshot(), pageSlug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageSlug) {
      setError("Projeto não especificado na URL.");
      setLoading(false);
      return;
    }

    const cached = getProjetosSnapshot();
    if (snapshotMatchesProject(cached, pageSlug)) {
      setSnapshot(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadProjectRecordByPageSlug(pageSlug).then((record) => {
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
  }, [pageSlug]);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside
        style={{
          width: 280,
          minWidth: 240,
          maxWidth: 320,
          background: "#f4f4f5",
          borderRight: "1px solid #e4e4e7",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!loading && !error ? (
          <ProjetosElementSections snapshot={snapshot} />
        ) : (
          <div style={{ padding: 12, fontSize: 12, color: "#71717a" }}>
            {loading ? "A carregar…" : error}
          </div>
        )}
      </aside>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 48,
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            background: "#fafafa",
            borderBottom: "1px solid #e4e4e7",
            fontSize: 13,
            fontWeight: 600,
            color: "#3f3f46",
          }}
        >
          {snapshot?.name?.trim() || decodeURIComponent(pageSlug ?? "Projeto")}
        </header>
        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {loading && <div style={{ padding: 16 }}>A carregar projeto…</div>}
          {!loading && error && <div style={{ padding: 16 }}>{error}</div>}
          {!loading && !error && (
            <ProjetosShowroomPanel
              snapshot={snapshot}
              focusLevel={focusLevel}
              projectPageSlug={pageSlug}
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
