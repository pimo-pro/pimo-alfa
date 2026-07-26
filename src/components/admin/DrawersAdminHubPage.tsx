/**
 * DrawersAdminHubPage
 *
 * Admin ? Produtos ? Gavetas
 * Hub unificado do sistema de gavetas:
 * - Toggle para desativar o Sistema Atual (Modelo A) sem apagar cùdigo
 * - Inventùrio / referùncia do Modelo A
 * - Regras editùveis (DrawerRulesAdminPage)
 * - Mapa do sistema unificado (DrawerSystemUnifiedAdminPage)
 * - Prù-visualizaùùo da estrutura do Modelo B (Sistema Europeu)
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

type HubSection = "visao" | "regras" | "mapa" | "modelo-b";

const MODELO_A_INVENTORY = [
  { area: "Domùnio", path: "src/core/drawers/**", note: "Parametria, geraùùo, motion, drilling, catùlogo" },
  { area: "UI projeto", path: "HomeLeftPanelSelected / BoxLayersPanel / DrawerConfigPanel", note: "Stepper, layers, config por gaveta" },
  { area: "Layers", path: "src/services/boxLayersService.ts", note: "Regenera drawersLayer" },
  { area: "Cutlist", path: "drawerCutlistAdapter + cutlistFromBoxes", note: "Peùas gaveta_* + furos corrediùa" },
  { area: "PDF", path: "pdfUnified / pdfEtiquetas / pdfFerragensTotais*", note: "Secùùes e classificaùùo GAV_*" },
  { area: "Viewer", path: "useCalculadoraSync + DrawerController", note: "Meshes e open/close" },
  { area: "Admin legado", path: "Regras das Gavetas + Sistema Unificado", note: "Mantidos; tambùm embutidos abaixo" },
] as const;

const MODELO_B_STRUCTURE = [
  "src/core/drawers/european/README.md",
  "src/core/drawers/european/index.ts",
  "src/core/drawers/european/types.ts",
  "src/core/drawers/european/catalog.ts",
  "src/core/drawers/european/models/blum-legrabox/",
  "src/core/drawers/european/models/blum-tandembox-antaro/",
  "src/core/drawers/european/models/hettich-innotech-atira/",
  "src/core/drawers/european/models/grass-nova-pro-scala/",
  "src/core/drawers/european/geometry/",
  "src/core/drawers/european/drilling/",
  "src/core/drawers/european/measures/",
  "src/core/drawers/european/ui/",
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

  useEffect(() => subscribeDrawerModeloAFlags(setModeloAActive), []);

  const deactivated = !modeloAActive;

  return (
    <div style={{ ...adminPageShellStyle, maxWidth: 1200 }}>
      <AdminPageHeader
        title="Gavetas ù Sistema Unificado (Modelo A)"
        subtitle="Centro Admin de gavetas: inventùrio do sistema atual, toggle de desativaùùo e estrutura do Sistema Europeu (Modelo B)."
      />

      <Panel
        title="Desativar Sistema Atual de Gavetas (Modelo A)"
        description="Quando ativo, o Modelo A fica invisùvel e inativo (sem regras, furos, PDF, botùes nem geraùùo). O cùdigo e os dados do projeto sùo preservados."
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
              Estado atual:{" "}
              <strong style={{ color: deactivated ? "#f87171" : "#34d399" }}>
                {deactivated ? "DESATIVADO (inativo)" : "ATIVO"}
              </strong>
              . Default do projeto = ativo (zero regressùo). Nùo apaga o sistema.
            </span>
          </span>
        </label>
      </Panel>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            ["visao", "Visùo geral"],
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
          <Panel title="Resumo do mapeamento (Modelo A)" description="Estatùsticas de DrawerSystemReference.ts">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "Domùnios", value: stats.domains },
                { label: "Regras", value: stats.rules },
                { label: "Oficiais", value: stats.official },
                { label: "Legado", value: stats.legacy },
                { label: "Inconsistùncias", value: stats.inconsistencies },
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

          <Panel title="Inventùrio ù onde vive o Modelo A" description="Referùncia para manutenùùo; nada ù apagado ao desativar.">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ùrea</th>
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

          <Panel title="Pipelines" description="Oficial vs legado (referùncia)">
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
          title="Sistema Europeu de Gavetas ù Modelo B"
          description="Apenas estrutura base (pastas/stubs). Sem regras, furos ou medidas nesta fase."
        >
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.5 }}>
            Modelos previstos: Blum Legrabox, Blum TandemBox Antaro, Hettich InnoTech Atira, Grass Nova Pro Scala.
            A implementaùùo completa aguarda as especificaùùes da prùxima fase.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, fontFamily: "monospace", lineHeight: 1.7 }}>
            {MODELO_B_STRUCTURE.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
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
