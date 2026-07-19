import { ORLA_VIEWER_RENDERING_ENABLED } from "../../../3d/viewer-engine/orla/orlaViewerFlags";
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

function BoxOrlaSectionActive({ boxId, boxNome }: BoxOrlaSectionProps) {
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
                  className="btn btn-ghost"
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    fontSize: 12,
                  }}
                  onClick={() =>
                    setExpandedPiece((prev) => (prev === panelId ? null : panelId))
                  }
                >
                  <span>{nome || panelId}</span>
                  <span>{expandedPiece === panelId ? "▾" : "▸"}</span>
                </button>
                {expandedPiece === panelId && (
                  <div style={{ padding: "0 10px 10px", display: "grid", gap: 6 }}>
                    {ORLA_SIDES.map((side) => (
                      <label
                        key={side}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!config.sides[side]?.enabled}
                          onChange={(e) => {
                            actions.setPieceOrlaSide(panelId, side, {
                              enabled: e.target.checked,
                              presetId:
                                config.sides[side]?.presetId ??
                                wsBox?.orlaPresetId ??
                                presets[0]?.id ??
                                null,
                            });
                          }}
                        />
                        <span style={{ minWidth: 72 }}>{SIDE_LABELS[side]}</span>
                        <select
                          className="select"
                          style={{ flex: 1 }}
                          value={config.sides[side]?.presetId ?? ""}
                          disabled={!config.sides[side]?.enabled}
                          onChange={(e) => {
                            actions.setPieceOrlaSide(panelId, side, {
                              presetId: e.target.value || null,
                              enabled: true,
                            });
                          }}
                        >
                          <option value="">Preset…</option>
                          {presets.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
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

/** UI de orla no Viewer — desativada enquanto não houver renderização 3D dedicada. */
export default function BoxOrlaSection(props: BoxOrlaSectionProps) {
  if (!ORLA_VIEWER_RENDERING_ENABLED) return null;
  return <BoxOrlaSectionActive {...props} />;
}
