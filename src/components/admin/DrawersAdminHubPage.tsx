/**
 * DrawersAdminHubPage
 *
 * Admin ? Produtos ? Gavetas
 * Hub unificado: toggle Modelo A, inventario, regras, mapa e catalogo Modelo B.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Panel from "../ui/Panel";
import { AdminPageHeader, adminPageShellStyle } from "./AdminUi";
import DrawerRulesAdminPage from "./DrawerRulesAdminPage";
import DrawerSystemUnifiedAdminPage from "./DrawerSystemUnifiedAdminPage";
import {
  isDrawerModeloAActive,
  setDrawerModeloADeactivated,
  subscribeDrawerModeloAFlags,
} from "../../core/drawers/drawerSystemFlags";
import {
  DRAWER_LEGACY_PIPELINE,
  DRAWER_OFFICIAL_PIPELINE,
  countDrawerReferenceStats,
} from "../../core/drawers/DrawerSystemReference";
import { listEuropeanDrawerModels } from "../../core/drawers/european";

type HubSection = "visao" | "regras" | "mapa" | "modelo-b";

const MODELO_A_INVENTORY = [
  { area: "Dominio", path: "src/core/drawers/**", note: "Parametria, geracao, motion, drilling, catalogo" },
  { area: "UI projeto", path: "HomeLeftPanelSelected / BoxLayersPanel / DrawerConfigPanel", note: "Stepper, layers, config por gaveta" },
  { area: "Layers", path: "src/services/boxLayersService.ts", note: "Regenera drawersLayer" },
  { area: "Cutlist", path: "drawerCutlistAdapter + cutlistFromBoxes", note: "Pecas gaveta_* + furos corredica" },
  { area: "PDF", path: "pdfUnified / pdfEtiquetas / pdfFerragensTotais*", note: "Secoes e classificacao GAV_*" },
  { area: "Viewer", path: "useCalculadoraSync + DrawerController", note: "Meshes e open/close" },
  { area: "Admin legado", path: "Regras das Gavetas + Sistema Unificado", note: "Mantidos; tambem embutidos abaixo" },
] as const;

const tabBtn = (active: boolean): CSSProperties => ({
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  padding: "8px 12px",
  borderRadius: 8,
  border: active ? "1px solid rgba(96,165,250,0.55)" : "1px solid rgba(255,255,255,0.1)",
  background: active ? "rgba(96,165,250,0.15)" : "transparent",
  color: active ? "#93c5fd" : "var(--text-muted)",
  cursor: "pointer",
});

export default function DrawersAdminHubPage() {
  const [section, setSection] = useState<HubSection>("visao");
  const [modeloAActive, setModeloAActive] = useState(() => isDrawerModeloAActive());
  const stats = useMemo(() => countDrawerReferenceStats(), []);
  const europeanModels = useMemo(() => listEuropeanDrawerModels(), []);

  useEffect(() => subscribeDrawerModeloAFlags(setModeloAActive), []);

  const deactivated = !modeloAActive;

  return (
    <div style={{ ...adminPageShellStyle, maxWidth: 1200 }}>
      <AdminPageHeader
        title="Gavetas — Sistema Unificado"
        subtitle="Centro Admin: Modelo A (toggle), inventario, regras e catalogo europeu Modelo B."
      />

      <Panel
        title="Desativar Sistema Atual de Gavetas (Modelo A)"
        description="Quando activo, o Modelo A fica inactivo e o Modelo B (Sistema Europeu) assume UI/cutlist/PDF/viewer."
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            border: deactivated
              ? "1px solid rgba(248,113,113,0.45)"
              : "1px solid rgba(52,211,153,0.35)",
            background: deactivated ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.08)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={deactivated}
            onChange={(event) => setDrawerModeloADeactivated(event.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 13 }}>
              Desativar Sistema Atual de Gavetas (Modelo A)
            </strong>
            <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Estado:{" "}
              <strong style={{ color: deactivated ? "#f87171" : "#34d399" }}>
                {deactivated ? "Modelo A OFF ? Modelo B activo" : "Modelo A ATIVO"}
              </strong>
            </span>
          </span>
        </label>
      </Panel>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["visao", "Visao geral"],
            ["regras", "Regras (Modelo A)"],
            ["mapa", "Mapa unificado"],
            ["modelo-b", "Modelo B (Europeu)"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" style={tabBtn(section === id)} onClick={() => setSection(id)}>
            {label}
          </button>
        ))}
      </div>

      {section === "visao" ? (
        <>
          <Panel title="Resumo do mapeamento (Modelo A)" description="Estatisticas de DrawerSystemReference.ts">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "Dominios", value: stats.domains },
                { label: "Regras", value: stats.rules },
                { label: "Oficiais", value: stats.official },
                { label: "Legado", value: stats.legacy },
                { label: "Inconsistencias", value: stats.inconsistencies },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Inventario — Modelo A" description="Referencia; nada e apagado ao desativar.">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Area</th>
                    <th style={thStyle}>Local</th>
                    <th style={thStyle}>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {MODELO_A_INVENTORY.map((row) => (
                    <tr key={row.area}>
                      <td style={tdStyle}>
                        <strong>{row.area}</strong>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{row.path}</td>
                      <td style={tdStyle}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Pipelines" description="Oficial vs legado (referencia)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, flex: "1 1 280px" }}>
                <div style={{ fontWeight: 700, color: "#34d399", marginBottom: 6 }}>Pipeline oficial</div>
                {DRAWER_OFFICIAL_PIPELINE.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, flex: "1 1 280px" }}>
                <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Pipeline legado</div>
                {DRAWER_LEGACY_PIPELINE.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </Panel>
        </>
      ) : null}

      {section === "regras" ? <DrawerRulesAdminPage /> : null}
      {section === "mapa" ? <DrawerSystemUnifiedAdminPage /> : null}

      {section === "modelo-b" ? (
        <Panel
          title="Sistema Europeu de Gavetas — Modelo B"
          description="Catalogo oficial implementado. Activo no projeto quando o Modelo A esta desactivado."
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.5 }}>
            API: <code>generateEuropeanDrawer(systemId, box)</code> — measures, geometry, drilling, cutlist, PDF e viewer.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sistema</th>
                  <th style={thStyle}>Alturas</th>
                  <th style={thStyle}>Profundidades</th>
                  <th style={thStyle}>Folga</th>
                  <th style={thStyle}>Furos</th>
                </tr>
              </thead>
              <tbody>
                {europeanModels.map((m) => (
                  <tr key={m.id}>
                    <td style={tdStyle}>
                      <strong>{m.displayName}</strong>
                    </td>
                    <td style={tdStyle}>{m.heights.map((h) => h.label).join(", ")}</td>
                    <td style={tdStyle}>
                      {m.depthProfile.minMm}–{m.depthProfile.maxMm} mm
                    </td>
                    <td style={tdStyle}>2×{m.side.clearanceMm} mm</td>
                    <td style={tdStyle}>
                      {m.holePattern.setbackFrontMm} / {m.holePattern.bottomGapMm} / {m.holePattern.systemPitchMm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  color: "var(--text-muted)",
  fontWeight: 600,
  fontSize: 11,
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  verticalAlign: "top",
};
