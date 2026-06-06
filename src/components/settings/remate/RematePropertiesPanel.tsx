import { useMemo } from "react";
import { useProject } from "../../../context/useProject";
import Panel from "../../ui/Panel";
import { listOfficialMaterials } from "../../../core/materials/materials.api";
import type {
  RemateCompletoRules,
  RemateMountSlot,
  RemateProductOptions,
  RemateProductType,
} from "../../../core/remate/rematePieceTypes";
import {
  REMATE_MOUNT_SLOT_LABELS,
  REMATE_PRODUCT_TYPE_LABELS,
} from "../../../core/remate/rematePieceTypes";
import {
  DEFAULT_AVISTA_WIDTH_MM,
  defaultCompletoRules,
  defaultMountSlotForProduct,
  inferProductTypeFromLegacy,
} from "../../../core/remate/remateProductRules";
import { getMaterialByIdOrLabel } from "../../../core/materials/service";
import RemateRulesSection from "./RemateRulesSection";

type Props = { remateId: string };

const MOUNT_SLOTS: RemateMountSlot[] = ["FRENTE", "DIR", "ESQ", "CIMA", "FUNDO"];
const PRODUCTS: RemateProductType[] = ["AVISTA", "COMPLETO", "L", "RODAPE", "RODAPE_L"];

export default function RematePropertiesPanel({ remateId }: Props) {
  const { project, actions } = useProject();
  const remate = (project.remates ?? []).find((r) => r.id === remateId);
  const materials = useMemo(() => listOfficialMaterials().filter((m) => m.industrial), []);

  if (!remate) return null;

  const productType = remate.productType ?? inferProductTypeFromLegacy(remate);
  const productOptions = remate.productOptions ?? {};
  const faceEditable = productType === "AVISTA" || productType === "COMPLETO";
  const isMain = !remate.partRole || remate.partRole === "MAIN";
  const isCompleto = productType === "COMPLETO";

  // Thickness from material (read-only display)
  const material = getMaterialByIdOrLabel(remate.materialPresetId);
  const thicknessMm = Number(material?.espessura) || 19;

  // Parent box feet height for rules display
  const parentBox = remate.parentBoxId
    ? project.workspaceBoxes.find((b) => b.id === remate.parentBoxId)
    : null;
  const feetHeightMm = parentBox?.feetEnabled !== false
    ? Number(parentBox?.feetHeight ?? (parentBox?.pe_cm ?? 10) * 10) || 0
    : 0;

  const patchOptions = (patch: RemateProductOptions) =>
    actions.updateRemate(remate.id, {
      productOptions: { ...productOptions, ...patch },
      followBox: Boolean(remate.parentBoxId),
    });

  const patchCompletoRules = (rulePatch: Partial<RemateCompletoRules>) => {
    const currentRules = productOptions.completoRules ?? defaultCompletoRules();
    patchOptions({ completoRules: { ...currentRules, ...rulePatch } });
  };

  const completoRules = productOptions.completoRules ?? defaultCompletoRules();

  return (
    <Panel title="Propriedades do Remate" description={remate.name}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Tipo de produto
          <select
            className="select input-sm"
            value={productType}
            onChange={(e) =>
              actions.updateRemate(remate.id, {
                productType: e.target.value as RemateProductType,
                mountSlot: defaultMountSlotForProduct(e.target.value as RemateProductType),
                followBox: Boolean(remate.parentBoxId),
              })
            }
          >
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {REMATE_PRODUCT_TYPE_LABELS[p]}
              </option>
            ))}
          </select>
        </label>

        {faceEditable ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            Face de montagem
            <select
              className="select input-sm"
              value={remate.mountSlot ?? defaultMountSlotForProduct(productType)}
              onChange={(e) =>
                actions.updateRemate(remate.id, {
                  mountSlot: e.target.value as RemateMountSlot,
                  followBox: Boolean(remate.parentBoxId),
                })
              }
            >
              {MOUNT_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {REMATE_MOUNT_SLOT_LABELS[slot]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {productType === "AVISTA" ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Largura avista (mm)
              <input
                className="input input-sm"
                type="number"
                min={10}
                value={productOptions.avistaWidthMm ?? DEFAULT_AVISTA_WIDTH_MM}
                onChange={(e) =>
                  patchOptions({
                    avistaWidthMm: Math.max(10, Number(e.target.value) || DEFAULT_AVISTA_WIDTH_MM),
                  })
                }
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={productOptions.avistaFlushToDoor ?? false}
                onChange={(e) => patchOptions({ avistaFlushToDoor: e.target.checked })}
              />
              Encostar à porta (~20 mm)
            </label>
          </>
        ) : null}

        {productType === "COMPLETO" && isMain ? (
          <>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              Largura extra (mm)
              <input
                className="input input-sm"
                type="number"
                min={0}
                value={productOptions.coverageExtraMm ?? 0}
                onChange={(e) =>
                  patchOptions({ coverageExtraMm: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={productOptions.includeTopBottomRemates ?? false}
                onChange={(e) =>
                  patchOptions({ includeTopBottomRemates: e.target.checked })
                }
              />
              Remate cima + remate fundo
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={productOptions.asPuxador ?? false}
                onChange={(e) => patchOptions({ asPuxador: e.target.checked })}
              />
              Modo puxador
            </label>
          </>
        ) : null}

        {productType === "L" ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            Lado do L
            <select
              className="select input-sm"
              value={productOptions.lSide ?? "DIR"}
              onChange={(e) =>
                patchOptions({ lSide: e.target.value as "DIR" | "ESQ" })
              }
            >
              <option value="DIR">Lateral direita</option>
              <option value="ESQ">Lateral esquerda</option>
            </select>
          </label>
        ) : null}

        {remate.placementMode === "FREE" ? (
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>Posição livre</p>
        ) : null}

        {/* Dimensões — largura e altura editáveis; profundidade calculada pelas regras */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Comprimento (mm)
          <input
            className="input input-sm"
            type="number"
            min={1}
            value={remate.width}
            onChange={(e) =>
              actions.updateRemate(remate.id, { width: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Largura (mm)
          <input
            className="input input-sm"
            type="number"
            min={1}
            value={remate.height}
            onChange={(e) =>
              actions.updateRemate(remate.id, { height: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
        {/* Profundidade */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Profundidade (mm)
          <input
            className="input input-sm"
            type="number"
            min={1}
            value={remate.depth}
            onChange={(e) =>
              actions.updateRemate(remate.id, { depth: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </label>
        {/* Espessura da chapa — determinada pela chapa/material */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>Espessura da chapa</span>
          <div
            style={{
              padding: "4px 8px",
              background: "var(--bg-input-disabled, #252836)",
              borderRadius: 4,
              fontSize: 12,
              color: "var(--text-muted)",
              border: "1px solid var(--border-muted, #333)",
            }}
          >
            {thicknessMm} mm — definida pelo material
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          Material
          <select
            className="select input-sm"
            value={remate.materialPresetId}
            onChange={(e) => actions.updateRemate(remate.id, { materialPresetId: e.target.value })}
          >
            {materials.map((m) => (
              <option key={m.canonicalId} value={m.canonicalId}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {/* Regras de dimensionamento — só para tipo COMPLETO */}
        {isCompleto && isMain ? (
          <RemateRulesSection
            rules={completoRules}
            feetHeightMm={feetHeightMm}
            onChange={patchCompletoRules}
          />
        ) : null}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={remate.followBox}
            onChange={(e) => actions.updateRemate(remate.id, { followBox: e.target.checked })}
            disabled={!remate.parentBoxId}
          />
          Seguir módulo (mantém offset à face)
        </label>

        {remate.parentBoxId ? (
          <button
            type="button"
            className="btn"
            onClick={() => actions.resnapRemateToFace(remate.id)}
          >
            Reencostar à face
          </button>
        ) : null}

        <button type="button" className="btn btn-danger" onClick={() => actions.removeRemate(remate.id)}>
          Remover remate
        </button>
      </div>
    </Panel>
  );
}
