import type { ChangeEvent } from "react";
import type { DrawerLayerItem, DrawerLayerMetadata } from "../../models/BoxLayers";
import type { WorkspaceBox } from "../../core/types";
import { getSettings } from "../../core/settings/settingsService";
import { listOfficialMaterials } from "../../core/materials/materials.api";
import {
  DRAWER_HANDLE_POSITIONS,
  DRAWER_HANDLE_TYPES,
  DRAWER_METAL_BOX_TYPES,
  DRAWER_SLIDE_TYPES,
} from "../../core/drawers/drawerUiConstants";
import { validateDrawerLayerItem } from "../../core/drawers/drawerUiValidation";
import { resolveDrawerBodyHeightMm } from "../../core/drawers/drawerLayerCustomization";
import type {
  DrawerHandlePosition,
  DrawerHandleType,
  DrawerMetalBoxType,
  DrawerSlideType,
} from "../../core/settings/settingsSchema";

export type DrawerConfigPanelProps = {
  drawer: DrawerLayerItem;
  index: number;
  box: WorkspaceBox;
  showHardware?: boolean;
  onUpdate: (partial: Partial<DrawerLayerItem>) => void;
};

function mergeDrawerMetadata(
  current: DrawerLayerMetadata | undefined,
  patch: DrawerLayerMetadata
): DrawerLayerMetadata {
  return { ...current, ...patch };
}

function buildDrawerConfigPatch(
  drawer: DrawerLayerItem,
  patch: Partial<DrawerLayerItem> & { metadata?: DrawerLayerMetadata }
): Partial<DrawerLayerItem> {
  const metadata = mergeDrawerMetadata(drawer.metadata, {
    ...drawer.metadata,
    ...patch.metadata,
    slideType: (patch.slideType ?? drawer.slideType) as DrawerSlideType | undefined,
    metalBoxType: (patch.metalBoxType ?? drawer.metalBoxType) as DrawerMetalBoxType | undefined,
    softClose: patch.softClose ?? drawer.softClose,
    handleType: (patch.handleType ?? drawer.handleType) as DrawerHandleType | undefined,
    handlePosition: (patch.handlePosition ?? drawer.handlePosition) as DrawerHandlePosition | undefined,
    handleOffsetMm: patch.handleOffsetMm ?? drawer.handleOffsetMm,
    drawerType: (patch.type ?? patch.drawerType ?? drawer.type ?? drawer.drawerType) as
      | "normal"
      | "pro"
      | undefined,
    nominalDepth: patch.metadata?.nominalDepth ?? drawer.metadata?.nominalDepth,
    frontMaterial: patch.material ?? patch.metadata?.frontMaterial ?? drawer.material,
    frontHeightMm: patch.metadata?.frontHeightMm ?? drawer.metadata?.frontHeightMm,
    frontPieceName: patch.metadata?.frontPieceName ?? drawer.metadata?.frontPieceName,
    drawerGroupName: patch.metadata?.drawerGroupName ?? drawer.metadata?.drawerGroupName,
  });

  const bodyHeight = resolveDrawerBodyHeightMm(drawer);
  const nextFrontHeightMm = patch.metadata?.frontHeightMm ?? drawer.metadata?.frontHeightMm;
  const resolvedFrontHeight =
    nextFrontHeightMm != null && Number.isFinite(nextFrontHeightMm) && nextFrontHeightMm > 0
      ? nextFrontHeightMm
      : bodyHeight;

  return {
    ...patch,
    metadata,
    material: patch.material ?? drawer.material,
    materialId: patch.materialId ?? patch.material ?? drawer.materialId,
    height: resolvedFrontHeight,
    bodyHeight: patch.bodyHeight ?? drawer.bodyHeight ?? bodyHeight,
  };
}

export function getDrawerStatusBadges(drawer: DrawerLayerItem): string[] {
  const badges: string[] = [];
  const type = drawer.type ?? drawer.drawerType ?? "normal";
  if (type === "pro") badges.push("PRO");
  else badges.push("Normal");
  if (drawer.metalBoxType && drawer.metalBoxType !== "Nenhuma") {
    badges.push("Metálica");
  }
  if (drawer.softClose) badges.push("Soft-close");
  return badges;
}

const alertStyle = (level: "warning" | "error") => ({
  fontSize: 11,
  padding: "6px 8px",
  borderRadius: 6,
  marginTop: 6,
  background: level === "error" ? "rgba(239,68,68,0.12)" : "rgba(234,179,8,0.12)",
  color: level === "error" ? "#fca5a5" : "#fde68a",
  border: `1px solid ${level === "error" ? "rgba(239,68,68,0.35)" : "rgba(234,179,8,0.35)"}`,
});

export default function DrawerConfigPanel({
  drawer,
  index,
  box,
  showHardware = true,
  onUpdate,
}: DrawerConfigPanelProps) {
  const settings = getSettings().gavetas;
  const woodMaterials = listOfficialMaterials().filter((m) => m.industrial && m.visual);
  const alerts = validateDrawerLayerItem(drawer, box, settings);

  const drawerType = drawer.type ?? drawer.drawerType ?? "normal";
  const slideType = drawer.slideType ?? settings.gavetaTipoCorredica;
  const metalBoxType = drawer.metalBoxType ?? settings.gavetaTipoCaixaMetalica;
  const handleType = drawer.handleType ?? settings.gavetaTipoHandle;
  const handlePosition = drawer.handlePosition ?? settings.gavetaPosicaoHandle;
  const nominalDepth = drawer.metadata?.nominalDepth ?? drawer.depth;
  const material = drawer.material ?? drawer.materialId ?? "";
  const bodyHeight = Math.round(resolveDrawerBodyHeightMm(drawer));
  const frontHeightOverride = drawer.metadata?.frontHeightMm;
  const frontPieceName = drawer.metadata?.frontPieceName ?? "";
  const drawerGroupName = drawer.metadata?.drawerGroupName ?? "";

  const update = (patch: Partial<DrawerLayerItem> & { metadata?: DrawerLayerMetadata }) => {
    onUpdate(buildDrawerConfigPatch(drawer, patch));
  };

  const parseOptionalPositiveMm = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      {alerts.map((alert, i) => (
        <div key={`${alert.level}-${i}`} style={alertStyle(alert.level)}>
          {alert.message}
        </div>
      ))}

      {showHardware && (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Tipo de gaveta</span>
            <select
              className="select select-xs"
              value={drawerType}
              onChange={(e) =>
                update({
                  type: e.target.value as "normal" | "pro",
                  drawerType: e.target.value as "normal" | "pro",
                })
              }
            >
              <option value="normal">Normal</option>
              <option value="pro">PRO (caixa metálica)</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Corrediça</span>
            <select
              className="select select-xs"
              value={slideType}
              onChange={(e) => update({ slideType: e.target.value as DrawerSlideType })}
            >
              {DRAWER_SLIDE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Caixa metálica</span>
            <select
              className="select select-xs"
              value={metalBoxType}
              onChange={(e) => update({ metalBoxType: e.target.value as DrawerMetalBoxType })}
            >
              {DRAWER_METAL_BOX_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {metalBoxType !== "Nenhuma" && (
            <div style={alertStyle("warning")}>
              Peças internas da gaveta serão omitidas (caixa metálica).
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={Boolean(drawer.softClose)}
              onChange={(e) => update({ softClose: e.target.checked })}
            />
            Soft-close
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Puxador / handle</span>
            <select
              className="select select-xs"
              value={handleType}
              onChange={(e) => update({ handleType: e.target.value as DrawerHandleType })}
            >
              {DRAWER_HANDLE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {handleType !== "Nenhum" && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Posição do puxador</span>
                <select
                  className="select select-xs"
                  value={handlePosition}
                  onChange={(e) =>
                    update({ handlePosition: e.target.value as DrawerHandlePosition })
                  }
                >
                  {DRAWER_HANDLE_POSITIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Offset puxador (mm)</span>
                <input
                  className="input input-xs"
                  type="number"
                  value={drawer.handleOffsetMm ?? settings.gavetaOffsetHandleMm}
                  onChange={(e) => update({ handleOffsetMm: Number(e.target.value) || 0 })}
                />
              </label>
            </>
          )}
        </>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Profundidade nominal (Gaveta {index + 1})
        </span>
        <select
          className="select select-xs"
          value={nominalDepth}
          onChange={(e) =>
            update({
              metadata: { nominalDepth: Number(e.target.value) },
            })
          }
        >
          {settings.gavetaProfundidadesDisponiveisMm.map((depth) => (
            <option key={depth} value={depth}>
              {depth} mm
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Nome da Gaveta</span>
        <input
          className="input input-xs"
          type="text"
          placeholder={`Gaveta ${index + 1}`}
          value={drawerGroupName}
          onChange={(e) =>
            update({
              metadata: {
                drawerGroupName: e.target.value.trim() || undefined,
              },
            })
          }
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Nome da Frente da Gaveta</span>
        <input
          className="input input-xs"
          type="text"
          placeholder="Automático (industrial)"
          value={frontPieceName}
          onChange={(e) =>
            update({
              metadata: {
                frontPieceName: e.target.value.trim() || undefined,
              },
            })
          }
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Altura da Frente (mm)
        </span>
        <input
          className="input input-xs"
          type="number"
          min={settings.gavetaAlturaMinimaMm}
          max={settings.gavetaAlturaMaximaMm}
          placeholder={`Padrão: ${bodyHeight}`}
          value={frontHeightOverride != null && frontHeightOverride > 0 ? frontHeightOverride : ""}
          onChange={(e) =>
            update({
              metadata: {
                frontHeightMm: parseOptionalPositiveMm(e.target.value),
              },
            })
          }
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Material da frente</span>
        <select
          className="select select-xs"
          value={material}
          onChange={(e) =>
            update({
              material: e.target.value,
              materialId: e.target.value,
              metadata: { frontMaterial: e.target.value },
            })
          }
        >
          {woodMaterials.map((m) => (
            <option key={m.canonicalId} value={m.canonicalId}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="muted-text" style={{ fontSize: 10 }}>
        Corpo: {bodyHeight} mm · Frente: {Math.round(drawer.height)} mm · Profundidade:{" "}
        {Math.round(drawer.depth)} mm
      </div>
    </div>
  );
}

export function DrawerCustomHeightsTable({
  box,
  onHeightChange,
}: {
  box: WorkspaceBox;
  onHeightChange: (drawerId: string, height: number) => void;
}) {
  const settings = getSettings().gavetas;
  const drawers = box.drawersLayer ?? [];
  const internalHeight = Math.max(1, box.dimensoes.altura - 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        Altura interna do módulo: {internalHeight} mm (mín. {settings.gavetaAlturaMinimaMm} / máx.{" "}
        {settings.gavetaAlturaMaximaMm} mm por gaveta)
      </div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 4 }}>Gaveta</th>
            <th style={{ textAlign: "left", padding: 4 }}>Altura (mm)</th>
          </tr>
        </thead>
        <tbody>
          {drawers.map((drawer, index) => (
            <tr key={drawer.id}>
              <td style={{ padding: 4 }}>{index + 1}</td>
              <td style={{ padding: 4 }}>
                <input
                  className="input input-xs"
                  type="number"
                  min={settings.gavetaAlturaMinimaMm}
                  max={settings.gavetaAlturaMaximaMm}
                  value={Math.round(drawer.bodyHeight ?? drawer.height)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onHeightChange(drawer.id, Number(e.target.value) || settings.gavetaAlturaMinimaMm)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
