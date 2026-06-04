import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useProject } from "../../../context/useProject";
import { useUiStore } from "../../../stores/uiStore";
import { REMATE_PIECE_TIPO_LABELS } from "../../../core/remate/rematePieceTypes";
import type { RematePieceTipo } from "../../../core/remate/rematePieceTypes";
import BoxRodapeSection from "../rodape/BoxRodapeSection";

const OPTIONS: RematePieceTipo[] = ["DIR", "ESQ", "CIMA", "BAIXO", "L", "RODAPE", "RODAPE_L"];

const drawerShellStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1350,
  pointerEvents: "none",
};

const backdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  pointerEvents: "auto",
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(360px, 92vw)",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(7, 11, 24, 0.98)",
  boxShadow: "-10px 0 30px rgba(0,0,0,0.35)",
  pointerEvents: "auto",
  zIndex: 1351,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-main)",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

type Props = {
  boxId: string;
  open: boolean;
  onClose: () => void;
  defaultMaterialId?: string;
};

export default function BoxRemateDrawer({ boxId, open, onClose, defaultMaterialId }: Props) {
  const { project, actions } = useProject();
  const setSelectedObject = useUiStore((s) => s.setSelectedObject);
  const [tipo, setTipo] = useState<RematePieceTipo>("DIR");

  const remates = useMemo(
    () => (project.remates ?? []).filter((r) => r.parentBoxId === boxId),
    [project.remates, boxId]
  );

  if (!open || typeof document === "undefined") return null;

  const materialPreset =
    defaultMaterialId || project.materialId || project.material.tipo || "default";

  return createPortal(
    <div className="box-remate-drawer" style={drawerShellStyle} role="presentation">
      <div style={backdropStyle} onClick={onClose} aria-hidden />
      <aside
        className="box-remate-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="box-remate-drawer-title"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={headerStyle}>
          <span id="box-remate-drawer-title">Remate</span>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div style={bodyStyle}>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
            Remate do módulo — adicione e configure peças de acabamento (DIR, ESQ, CIMA, etc.).
          </p>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>Adicionar remate</div>
            <select
              className="select input-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as RematePieceTipo)}
            >
              {OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {REMATE_PIECE_TIPO_LABELS[opt]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                actions.createRematePiece({
                  tipo,
                  parentBoxId: boxId,
                  followBox: true,
                  materialPresetId: materialPreset,
                });
              }}
            >
              Criar remate
            </button>
          </div>

          <BoxRodapeSection boxId={boxId} embedded />

          {remates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>
                Remates deste módulo ({remates.length})
              </div>
              {remates.map((remate) => (
                <button
                  key={remate.id}
                  type="button"
                  className="btn"
                  style={{
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "10px 12px",
                  }}
                  onClick={() => {
                    setSelectedObject({ type: "remate", id: remate.id });
                    onClose();
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{remate.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {REMATE_PIECE_TIPO_LABELS[remate.tipo] ?? remate.tipo}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
              Nenhum remate neste módulo. Use o formulário acima para criar.
            </p>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
