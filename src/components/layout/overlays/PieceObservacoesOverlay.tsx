import { useState } from "react";
import { useProject } from "../../../context/useProject";
import { getPieceObservacoes } from "../../../core/observacoes/ObservacoesService";
import PieceObservacoesEditor from "../../settings/observacoes/PieceObservacoesEditor";

type PieceObservacoesOverlayProps = {
  pieceId: string;
  pieceName: string;
  onClose: () => void;
};

export default function PieceObservacoesOverlay({
  pieceId,
  pieceName,
  onClose,
}: PieceObservacoesOverlayProps) {
  const { project, actions } = useProject();
  const [draft, setDraft] = useState("");
  const observacoes = getPieceObservacoes(pieceId, project.pieceObservacoes);

  return (
    <div
      role="dialog"
      aria-label="Observações da peça"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(8, 12, 26, 0.98)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Observações da peça</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{pieceName}</div>
          </div>
          <button
            type="button"
            className="button button-ghost"
            style={{ fontSize: 11 }}
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <PieceObservacoesEditor
          observacoes={observacoes}
          draft={draft}
          onDraftChange={setDraft}
          onAdd={() => {
            actions.addPieceObservacao(pieceId, draft);
            setDraft("");
          }}
          onRemove={(index) => actions.removePieceObservacao(pieceId, index)}
          compact
        />
      </div>
    </div>
  );
}
