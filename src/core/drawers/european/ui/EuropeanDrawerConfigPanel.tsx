/**
 * ui/EuropeanDrawerConfigPanel — UI do Modelo B.
 * Visível apenas quando o Modelo A está desactivado.
 * Otimizado: useMemo/useCallback + painel da frente isolado.
 */

import { useCallback, useMemo } from "react";
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
import { EuropeanFrontConfigPanel } from "./EuropeanFrontConfigPanel";

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
  const models = useMemo(() => listEuropeanDrawerModels(), []);

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

  // Fingerprint dimensional separado do material da frente (preview estrutural)
  const dimFingerprint = useMemo(
    () =>
      JSON.stringify({
        id: box.id,
        nome: box.nome,
        L: box.dimensoes.largura,
        A: box.dimensoes.altura,
        P: box.dimensoes.profundidade,
        esp: box.espessura,
        gav: config.count ?? box.gavetas,
        bodyMat: box.material,
        systemId: model.id,
        heightMm: config.heightMm,
        depthMm: config.depthMm,
        softClose: config.softClose,
        pushOpen: config.pushOpen,
        dualFront: config.dualFront,
        frontW: config.frontWidthMm,
        frontH: config.frontHeightMm,
      }),
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
      config.count,
      config.heightMm,
      config.depthMm,
      config.softClose,
      config.pushOpen,
      config.dualFront,
      config.frontWidthMm,
      config.frontHeightMm,
    ]
  );

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
          europeanDrawerConfig: { ...config, frontMaterialId: config.frontMaterialId },
        },
        undefined,
        { applyAutoFixes: false }
      ),
    // dimFingerprint cobre dims; material frente só afecta cutlist labels no preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dimFingerprint, config.frontMaterialId]
  );

  const patch = useCallback(
    (partial: Partial<EuropeanDrawerBoxConfig>) => {
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
    },
    [config, model, models, onChange]
  );

  const applyAutoFixes = useCallback(() => {
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
  }, [box, config, onChange]);

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
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Corrediça Hettich (mm)</span>
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

      <EuropeanFrontConfigPanel
        frontMaterialId={config.frontMaterialId}
        frontWidthMm={config.frontWidthMm}
        frontHeightMm={config.frontHeightMm}
        dualFront={config.dualFront}
        boxMaterial={box.material}
        materialOptions={materialOptions}
        previewFrontWidthMm={preview.geometry.front.widthMm}
        previewFrontHeightMm={preview.geometry.front.heightMm}
        onPatch={patch}
      />

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
