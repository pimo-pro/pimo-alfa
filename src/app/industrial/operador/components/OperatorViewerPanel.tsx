import { useEffect, useState } from 'react';

import ProjetosShowroomPanel from '@/app/PROJETOS/ProjetosShowroomPanel';
import { loadProjectRecord } from '@/core/projects/projectsClient';
import type { SavedProjectRecord } from '@/core/projects/types';
import { industrialCanvasShellStyle, industrialSectionTitleStyle } from '@/industrial/ui/layouts/industrialStyles';

import type { OperatorSessionPiece } from '../types';

type Props = {
  piece: OperatorSessionPiece | null;
};

export default function OperatorViewerPanel({ piece }: Props) {
  const [snapshot, setSnapshot] = useState<SavedProjectRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!piece?.projectId) {
      setSnapshot(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadProjectRecord(piece.projectId)
      .then((record) => {
        if (!cancelled) setSnapshot(record);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar projecto para viewer 3D.');
          setSnapshot(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [piece?.projectId]);

  if (!piece) {
    return (
      <section style={industrialCanvasShellStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#64748b',
            fontSize: 13,
          }}
        >
          Carregue uma peça para visualizar o modelo 3D.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 style={{ ...industrialSectionTitleStyle, marginBottom: 8 }}>Viewer 3D</h3>
      <div style={industrialCanvasShellStyle}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
            A carregar modelo…
          </div>
        ) : error ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#f87171', padding: 16, textAlign: 'center' }}>
            {error}
          </div>
        ) : snapshot ? (
          <ProjetosShowroomPanel
            key={`${piece.pieceId}-${piece.projectId}`}
            snapshot={snapshot}
            focusLevel="piece"
            projectPageSlug={piece.projectPageSlug}
            boxId={piece.boxId}
            pieceId={piece.pieceId}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#64748b' }}>
            Projecto não disponível offline.
          </div>
        )}
      </div>
    </section>
  );
}
