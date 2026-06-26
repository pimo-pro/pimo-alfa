import { useMemo, useState } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import {
  enumerateIndustrialPiecesForBox,
  getBoxObservacoes,
  getPieceObservacoes,
} from "../../../core/observacoes/ObservacoesService";
import { buildBoxesWithCutList } from "../../../context/projectState";
import PieceObservacoesEditor from "./PieceObservacoesEditor";

const categoryLabels: Record<string, string> = {
  painel: "Painel",
  porta: "Porta",
  gaveta: "Gaveta",
  remate: "Remate",
  rodape: "Roda pé",
  sep: "Separador",
  div: "Divisório",
  outro: "Peça",
};

type BoxPecasObservacoesSectionProps = {
  boxId: string;
  boxNome: string;
};

export default function BoxPecasObservacoesSection({ boxId, boxNome }: BoxPecasObservacoesSectionProps) {
  const { project, actions } = useProject();
  const [boxDraft, setBoxDraft] = useState("");
  const [pieceDrafts, setPieceDrafts] = useState<Record<string, string>>({});
  const [expandedPieceId, setExpandedPieceId] = useState<string | null>(null);

  const wsBox = project.workspaceBoxes.find((b) => b.id === boxId);
  const boxObservacoes = getBoxObservacoes(wsBox);

  const pieces = useMemo(() => {
    const boxesWithCut = buildBoxesWithCutList(project);
    const box = boxesWithCut.find((b) => b.id === boxId);
    if (!box) return [];
    return enumerateIndustrialPiecesForBox({
      box,
      boxNome,
      projectName: project.projectName,
      remates: project.remates,
      rodapes: project.rodapes,
    });
  }, [project, boxId, boxNome]);

  return (
    <>
      <Panel title="Observações da caixa" description={`Notas gerais para ${boxNome}.`}>
        <PieceObservacoesEditor
          observacoes={boxObservacoes}
          draft={boxDraft}
          onDraftChange={setBoxDraft}
          onAdd={() => {
            actions.addBoxObservacao(boxId, boxDraft);
            setBoxDraft("");
          }}
          onRemove={(index) => actions.removeBoxObservacao(boxId, index)}
        />
      </Panel>

      <Panel title="Peças do Box" description="Observações por peça industrial (PDF, etiquetas, cutlist).">
        {pieces.length === 0 ? (
          <p className="muted-text" style={{ margin: 0, fontSize: 12 }}>
            Nenhuma peça industrial nesta caixa.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pieces.map((piece) => {
              const obs = getPieceObservacoes(piece.pieceId, project.pieceObservacoes);
              const expanded = expandedPieceId === piece.pieceId;
              return (
                <div
                  key={piece.pieceId}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPieceId((id) => (id === piece.pieceId ? null : piece.pieceId))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface)",
                      border: "none",
                      textAlign: "left",
                      fontSize: 12,
                      cursor: "pointer",
                      color: "var(--text-main)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <strong>{piece.nome}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
                        {categoryLabels[piece.categoria] ?? piece.tipo}
                      </span>
                      {piece.industrialRef ? (
                        <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)" }}>
                          {piece.industrialRef}
                        </span>
                      ) : null}
                    </span>
                    {obs.length > 0 ? (
                      <span
                        title={`${obs.length} observação(ões)`}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 5px",
                          borderRadius: 4,
                          background: "rgba(251, 191, 36, 0.2)",
                          color: "#fbbf24",
                          flexShrink: 0,
                        }}
                      >
                        OBS
                      </span>
                    ) : null}
                  </button>
                  {expanded ? (
                    <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border-subtle)" }}>
                      <PieceObservacoesEditor
                        observacoes={obs}
                        draft={pieceDrafts[piece.pieceId] ?? ""}
                        onDraftChange={(value) =>
                          setPieceDrafts((prev) => ({ ...prev, [piece.pieceId]: value }))
                        }
                        onAdd={() => {
                          actions.addPieceObservacao(piece.pieceId, pieceDrafts[piece.pieceId] ?? "");
                          setPieceDrafts((prev) => ({ ...prev, [piece.pieceId]: "" }));
                        }}
                        onRemove={(index) => actions.removePieceObservacao(piece.pieceId, index)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
