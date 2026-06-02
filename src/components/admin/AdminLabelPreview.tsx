/**
 * AdminLabelPreview — pré-visualização fiel da etiqueta v5.
 * Usa `resolveLabelSystemConfig` + `ResolvedLabelRuntime` como única fonte de verdade,
 * idêntico ao pipeline do UEE em produção.
 */

import { useMemo } from "react";
import { resolveLabelSystemConfig } from "../../core/labelSystem/resolveLabelSystemConfig";
import type { LabelSystemV5 } from "../../core/labelSystem/LabelSystemV5";
import type { RulesConfig } from "../../core/rules/rulesConfig";
import type { SettingsSchema } from "../../core/settings/settingsSchema";

// ─── Amostra sintética de peça ────────────────────────────────────────────────

const SAMPLE_PIECE = {
  projeto: "Cozinha Principal",
  caixa: "Módulo Base 60",
  peca: "Lateral Direita",
  madeira: "MDF Branco 18mm",
  medidas: "720 × 560 × 18 mm",
  label: "P-005",
  paletteGroup: "D",
  observations: ["Verificar esquadria", "Sem orla no fundo"],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminLabelPreviewProps {
  rules: RulesConfig;
  settings?: SettingsSchema | null;
  labelSystemV5?: LabelSystemV5 | null;
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const cell = (label: string, bg = "rgba(255,255,255,0.07)") => (
  <div
    style={{
      background: bg,
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 3,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 9,
      color: "var(--text-muted)",
      minHeight: 24,
      padding: "2px 4px",
      textAlign: "center",
    }}
  >
    {label}
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminLabelPreview({ rules, settings, labelSystemV5 }: AdminLabelPreviewProps) {
  const runtime = useMemo(
    () => resolveLabelSystemConfig(rules, settings ?? null, labelSystemV5 ?? null),
    [rules, settings, labelSystemV5]
  );

  const { labelConfig, qrPolicy, observations, qrLogoDataUrl } = runtime;
  const dim = labelConfig.dimensions;

  // Escala para caber no painel (max 560px de largura)
  const SCALE = Math.min(3.78, 560 / dim.totalWidth_mm);
  const wPx = Math.round(dim.totalWidth_mm * SCALE);
  const hPx = Math.round(dim.totalHeight_mm * SCALE);
  const qrPx = Math.round(dim.qrSize_mm * SCALE);
  const qrColPx = Math.round(dim.qrColumnWidth_mm * SCALE);
  const bottomPx = Math.round(dim.bottomStrip_mm * SCALE);
  const matPx = Math.round(dim.materialHeight_mm * SCALE);
  const medPx = Math.round(dim.medidasHeight_mm * SCALE);
  const prodPx = Math.round(dim.productionHeight_mm * SCALE);
  const obsPx = Math.round(dim.observationHeight_mm * SCALE);

  const activeObs = observations.length > 0
    ? observations.slice(0, 3)
    : SAMPLE_PIECE.observations.slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Metadados da resolução */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 11,
          color: "var(--text-muted)",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span>Schema v{runtime.schemaVersion}</span>
        <span>·</span>
        <span>
          Dimensões: <strong style={{ color: "var(--text-main)" }}>{dim.totalWidth_mm}×{dim.totalHeight_mm} mm</strong>
        </span>
        <span>·</span>
        <span>
          QR: <strong style={{ color: "var(--text-main)" }}>{dim.qrSize_mm} mm</strong>
        </span>
        <span>·</span>
        <span>
          Policy: <strong style={{ color: "var(--text-main)" }}>{qrPolicy}</strong>
        </span>
        <span>·</span>
        <span>
          Logo QR: <strong style={{ color: "var(--text-main)" }}>{qrLogoDataUrl ? "✓" : "—"}</strong>
        </span>
        <span>·</span>
        <span>
          Etapas: <strong style={{ color: "var(--text-main)" }}>{labelConfig.productionSteps.length}</strong>
        </span>
        <span>·</span>
        <span>
          Grupos palete: <strong style={{ color: "var(--text-main)" }}>{labelConfig.paletteGroups.map((g) => g.code).join(", ")}</strong>
        </span>
      </div>

      {/* Etiqueta visual */}
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <div
          style={{
            width: wPx,
            height: hPx,
            background: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 4,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          {/* Área principal: QR coluna + conteúdo */}
          <div style={{ display: "flex", flex: 1 }}>
            {/* Coluna QR */}
            <div
              style={{
                width: qrColPx,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                borderRight: "1px solid #ddd",
                background: "#fafafa",
                padding: 2,
              }}
            >
              <div
                style={{
                  width: qrPx,
                  height: qrPx,
                  background: "#222",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 7,
                  color: "#fff",
                  position: "relative",
                }}
              >
                QR
                {qrLogoDataUrl && (
                  <img
                    src={qrLogoDataUrl}
                    alt="logo"
                    style={{
                      position: "absolute",
                      width: "28%",
                      height: "28%",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
              <div style={{ fontSize: 7, color: "#666", marginTop: 1 }}>
                {SAMPLE_PIECE.label}
              </div>
              {qrPolicy === "dual" && (
                <div style={{ fontSize: 6, color: "#999" }}>+short</div>
              )}
            </div>

            {/* Conteúdo principal */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Secção material */}
              <div
                style={{
                  height: matPx,
                  borderBottom: "1px solid #eee",
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 8,
                  color: "#222",
                  fontWeight: 600,
                  overflow: "hidden",
                }}
              >
                {SAMPLE_PIECE.madeira}
              </div>

              {/* Secção medidas */}
              <div
                style={{
                  height: medPx,
                  borderBottom: "1px solid #eee",
                  padding: "1px 4px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 7,
                  color: "#444",
                  overflow: "hidden",
                }}
              >
                {SAMPLE_PIECE.medidas}
              </div>

              {/* Grelha produção */}
              <div
                style={{
                  height: prodPx,
                  borderBottom: "1px solid #eee",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridTemplateRows: "repeat(3, 1fr)",
                  gap: 1,
                  padding: 2,
                  overflow: "hidden",
                }}
              >
                {labelConfig.productionSteps.slice(0, 9).map((step) =>
                  cell(step.id)
                )}
                {labelConfig.productionSteps.length < 9 &&
                  Array.from({ length: 9 - Math.min(labelConfig.productionSteps.length, 9) }).map((_) =>
                    cell("", "transparent")
                  )}
              </div>

              {/* Observações */}
              <div
                style={{
                  height: obsPx,
                  padding: "1px 4px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  overflow: "hidden",
                }}
              >
                {activeObs.slice(0, 3).map((obs, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 6.5,
                      color: "#555",
                      background: "#f5f5f5",
                      borderRadius: 2,
                      padding: "1px 3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {obs}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Faixa inferior */}
          <div
            style={{
              height: bottomPx,
              background: "#1a1a2e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 8px",
              fontSize: 8,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <span>{SAMPLE_PIECE.label} · {SAMPLE_PIECE.peca}</span>
            <span
              style={{
                background: "#fff",
                color: "#1a1a2e",
                borderRadius: 2,
                padding: "1px 6px",
                fontWeight: 700,
                fontSize: 8,
              }}
            >
              {SAMPLE_PIECE.paletteGroup}
            </span>
          </div>
        </div>
      </div>

      {/* Nota */}
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
        Pré-visualização com dados sintéticos. Reflecte exactamente a configuração resolvida por{" "}
        <code>resolveLabelSystemConfig</code>, idêntica ao pipeline do UEE.
      </p>
    </div>
  );
}
