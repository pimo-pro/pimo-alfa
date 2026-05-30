import { useMemo, useState } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { ORLA_SIDES, type OrlaSideId } from "../../../core/orla/orlaTypes";
import { resolvePieceOrlaConfig } from "../../../core/orla/orlaCalculator";
import { normalizeOrlaPresets } from "../../../core/orla/orlaPresets";
import { buildBoxesWithCutList } from "../../../context/projectState";

const SIDE_LABELS: Record<OrlaSideId, string> = {
  front: "Frente",
  back: "Trás",
  left: "Esquerda",
  right: "Direita",
};

type BoxOrlaSectionProps = {
  boxId: string;
  boxNome: string;
};

export default function BoxOrlaSection({ boxId, boxNome }: BoxOrlaSectionProps) {
  const { project, actions } = useProject();
  const presets = normalizeOrlaPresets(project.orlaPresets);
  const wsBox = project.workspaceBoxes.find((b) => b.id === boxId);
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);

  const pieces = useMemo(() => {
    const boxesWithCut = buildBoxesWithCutList(project);
    const box = boxesWithCut.find((b) => b.id === boxId);
    if (!box) return [];
    return (box.cutList ?? []).map((item) => {
      const panelId =
        typeof item.metadata?.panelId === "string" && item.metadata.panelId.trim().length > 0
          ? item.metadata.panelId
          : item.id;
      const config = resolvePieceOrlaConfig(
        panelId,
        project.orlaPieces,
        wsBox?.orlaPresetId,
        presets
      );
      return { panelId, nome: item.nome, config };
    });
  }, [project, boxId, wsBox?.orlaPresetId, presets]);

  return (
    <>
      <Panel title="Orla do Box" description={`Preset aplicado a ${boxNome}.`}>
        <select
          className="select"
          style={{ width: "100%" }}
          value={wsBox?.orlaPresetId ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            actions.setBoxOrlaPreset(boxId, value || null);
          }}
        >
          <option value="">Sem orla global</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Panel>

      {pieces.length > 0 && (
        <Panel title="Orla por peça">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pieces.map(({ panelId, nome, config }) => (
              <div
                key={panelId}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedPiece((id) => (id === panelId ? null : panelId))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "var(--surface)",
                    border: "none",
                    textAlign: "left",
                    fontSize: 12,
                    cursor: "pointer",
                    color: "var(--text-main)",
                  }}
                >
                  {nome}
                </button>
                {expandedPiece === panelId && (
                  <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {ORLA_SIDES.map((side) => {
                      const sc = config.sides[side];
                      return (
                        <div key={side} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, minWidth: 72, color: "var(--text-muted)" }}>
                            {SIDE_LABELS[side]}
                          </span>
                          <input
                            type="checkbox"
                            checked={sc.enabled}
                            onChange={(e) =>
                              actions.setPieceOrlaSide(panelId, side, { enabled: e.target.checked })
                            }
                          />
                          <select
                            className="select input-sm"
                            style={{ flex: 1 }}
                            disabled={!sc.enabled}
                            value={sc.presetId ?? ""}
                            onChange={(e) =>
                              actions.setPieceOrlaSide(panelId, side, {
                                presetId: e.target.value || null,
                              })
                            }
                          >
                            <option value="">—</option>
                            {presets.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                        Orla Junto (IDs de peças adjacentes, separados por vírgula)
                      </div>
                      <input
                        className="input input-sm"
                        style={{ width: "100%" }}
                        placeholder="ex: id-lateral, id-prateleira"
                        defaultValue={(config.orlaJunto ?? []).join(", ")}
                        onBlur={(e) => {
                          const partnerIds = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          actions.setPieceOrlaJunto(panelId, partnerIds);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
