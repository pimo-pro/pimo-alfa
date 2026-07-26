/**
 * ui/EuropeanFrontConfigPanel — subpainel isolado (material + dims da frente).
 * Evita rerender do painel completo quando só a frente muda.
 */

import { memo, useCallback } from "react";
import type { EuropeanDrawerBoxConfig } from "../types";

export type EuropeanFrontConfigPanelProps = {
  frontMaterialId?: string;
  frontWidthMm?: number;
  frontHeightMm?: number;
  dualFront?: boolean;
  boxMaterial?: string;
  materialOptions: Array<{ id: string; label: string }>;
  previewFrontWidthMm: number;
  previewFrontHeightMm: number;
  onPatch: (_partial: Partial<EuropeanDrawerBoxConfig>) => void;
};

function EuropeanFrontConfigPanelInner({
  frontMaterialId,
  frontWidthMm,
  frontHeightMm,
  dualFront,
  boxMaterial,
  materialOptions,
  previewFrontWidthMm,
  previewFrontHeightMm,
  onPatch,
}: EuropeanFrontConfigPanelProps) {
  const onMaterial = useCallback(
    (value: string) => onPatch({ frontMaterialId: value || undefined }),
    [onPatch]
  );
  const onWidth = useCallback(
    (raw: string) => {
      onPatch({ frontWidthMm: raw === "" ? undefined : Math.max(1, Number(raw) || 0) });
    },
    [onPatch]
  );
  const onHeight = useCallback(
    (raw: string) => {
      onPatch({ frontHeightMm: raw === "" ? undefined : Math.max(1, Number(raw) || 0) });
    },
    [onPatch]
  );
  const onDual = useCallback(
    (checked: boolean) => onPatch({ dualFront: checked }),
    [onPatch]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Material da frente (independente)
        </span>
        {materialOptions.length > 0 ? (
          <select
            className="select select-xs"
            value={frontMaterialId ?? boxMaterial ?? ""}
            onChange={(e) => onMaterial(e.target.value)}
          >
            <option value="">Igual — caixa</option>
            {materialOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="input input-xs"
            type="text"
            placeholder={boxMaterial ?? "material id"}
            value={frontMaterialId ?? ""}
            onChange={(e) => onMaterial(e.target.value)}
          />
        )}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Largura frente (mm)</span>
          <input
            className="input input-xs"
            type="number"
            min={50}
            placeholder={String(Math.round(previewFrontWidthMm))}
            value={frontWidthMm ?? ""}
            onChange={(e) => onWidth(e.target.value)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Altura frente (mm)</span>
          <input
            className="input input-xs"
            type="number"
            min={50}
            placeholder={String(Math.round(previewFrontHeightMm))}
            value={frontHeightMm ?? ""}
            onChange={(e) => onHeight(e.target.value)}
          />
        </label>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <input type="checkbox" checked={dualFront === true} onChange={(e) => onDual(e.target.checked)} />
        Frente interna (gav_fre_int)
      </label>
    </div>
  );
}

export const EuropeanFrontConfigPanel = memo(EuropeanFrontConfigPanelInner);
