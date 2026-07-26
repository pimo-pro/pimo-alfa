/**
 * ui/EuropeanDrawerConfigPanel — UI do Modelo B.
 * Visível apenas quando o Modelo A está desactivado.
 */

import { useMemo } from "react";
import {
  EUROPEAN_SIDE_CLEARANCE_EACH_MM,
  HETTICH_RUNNER_LENGTHS_MM,
  findHeightProfile,
  generateEuropeanDrawer,
  listEuropeanDrawerModels,
  suggestEuropeanAutoFixedConfig,
  type EuropeanDrawerBoxConfig,
  type EuropeanDrawerSystemId,
} from "../index";
import type { WorkspaceBox } from "../../../types";

export type EuropeanDrawerConfigPanelProps = {
  box: WorkspaceBox;
  onChange: (_config: EuropeanDrawerBoxConfig, _count: number) => void;
  /** Materiais oficiais para a frente independente. */
  materialOptions?: Array<{ id: string; label: string }>;
};

export function EuropeanDrawerConfigPanel({
  box,
  onChange,
  materialOptions = [],
}: EuropeanDrawerConfigPanelProps) {
  const models = listEuropeanDrawerModels();

  const config: EuropeanDrawerBoxConfig = useMemo(
    () =>
      box.europeanDrawerConfig ?? {
        systemId: "hettich-innotech-atira",
        heightMm: 144,
        depthMm: 450,
        softClose: true,
        pushOpen: false,
        count: Math.max(1, box.gavetas || 1),
        dualFront: false,
      },
    [box.europeanDrawerConfig, box.gavetas]
  );

  const model = models.find((m) => m.id === config.systemId) ?? models[0]!;

  const preview = useMemo(
    () =>
      generateEuropeanDrawer(
        model.id,
        {
          id: box.id,
          nome: box.nome,
          dimensoes: box.dimensoes,
          espessura: box.espessura,
          gavetas: config.count ?? box.gavetas,
          material: box.material,
          europeanDrawerConfig: config,
        },
        undefined,
        { applyAutoFixes: false }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dims/espessura suficientes
    [
      box.id,
      box.nome,
      box.dimensoes.largura,
      box.dimensoes.altura,
      box.dimensoes.profundidade,
      box.espessura,
      box.material,
      box.gavetas,
      model.id,
      config,
    ]
  );

  const patch = (partial: Partial<EuropeanDrawerBoxConfig>) => {
    const next: EuropeanDrawerBoxConfig = {
      ...config,
      ...partial,
      systemId: partial.systemId ?? config.systemId,
    };
    if (partial.systemId) {
      const m = models.find((x) => x.id === partial.systemId)!;
      const h = m.heights.find((x) => x.heightMm === next.heightMm) ?? m.heights[0]!;
      next.heightMm = h.heightMm;
      next.heightCode = h.code || undefined;
      if (!(HETTICH_RUNNER_LENGTHS_MM as readonly number[]).includes(next.depthMm)) {
        next.depthMm = 450;
      }
    }
    if (partial.heightMm != null) {
      const targetModel = models.find((x) => x.id === next.systemId) ?? model;
      const h = findHeightProfile(targetModel, partial.heightMm);
      next.heightCode = h.code || undefined;
    }
    onChange(next, Math.max(1, Math.floor(next.count ?? 1)));
  };

  const applyAutoFixes = () => {
    const fixed = suggestEuropeanAutoFixedConfig(
      {
        id: box.id,
        nome: box.nome,
        dimensoes: box.dimensoes,
        espessura: box.espessura,
        gavetas: config.count ?? box.gavetas,
        material: box.material,
        europeanDrawerConfig: config,
      },
      config
    );
    onChange(fixed, Math.max(1, Math.floor(fixed.count ?? 1)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong style={{ fontSize: 12 }}>Sistema Europeu (Modelo B)</strong>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "6px 8px",
          borderRadius: 6,
          border: preview.valid
            ? "1px solid rgba(52,211,153,0.45)"
            : "1px solid rgba(248,113,113,0.45)",
          background: preview.valid ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          color: preview.valid ? "#34d399" : "#f87171",
        }}
      >
        {preview.valid ? "Gaveta válida" : "Gaveta inválida"}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Marca / Sistema</span>
        <select
          className="select select-xs"
          value={config.systemId}
          onChange={(e) => patch({ systemId: e.target.value as EuropeanDrawerSystemId })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Altura</span>
        <select
          className="select select-xs"
          value={config.heightMm}
          onChange={(e) => patch({ heightMm: Number(e.target.value) })}
        >
          {model.heights.map((h) => (
            <option key={`${h.code}-${h.heightMm}`} value={h.heightMm}>
              {h.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Corrediça Hettich (mm)
        </span>
        <select
          className="select select-xs"
          value={config.depthMm}
          onChange={(e) => patch({ depthMm: Number(e.target.value) })}
        >
          {HETTICH_RUNNER_LENGTHS_MM.map((d) => (
            <option key={d} value={d}>
              {d} mm
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Quantidade</span>
        <input
          className="input input-xs"
          type="number"
          min={1}
          max={8}
          value={config.count ?? 1}
          onChange={(e) => patch({ count: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Material da frente (independente)
        </span>
        {materialOptions.length > 0 ? (
          <select
            className="select select-xs"
            value={config.frontMaterialId ?? box.material ?? ""}
            onChange={(e) => patch({ frontMaterialId: e.target.value || undefined })}
          >
            <option value="">Igual à caixa</option>
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
            placeholder={box.material ?? "material id"}
            value={config.frontMaterialId ?? ""}
            onChange={(e) => patch({ frontMaterialId: e.target.value || undefined })}
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
            placeholder={String(Math.round(preview.geometry.front.widthMm))}
            value={config.frontWidthMm ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              patch({ frontWidthMm: v === "" ? undefined : Math.max(1, Number(v) || 0) });
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Altura frente (mm)</span>
          <input
            className="input input-xs"
            type="number"
            min={50}
            placeholder={String(Math.round(preview.geometry.front.heightMm))}
            value={config.frontHeightMm ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              patch({ frontHeightMm: v === "" ? undefined : Math.max(1, Number(v) || 0) });
            }}
          />
        </label>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={config.dualFront === true}
          onChange={(e) => patch({ dualFront: e.target.checked })}
        />
        Frente interna (gav_fre_int)
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={config.softClose}
          onChange={(e) => patch({ softClose: e.target.checked })}
        />
        Soft-Close
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={config.pushOpen}
          onChange={(e) => patch({ pushOpen: e.target.checked })}
        />
        Push-Open
      </label>

      <div
        style={{
          fontSize: 11,
          padding: 8,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-muted)",
          lineHeight: 1.5,
        }}
      >
        <div>
          <strong>Pré-visualização</strong>
        </div>
        <div>Largura externa: {preview.geometry.externalWidthMm.toFixed(1)} mm</div>
        <div>Corpo (sem frente): {preview.geometry.bodyDepthMm} mm</div>
        <div>
          Frente: {preview.geometry.front.widthMm.toFixed(1)} ×{" "}
          {preview.geometry.front.heightMm.toFixed(1)} mm
        </div>
        <div>Corrediça Hettich: {preview.geometry.runnerDepthMm} mm</div>
        <div>
          Folga lateral: {EUROPEAN_SIDE_CLEARANCE_EACH_MM}+{EUROPEAN_SIDE_CLEARANCE_EACH_MM} mm
        </div>
      </div>

      {preview.errors.length > 0 ? (
        <div style={{ fontSize: 11, color: "#fca5a5", lineHeight: 1.45 }}>
          <strong>Erros</strong>
          {preview.errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      ) : null}

      {preview.warnings.length > 0 ? (
        <div style={{ fontSize: 11, color: "#fde68a", lineHeight: 1.45 }}>
          <strong>Avisos</strong>
          {preview.warnings.slice(0, 6).map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      ) : null}

      {!preview.valid && preview.autoFixes.length > 0 ? (
        <button type="button" className="button button-ghost" onClick={applyAutoFixes}>
          Aplicar correções automáticas ({preview.autoFixes.length})
        </button>
      ) : null}
    </div>
  );
}

export default EuropeanDrawerConfigPanel;
