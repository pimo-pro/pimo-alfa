import { useState } from "react";
import type { RematePieceTipo } from "../../../core/remate/rematePieceTypes";
import { REMATE_PIECE_TIPO_LABELS } from "../../../core/remate/rematePieceTypes";

const OPTIONS: RematePieceTipo[] = ["DIR", "ESQ", "CIMA", "BAIXO", "L", "RODAPE", "RODAPE_L"];

type Props = {
  boxId: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (_tipo: RematePieceTipo) => void;
};

export default function AdicionarRemateModal({ open, onClose, onConfirm }: Props) {
  const [tipo, setTipo] = useState<RematePieceTipo>("DIR");
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(360px, 92vw)",
          padding: 16,
          borderRadius: 12,
          background: "var(--modal-bg, rgba(15,23,42,0.98))",
          border: "1px solid var(--modal-border, rgba(255,255,255,0.10))",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Adicionar Remate</h3>
        <select
          className="select"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as RematePieceTipo)}
          style={{ width: "100%" }}
        >
          {OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {REMATE_PIECE_TIPO_LABELS[opt]}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onConfirm(tipo);
              onClose();
            }}
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
