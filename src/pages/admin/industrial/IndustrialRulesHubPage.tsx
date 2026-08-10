import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, AdminStickyActionBar, adminPageShellStyle } from "../../../components/admin/AdminUi";
import { getSettings } from "../../../core/settings/settingsService";
import type { SettingsSchema } from "../../../core/settings/settingsSchema";
import {
  INDUSTRIAL_RULES_DOMAINS,
  applyIndustrialCriticalSettingsPatch,
  getDrawerIndustrialConstantsReadonly,
  type IndustrialRulesDomainId,
} from "../../../core/industrial/rules/industrialRulesSsot";
import { DoorRulesAdminPage } from "../../../admin/rules/doorRules/DoorRulesAdminPage";
import DrawerRulesAdminPage from "../../../components/admin/DrawerRulesAdminPage";
import { DivSepRulesAdminPage } from "../../../admin/rules/divSepRules/DivSepRulesAdminPage";
import SystemSettingsBase from "../../../components/admin/SystemSettingsBase";
import LabelConfigPage from "../../../components/admin/LabelConfigPage";
import { NestingV4RulesEditor } from "./NestingV4RulesEditor";
import { NestingDeepnestRulesEditor } from "./NestingDeepnestRulesEditor";
import { LayoutCorteAlfaRulesEditor } from "./LayoutCorteAlfaRulesEditor";

const SECTION_STORAGE_KEY = "pimo_admin_industrial_section";

function NumberField(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{props.label}</span>
      <input
        type="number"
        value={Number.isFinite(props.value) ? props.value : 0}
        min={props.min}
        max={props.max}
        step={props.step ?? 0.1}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ padding: "6px 8px", borderRadius: 6 }}
      />
    </label>
  );
}

/**
 * Hub único de regras industriais em /admin/industrial/.
 * Não duplica stores: edita o mesmo SSOT (settings + editores existentes).
 */
export default function IndustrialRulesHubPage() {
  const [section, setSection] = useState<IndustrialRulesDomainId>(() => {
    const saved = localStorage.getItem(SECTION_STORAGE_KEY) as IndustrialRulesDomainId | null;
    return saved && INDUSTRIAL_RULES_DOMAINS.some((d) => d.id === saved) ? saved : "cnc";
  });
  const [draft, setDraft] = useState<SettingsSchema>(() => getSettings());
  const [msg, setMsg] = useState<string | null>(null);
  const constants = useMemo(() => getDrawerIndustrialConstantsReadonly(), []);

  const select = (id: IndustrialRulesDomainId) => {
    setSection(id);
    localStorage.setItem(SECTION_STORAGE_KEY, id);
    setMsg(null);
  };

  const reload = () => {
    setDraft(getSettings());
    setMsg("Valores recarregados.");
  };

  const saveCritical = () => {
    applyIndustrialCriticalSettingsPatch({
      nestingEngine: draft.cnc.nestingEngine,
      cnc: {
        sheetMarginMm: draft.cnc.sheetMarginMm,
        minSpacingMm: draft.cnc.minSpacingMm,
        zSafetyMm: draft.cnc.zSafetyMm,
        rampDistanceMm: draft.cnc.rampDistanceMm,
        diametroFresaContornoMm: draft.cnc.diametroFresaContornoMm,
        compensacaoFerramenta: draft.cnc.compensacaoFerramenta,
        nestingEngine: draft.cnc.nestingEngine,
      },
      nesting: {
        kerfPadraoMm: draft.nesting.kerfPadraoMm,
        permitirRotacaoGlobal: draft.nesting.permitirRotacaoGlobal,
      },
      portas: { ...draft.portas },
      gavetas: {
        gavetaFolgaFrenteMm: draft.gavetas.gavetaFolgaFrenteMm,
        gavetaFolgaLateralMm: draft.gavetas.gavetaFolgaLateralMm,
        gavetaRecuoCorpoMm: draft.gavetas.gavetaRecuoCorpoMm,
        gavetaRecuoProfundidadeCorredicaMm: draft.gavetas.gavetaRecuoProfundidadeCorredicaMm,
      },
      materiais: {
        sheetWidthMm: draft.materiais.sheetWidthMm,
        sheetHeightMm: draft.materiais.sheetHeightMm,
        sheetThicknessMm: draft.materiais.sheetThicknessMm,
        sheetName: draft.materiais.sheetName,
      },
    });
    setDraft(getSettings());
    setMsg("Regras industriais críticas guardadas (TCN fixo em nesting_mo).");
  };

  const meta = INDUSTRIAL_RULES_DOMAINS.find((d) => d.id === section)!;

  return (
    <div style={{ ...adminPageShellStyle, flexDirection: "row", alignItems: "stretch", gap: 16 }}>
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          paddingRight: 12,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
        }}
      >
        <AdminPageHeader
          title="Regras Industriais"
          subtitle="SSOT de fabrico — TCN mo + nesting + geometria"
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 12px" }}>
          Páginas ADMIN antigas (Porta, Gaveta, DIV/SEP, System Settings) mantêm-se como atalhos ao mesmo SSOT.
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {INDUSTRIAL_RULES_DOMAINS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={section === d.id ? "button button-primary button-sm" : "button button-sm"}
              style={{ textAlign: "left", justifyContent: "flex-start" }}
              onClick={() => select(d.id)}
            >
              {d.label}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 16, fontSize: 11 }}>
          <Link to="/admin" style={{ color: "#60a5fa" }}>
            ← Voltar ao Admin Panel
          </Link>
        </div>
      </aside>

      <section style={{ flex: 1, minWidth: 0, overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{meta.label}</h2>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>{meta.description}</p>
        <p style={{ margin: "0 0 16px", fontSize: 11, color: "var(--text-muted)" }}>Fonte: {meta.ssot}</p>
        {msg ? (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.35)",
              fontSize: 12,
            }}
          >
            {msg}
          </div>
        ) : null}

        {(section === "cnc" || section === "nesting" || section === "portas" || section === "gavetas" || section === "materiais") && (
          <>
            <AdminStickyActionBar>
              <button type="button" className="button button-ghost button-sm" onClick={reload}>
                Recarregar
              </button>
              <button type="button" className="button button-primary button-sm" onClick={saveCritical}>
                Guardar regras críticas
              </button>
            </AdminStickyActionBar>

            {section === "cnc" && (
              <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(34,197,94,0.35)",
                    background: "rgba(34,197,94,0.08)",
                    fontSize: 13,
                  }}
                >
                  Método TCN: <strong>{constants.tcnMetodo}</strong> (único oficial — não editável)
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <NumberField
                    label="Margem chapa (mm)"
                    value={draft.cnc.sheetMarginMm}
                    onChange={(n) => setDraft((p) => ({ ...p, cnc: { ...p.cnc, sheetMarginMm: n } }))}
                  />
                  <NumberField
                    label="Espaçamento mín. (mm)"
                    value={draft.cnc.minSpacingMm}
                    onChange={(n) => setDraft((p) => ({ ...p, cnc: { ...p.cnc, minSpacingMm: n } }))}
                  />
                  <NumberField
                    label="Z segurança (mm)"
                    value={draft.cnc.zSafetyMm}
                    onChange={(n) => setDraft((p) => ({ ...p, cnc: { ...p.cnc, zSafetyMm: n } }))}
                  />
                  <NumberField
                    label="Rampa (mm)"
                    value={draft.cnc.rampDistanceMm}
                    onChange={(n) => setDraft((p) => ({ ...p, cnc: { ...p.cnc, rampDistanceMm: n } }))}
                  />
                  <NumberField
                    label="Ø fresa contorno (mm)"
                    value={draft.cnc.diametroFresaContornoMm}
                    onChange={(n) => setDraft((p) => ({ ...p, cnc: { ...p.cnc, diametroFresaContornoMm: n } }))}
                  />
                </div>
                <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color: "var(--text-muted)" }}>Compensação ferramenta</span>
                  <select
                    value={draft.cnc.compensacaoFerramenta}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        cnc: { ...p.cnc, compensacaoFerramenta: e.target.value === "dentro" ? "dentro" : "fora" },
                      }))
                    }
                  >
                    <option value="dentro">dentro</option>
                    <option value="fora">fora</option>
                  </select>
                </label>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 12 }}>Abrir System Settings completo</summary>
                  <div style={{ marginTop: 12 }}>
                    <SystemSettingsBase />
                  </div>
                </details>
              </div>
            )}

            {section === "nesting" && (
              <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="hubNestingEngine"
                    checked={(draft.cnc.nestingEngine ?? "pro") === "pro"}
                    onChange={() => setDraft((p) => ({ ...p, cnc: { ...p.cnc, nestingEngine: "pro" } }))}
                  />
                  Nesting Actual (PRO)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="hubNestingEngine"
                    checked={(draft.cnc.nestingEngine ?? "pro") === "experimental"}
                    onChange={() =>
                      setDraft((p) => ({ ...p, cnc: { ...p.cnc, nestingEngine: "experimental" } }))
                    }
                  />
                  Nesting Novo (Experimental)
                </label>
                <NumberField
                  label="Kerf padrão (mm)"
                  value={draft.nesting.kerfPadraoMm}
                  onChange={(n) => setDraft((p) => ({ ...p, nesting: { ...p.nesting, kerfPadraoMm: n } }))}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={draft.nesting.permitirRotacaoGlobal}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        nesting: { ...p.nesting, permitirRotacaoGlobal: e.target.checked },
                      }))
                    }
                  />
                  Permitir rotação global 0°/90°
                </label>
              </div>
            )}

            {section === "portas" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <NumberField
                    label="Gap vertical (mm)"
                    value={draft.portas.portaGapVerticalMm}
                    onChange={(n) => setDraft((p) => ({ ...p, portas: { ...p.portas, portaGapVerticalMm: n } }))}
                  />
                  <NumberField
                    label="Gap horizontal (mm)"
                    value={draft.portas.portaGapHorizontalMm}
                    onChange={(n) => setDraft((p) => ({ ...p, portas: { ...p.portas, portaGapHorizontalMm: n } }))}
                  />
                  <NumberField
                    label="Gap dupla (mm)"
                    value={draft.portas.portaGapDuplaMm}
                    onChange={(n) => setDraft((p) => ({ ...p, portas: { ...p.portas, portaGapDuplaMm: n } }))}
                  />
                  <NumberField
                    label="Offset Z (mm)"
                    value={draft.portas.portaPosZOffsetMm}
                    onChange={(n) => setDraft((p) => ({ ...p, portas: { ...p.portas, portaPosZOffsetMm: n } }))}
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Overlay fabrico (constante): {constants.overlayPortaFabricoMm} mm — editor completo abaixo.
                </p>
                <DoorRulesAdminPage />
              </div>
            )}

            {section === "gavetas" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <NumberField
                    label="Folga frente (mm)"
                    value={draft.gavetas.gavetaFolgaFrenteMm}
                    onChange={(n) =>
                      setDraft((p) => ({ ...p, gavetas: { ...p.gavetas, gavetaFolgaFrenteMm: n } }))
                    }
                  />
                  <NumberField
                    label="Folga lateral (mm)"
                    value={draft.gavetas.gavetaFolgaLateralMm}
                    onChange={(n) =>
                      setDraft((p) => ({ ...p, gavetas: { ...p.gavetas, gavetaFolgaLateralMm: n } }))
                    }
                  />
                  <NumberField
                    label="Recuo corpo (mm)"
                    value={draft.gavetas.gavetaRecuoCorpoMm}
                    onChange={(n) =>
                      setDraft((p) => ({ ...p, gavetas: { ...p.gavetas, gavetaRecuoCorpoMm: n } }))
                    }
                  />
                  <NumberField
                    label="Recuo profundidade corrediça (mm)"
                    value={draft.gavetas.gavetaRecuoProfundidadeCorredicaMm}
                    onChange={(n) =>
                      setDraft((p) => ({
                        ...p,
                        gavetas: { ...p.gavetas, gavetaRecuoProfundidadeCorredicaMm: n },
                      }))
                    }
                  />
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  Constantes industriais (somente leitura nesta fase): lateral = frente −{" "}
                  {constants.lateralHeightOffsetFromFrontMm} mm; elevação corpo {constants.elevacaoCorpoMm} mm;
                  folga vertical frentes {constants.folgaVerticalFrentesMm} mm; folga sobre fundo{" "}
                  {constants.folgaCorpoSobreFundoMm} mm.
                </div>
                <DrawerRulesAdminPage />
              </div>
            )}

            {section === "materiais" && (
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, maxWidth: 720 }}>
                <NumberField
                  label="Largura chapa (mm)"
                  value={draft.materiais.sheetWidthMm}
                  onChange={(n) => setDraft((p) => ({ ...p, materiais: { ...p.materiais, sheetWidthMm: n } }))}
                />
                <NumberField
                  label="Altura chapa (mm)"
                  value={draft.materiais.sheetHeightMm}
                  onChange={(n) => setDraft((p) => ({ ...p, materiais: { ...p.materiais, sheetHeightMm: n } }))}
                />
                <NumberField
                  label="Espessura default (mm)"
                  value={draft.materiais.sheetThicknessMm}
                  onChange={(n) =>
                    setDraft((p) => ({ ...p, materiais: { ...p.materiais, sheetThicknessMm: n } }))
                  }
                />
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Nome chapa</span>
                  <input
                    value={draft.materiais.sheetName}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, materiais: { ...p.materiais, sheetName: e.target.value } }))
                    }
                    style={{ padding: "6px 8px", borderRadius: 6 }}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {section === "nestingV4" && <NestingV4RulesEditor />}

        {section === "nestingDeepnest" && <NestingDeepnestRulesEditor />}

        {section === "layoutCorteAlfa" && <LayoutCorteAlfaRulesEditor />}

        {section === "furacao" && (
          <div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Furação completa continua em System Settings / Configuração de Regras (mesmo SSOT). Atalho:
            </p>
            <SystemSettingsBase />
          </div>
        )}

        {section === "prateleiras" && (
          <div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Clearances de prateleira e grelha de furos: editar em System Settings (furação) e Configuração de
              Regras. Sem segundo editor aqui.
            </p>
            <SystemSettingsBase />
          </div>
        )}

        {section === "divSep" && <DivSepRulesAdminPage />}

        {section === "remates" && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Remates / rodapés / hemati estão em constantes de produto (`core/remate`, `core/rodape`). Exposição
            editável completa fica para a fase seguinte — sem alterar geometria CNC nesta reforma.
          </p>
        )}

        {section === "etiquetas" && <LabelConfigPage />}
      </section>
    </div>
  );
}
