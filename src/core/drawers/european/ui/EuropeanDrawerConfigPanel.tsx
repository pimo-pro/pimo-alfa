/**
 * ui/EuropeanDrawerConfigPanel — UI do Modelo B.
 * Visivel apenas quando o Modelo A esta desactivado.
 */

import { useMemo } from "react";
import {
  findHeightProfile,
  generateEuropeanDrawer,
  listEuropeanDrawerModels,
  type EuropeanDrawerBoxConfig,
  type EuropeanDrawerSystemId,
} from "../index";
import type { WorkspaceBox } from "../../../types";

export type EuropeanDrawerConfigPanelProps = {
  box: WorkspaceBox;
  onChange: (_config: EuropeanDrawerBoxConfig, _count: number) => void;
};

export function EuropeanDrawerConfigPanel({ box, onChange }: EuropeanDrawerConfigPanelProps) {
  const models = listEuropeanDrawerModels();

  const config: EuropeanDrawerBoxConfig = useMemo(
    () =>
      box.europeanDrawerConfig ?? {
        systemId: "blum-legrabox",
        heightMm: 90,
        heightCode: "M",
        depthMm: 500,
        softClose: true,
        pushOpen: false,
        count: Math.max(1, box.gavetas || 1),
      },
    [box.europeanDrawerConfig, box.gavetas]
  );

  const model = models.find((m) => m.id === config.systemId) ?? models[0]!;

  const preview = useMemo(
    () =>
      generateEuropeanDrawer(model.id, {
        id: box.id,
        nome: box.nome,
        dimensoes: box.dimensoes,
        espessura: box.espessura,
        gavetas: config.count ?? box.gavetas,
        material: box.material,
        europeanDrawerConfig: config,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dims/espessura suficientes
    [box.id, box.nome, box.dimensoes.largura, box.dimensoes.altura, box.dimensoes.profundidade, box.espessura, box.material, box.gavetas, model.id, config]
  );

  const patch = (partial: Partial<EuropeanDrawerBoxConfig>) => {
    const next: EuropeanDrawerBoxConfig = { ...config, ...partial, systemId: partial.systemId ?? config.systemId };
    if (partial.systemId) {
      const m = models.find((x) => x.id === partial.systemId)!;
      const h = m.heights.find((x) => x.heightMm === next.heightMm) ?? m.heights[0]!;
      next.heightMm = h.heightMm;
      next.heightCode = h.code || undefined;
      if (!m.depthsMm.includes(next.depthMm)) {
        next.depthMm = m.depthsMm.includes(500) ? 500 : m.depthsMm[Math.floor(m.depthsMm.length / 2)]!;
      }
    }
    if (partial.heightMm != null) {
      const targetModel = models.find((x) => x.id === next.systemId) ?? model;
      const h = findHeightProfile(targetModel, partial.heightMm);
      next.heightCode = h.code || undefined;
    }
    onChange(next, Math.max(1, Math.floor(next.count ?? 1)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <strong style={{ fontSize: 12 }}>Sistema Europeu (Modelo B)</strong>

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
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Profundidade</span>
        <select
          className="select select-xs"
          value={config.depthMm}
          onChange={(e) => patch({ depthMm: Number(e.target.value) })}
        >
          {model.depthsMm.map((d) => (
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
          <strong>Pre-visualizacao</strong>
        </div>
        <div>Largura interna corpo: {preview.geometry.internalWidthMm.toFixed(1)} mm</div>
        <div>
          Frente: {preview.geometry.front.widthMm.toFixed(1)} × {preview.geometry.front.heightMm.toFixed(1)} mm
        </div>
        <div>Runner: {preview.geometry.runnerDepthMm} mm</div>
        <div>Folga lateral: 2×{model.side.clearanceMm} mm</div>
      </div>

      {preview.errors.length > 0 ? (
        <div style={{ fontSize: 11, color: "#fca5a5" }}>
          {preview.errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      ) : null}

      {preview.warnings.length > 0 ? (
        <div style={{ fontSize: 11, color: "#fde68a" }}>
          {preview.warnings.slice(0, 4).map((w) => (
            <div key={w}>! {w}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default EuropeanDrawerConfigPanel;
