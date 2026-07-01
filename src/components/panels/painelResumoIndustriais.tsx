import { useMemo, useState } from "react";
import { useProject } from "../../context/useProject";
import { useMaterials } from "../../hooks/useMaterials";
import { buildCutlistItemsForIndustrialExport } from "../../core/fabrication/buildCutlistItemsForIndustrialExport";
import { buildResumoIndustriaisRows } from "../../core/industrial/industrialBottomSectionData";
import {
  validateIndustrialDimensions,
  computeIndustrialPieceMetrics,
} from "../../core/industrial/IndustrialPieceEditsService";
import Panel from "../ui/Panel";
import PieceObservacoesOverlay from "../layout/overlays/PieceObservacoesOverlay";
import { ModalPortal } from "../ui/ModalPortal";
import Button from "../ui/Button";

const inputStyle: React.CSSProperties = {
  width: 52,
  padding: "2px 4px",
  fontSize: 11,
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.25)",
  color: "var(--text-main)",
};

export default function PainelResumoIndustriais() {
  const { project, actions } = useProject();
  const { materials } = useMaterials();
  const [obsPiece, setObsPiece] = useState<{ id: string; label: string } | null>(null);
  const [movePiece, setMovePiece] = useState<{ id: string; label: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [deletePiece, setDeletePiece] = useState<{ id: string; label: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [draftDims, setDraftDims] = useState<Record<string, { comp: string; larg: string; esp: string }>>({});

  const boxes = project.boxes ?? [];

  const items = useMemo(
    () =>
      buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
        industrialPieceEdits: project.industrialPieceEdits,
      }),
    [boxes, project]
  );

  const rows = useMemo(
    () =>
      buildResumoIndustriaisRows(
        items,
        boxes,
        project.pieceObservacoes,
        project.industrialPieceEdits,
        materials
      ),
    [items, boxes, project.pieceObservacoes, project.industrialPieceEdits, materials]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          areaM2: acc.areaM2 + r.areaM2,
          pesoKg: acc.pesoKg + r.pesoKg,
        }),
        { areaM2: 0, pesoKg: 0 }
      ),
    [rows]
  );

  const previewMetrics = (itemId: string, item: (typeof items)[0]) => {
    const d = getDraft(itemId, item);
    const largura = Number(d.larg);
    const altura = Number(d.comp);
    const espessura = Number(d.esp);
    if (![largura, altura, espessura].every((v) => Number.isFinite(v) && v > 0)) {
      return computeIndustrialPieceMetrics(item, materials);
    }
    return computeIndustrialPieceMetrics(
      {
        ...item,
        dimensoes: { ...item.dimensoes, largura, altura, profundidade: espessura },
        espessura,
      },
      materials
    );
  };

  const getDraft = (itemId: string, item: (typeof items)[0]) => {
    const existing = draftDims[itemId];
    if (existing) return existing;
    return {
      comp: String(item.dimensoes.altura),
      larg: String(item.dimensoes.largura),
      esp: String(item.espessura ?? item.dimensoes.profundidade ?? ""),
    };
  };

  const commitDims = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const d = getDraft(itemId, item);
    const altura = Number(d.comp);
    const largura = Number(d.larg);
    const espessura = Number(d.esp);
    const err = validateIndustrialDimensions({ largura, altura, espessura });
    if (err) {
      window.alert(err);
      return;
    }
    actions.updateIndustrialPieceDimensions(itemId, { largura, altura, espessura });
  };

  const confirmMove = () => {
    if (!movePiece || !moveTarget) return;
    actions.moveIndustrialPiece(movePiece.id, moveTarget);
    setMovePiece(null);
    setMoveTarget("");
  };

  const confirmDelete = () => {
    if (!deletePiece) return;
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    actions.deleteIndustrialPiece(deletePiece.id);
    setDeletePiece(null);
    setDeleteStep(0);
  };

  if (boxes.length === 0) {
    return (
      <Panel title="Resumo Industriais — Painel Mestre">
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Adicione caixas para controlar peças industriais.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Resumo Industriais — Painel Mestre">
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
        Edite medidas (COMP/LARG/ESP) com validação industrial. Peso, área e consumo recalculam automaticamente.
        Refletem-se em cutlist, técnico, etiquetas, unified e PDFs industriais.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12 }}>
        <span>
          Área total: <strong>{totals.areaM2.toFixed(4)} m²</strong>
        </span>
        <span>
          Peso total: <strong>{totals.pesoKg.toFixed(2)} kg</strong>
        </span>
        <span>
          Peças: <strong>{rows.length}</strong>
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              {["Caixa", "Peça", "LARG", "COMP", "ESP", "Área m²", "Peso kg", "Observações", "Ações"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const item = items[idx];
              const draft = getDraft(item.id, item);
              const metrics = previewMetrics(item.id, item);
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: row.modified ? "rgba(250, 204, 21, 0.12)" : "transparent",
                  }}
                >
                  <td style={{ padding: "6px 8px" }}>{row.caixa}</td>
                  <td style={{ padding: "6px 8px" }}>{row.peca}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      style={inputStyle}
                      value={draft.larg}
                      onChange={(e) =>
                        setDraftDims((prev) => ({
                          ...prev,
                          [item.id]: { ...getDraft(item.id, item), larg: e.target.value },
                        }))
                      }
                      onBlur={() => commitDims(item.id)}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      style={inputStyle}
                      value={draft.comp}
                      onChange={(e) =>
                        setDraftDims((prev) => ({
                          ...prev,
                          [item.id]: { ...getDraft(item.id, item), comp: e.target.value },
                        }))
                      }
                      onBlur={() => commitDims(item.id)}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      style={inputStyle}
                      value={draft.esp}
                      onChange={(e) =>
                        setDraftDims((prev) => ({
                          ...prev,
                          [item.id]: { ...getDraft(item.id, item), esp: e.target.value },
                        }))
                      }
                      onBlur={() => commitDims(item.id)}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>
                    {metrics.consumoM2.toFixed(4)}
                  </td>
                  <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>
                    {metrics.pesoKg.toFixed(3)}
                  </td>
                  <td style={{ padding: "6px 8px", maxWidth: 180 }}>{row.observacoes || "—"}</td>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="button button-ghost"
                      style={{ fontSize: 10, padding: "2px 6px", marginRight: 4 }}
                      onClick={() => setObsPiece({ id: item.id, label: `${row.caixa} — ${row.peca}` })}
                    >
                      Obs
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      style={{ fontSize: 10, padding: "2px 6px", marginRight: 4 }}
                      onClick={() => {
                        setMovePiece({ id: item.id, label: `${row.caixa} — ${row.peca}` });
                        setMoveTarget(boxes[0]?.id ?? "");
                      }}
                    >
                      Mover
                    </button>
                    <button
                      type="button"
                      className="button button-ghost"
                      style={{ fontSize: 10, padding: "2px 6px", color: "#f87171" }}
                      onClick={() => {
                        setDeletePiece({ id: item.id, label: `${row.caixa} — ${row.peca}` });
                        setDeleteStep(0);
                      }}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {obsPiece ? (
        <PieceObservacoesOverlay
          pieceId={obsPiece.id}
          pieceName={obsPiece.label}
          onClose={() => setObsPiece(null)}
        />
      ) : null}

      {movePiece ? (
        <ModalPortal>
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal
            onClick={() => setMovePiece(null)}
          >
            <div className="modal-card" style={{ width: 360, padding: 16 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-title" style={{ marginBottom: 8 }}>
                Mover peça
              </div>
              <p style={{ fontSize: 12, margin: "0 0 12px" }}>{movePiece.label}</p>
              <label style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                Caixa de destino
                <select
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                >
                  {boxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome?.trim() || b.id}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => setMovePiece(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={confirmMove}>
                  Mover
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {deletePiece ? (
        <ModalPortal>
          <div className="modal-overlay" role="dialog" aria-modal onClick={() => { setDeletePiece(null); setDeleteStep(0); }}>
            <div className="modal-card" style={{ width: 380, padding: 16 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-title" style={{ marginBottom: 8, color: "#f87171" }}>
                Apagar peça
              </div>
              <p style={{ fontSize: 12, margin: "0 0 12px" }}>{deletePiece.label}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {deleteStep === 0 && "Confirmação 1/2 — esta ação remove a peça do fluxo industrial."}
                {deleteStep === 1 && "Confirmação 2/2 — confirme novamente para apagar definitivamente."}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => { setDeletePiece(null); setDeleteStep(0); }}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={confirmDelete}>
                  {deleteStep === 0 ? "Continuar" : "Apagar definitivamente"}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </Panel>
  );
}
