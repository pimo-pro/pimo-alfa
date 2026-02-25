import { useEffect, useState } from "react";
import Panel from "../ui/Panel";
import { useSettings } from "../../context/SettingsContext";
import type { SettingsSchema } from "../../core/settings/settingsService";
import {
  AdminPageHeader,
  AdminStickyActionBar,
  adminFieldErrorStyle,
  adminPageShellStyle,
} from "./AdminUi";
import { useAdminFeedback } from "../../hooks/useAdminFeedback";

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <input
        className="input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function SystemSettingsBase() {
  const feedback = useAdminFeedback();
  const { settings, refreshSettings, updateSettings, validate } = useSettings();
  const [draft, setDraft] = useState<SettingsSchema>(settings);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const applyAndSave = () => {
    const validation = validate(draft);
    const nextErrors: Record<string, string> = {};
    if (!validation.normalized.geral.locale.trim()) {
      nextErrors["geral.locale"] = "Locale é obrigatório.";
    }
    if (validation.normalized.fabrica.espessuraPadraoMm <= 0) {
      nextErrors["fabrica.espessuraPadraoMm"] = "Espessura deve ser maior que zero.";
    }
    setFieldErrors(nextErrors);
    const result = updateSettings(validation.normalized);
    if (result.success) {
      feedback.success("Configurações globais guardadas com sucesso.");
    } else {
      feedback.warning(result.errors[0] ?? "Configurações guardadas com ajustes.");
    }
  };

  return (
    <div style={{ ...adminPageShellStyle, maxWidth: 980 }}>
      <AdminPageHeader
        title="System Settings"
        subtitle="Configurações globais do sistema. Alterações aplicam defaults e parâmetros transversais sem alterar a lógica de negócio."
      />

      <AdminStickyActionBar>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Configure e salve quando terminar a edição.
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-ghost" onClick={refreshSettings}>
            Recarregar
          </button>
          <button type="button" className="button button-primary" onClick={applyAndSave}>
            Salvar Configurações
          </button>
        </div>
      </AdminStickyActionBar>

      <Panel title="Geral" description="Preferências de interface e comportamento geral da aplicação.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Locale</span>
            <input
              className="input"
              placeholder="ex: pt-PT"
              value={draft.geral.locale}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, geral: { ...prev.geral, locale: e.target.value } }))
              }
            />
            {fieldErrors["geral.locale"] ? (
              <span style={adminFieldErrorStyle}>{fieldErrors["geral.locale"]}</span>
            ) : null}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Tema</span>
            <select
              className="input"
              value={draft.geral.theme}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  geral: { ...prev.geral, theme: e.target.value as SettingsSchema["geral"]["theme"] },
                }))
              }
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.geral.autosaveEnabled}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, geral: { ...prev.geral, autosaveEnabled: e.target.checked } }))
              }
            />
            Autosave ativo
          </label>
        </div>
      </Panel>

      <Panel title="Fábrica (dimensões e tolerâncias)" description="Parâmetros padrão para dimensões de chapa e tolerâncias produtivas.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="Largura chapa padrão (mm)"
            value={draft.fabrica.larguraChapaPadraoMm}
            onChange={(value) => setDraft((prev) => ({ ...prev, fabrica: { ...prev.fabrica, larguraChapaPadraoMm: value } }))}
          />
          <NumberField
            label="Altura chapa padrão (mm)"
            value={draft.fabrica.alturaChapaPadraoMm}
            onChange={(value) => setDraft((prev) => ({ ...prev, fabrica: { ...prev.fabrica, alturaChapaPadraoMm: value } }))}
          />
          <NumberField
            label="Espessura padrão (mm)"
            value={draft.fabrica.espessuraPadraoMm}
            onChange={(value) => setDraft((prev) => ({ ...prev, fabrica: { ...prev.fabrica, espessuraPadraoMm: value } }))}
          />
          {fieldErrors["fabrica.espessuraPadraoMm"] ? (
            <span style={{ ...adminFieldErrorStyle, gridColumn: "1 / -1" }}>
              {fieldErrors["fabrica.espessuraPadraoMm"]}
            </span>
          ) : null}
          <NumberField
            label="Tolerância de corte (mm)"
            value={draft.fabrica.toleranciaCorteMm}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, fabrica: { ...prev.fabrica, toleranciaCorteMm: value } }))}
          />
        </div>
      </Panel>

      <Panel title="Preços" description="Defaults de cálculo para margem, multiplicadores e custo de operação.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="Margem (%)"
            value={draft.precos.margemPercentual}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, precos: { ...prev.precos, margemPercentual: value } }))}
          />
          <NumberField
            label="Multiplicador base"
            value={draft.precos.multiplicadorBase}
            step={0.01}
            onChange={(value) => setDraft((prev) => ({ ...prev, precos: { ...prev.precos, multiplicadorBase: value } }))}
          />
          <NumberField
            label="Valor hora máquina"
            value={draft.precos.valorHoraMaquina}
            step={0.5}
            onChange={(value) => setDraft((prev) => ({ ...prev, precos: { ...prev.precos, valorHoraMaquina: value } }))}
          />
        </div>
      </Panel>

      <Panel title="Materiais (defaults)" description="Valores padrão para categoria e presets quando nenhum valor específico estiver definido.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Categoria padrão</span>
            <input
              className="input"
              value={draft.materiais.categoriaPadraoId}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, materiais: { ...prev.materiais, categoriaPadraoId: e.target.value } }))
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Preset visual padrão</span>
            <input
              className="input"
              value={draft.materiais.presetVisualPadraoId}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, materiais: { ...prev.materiais, presetVisualPadraoId: e.target.value } }))
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Material industrial padrão</span>
            <input
              className="input"
              value={draft.materiais.materialIndustrialPadraoId}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, materiais: { ...prev.materiais, materialIndustrialPadraoId: e.target.value } }))
              }
            />
          </label>
        </div>
      </Panel>

      <Panel title="CNC (offsets e tolerâncias)" description="Parâmetros padrão de corte, offset e tolerância para operação CNC.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="Profundidade corte padrão (mm)"
            value={draft.cnc.profundidadeCortePadraoMm}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, cnc: { ...prev.cnc, profundidadeCortePadraoMm: value } }))}
          />
          <NumberField
            label="Offset ferramenta padrão (mm)"
            value={draft.cnc.offsetFerramentaPadraoMm}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, cnc: { ...prev.cnc, offsetFerramentaPadraoMm: value } }))}
          />
          <NumberField
            label="Tolerância posicionamento (mm)"
            value={draft.cnc.toleranciaPosicionamentoMm}
            step={0.01}
            onChange={(value) => setDraft((prev) => ({ ...prev, cnc: { ...prev.cnc, toleranciaPosicionamentoMm: value } }))}
          />
        </div>
      </Panel>

      <Panel title="Nesting (parâmetros globais)" description="Preferências globais de corte e aproveitamento para planeamento.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="Kerf padrão (mm)"
            value={draft.nesting.kerfPadraoMm}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, nesting: { ...prev.nesting, kerfPadraoMm: value } }))}
          />
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Prioridade</span>
            <select
              className="input"
              value={draft.nesting.prioridadeAproveitamento}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  nesting: {
                    ...prev.nesting,
                    prioridadeAproveitamento: e.target.value as SettingsSchema["nesting"]["prioridadeAproveitamento"],
                  },
                }))
              }
            >
              <option value="balanceado">Balanceado</option>
              <option value="area">Área</option>
              <option value="chapas">Chapas</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.nesting.permitirRotacaoGlobal}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, nesting: { ...prev.nesting, permitirRotacaoGlobal: e.target.checked } }))
              }
            />
            Permitir rotação global
          </label>
        </div>
      </Panel>

      <Panel title="Portas (gaps e offsets)" description="Parâmetros de folgas e posicionamento das portas.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="Gap vertical (mm)"
            value={draft.portas.portaGapVerticalMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, portas: { ...prev.portas, portaGapVerticalMm: value } }))
            }
          />
          <NumberField
            label="Gap horizontal (mm)"
            value={draft.portas.portaGapHorizontalMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, portas: { ...prev.portas, portaGapHorizontalMm: value } }))
            }
          />
          <NumberField
            label="Gap porta dupla (mm)"
            value={draft.portas.portaGapDuplaMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, portas: { ...prev.portas, portaGapDuplaMm: value } }))
            }
          />
          <NumberField
            label="Offset posZ (mm)"
            value={draft.portas.portaPosZOffsetMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, portas: { ...prev.portas, portaPosZOffsetMm: value } }))
            }
          />
        </div>
      </Panel>

      <Panel title="Gavetas" description="Parâmetros de construção e distribuição de alturas.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <NumberField
            label="Base gaveta normal (mm)"
            value={draft.gavetas.gavetaNormalBaseEspessuraMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, gavetas: { ...prev.gavetas, gavetaNormalBaseEspessuraMm: value } }))
            }
          />
          <NumberField
            label="Base gaveta PRO (mm)"
            value={draft.gavetas.gavetaProBaseEspessuraMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, gavetas: { ...prev.gavetas, gavetaProBaseEspessuraMm: value } }))
            }
          />
          <NumberField
            label="Folga lateral (mm)"
            value={draft.gavetas.gavetaFolgaLateralMm}
            step={0.1}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, gavetas: { ...prev.gavetas, gavetaFolgaLateralMm: value } }))
            }
          />
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Profundidades disponiveis (mm)</span>
            <input
              className="input"
              value={draft.gavetas.gavetaProfundidadesDisponiveisMm.join(", ")}
              onChange={(e) => {
                const values = e.target.value
                  .split(",")
                  .map((item) => Number(item.trim()))
                  .filter((item) => Number.isFinite(item) && item > 0);
                setDraft((prev) => ({
                  ...prev,
                  gavetas: { ...prev.gavetas, gavetaProfundidadesDisponiveisMm: values },
                }));
              }}
              placeholder="250, 300, 350, 400"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Modo de altura</span>
            <select
              className="input"
              value={draft.gavetas.gavetaAlturaModoPadrao}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  gavetas: {
                    ...prev.gavetas,
                    gavetaAlturaModoPadrao: e.target.value as SettingsSchema["gavetas"]["gavetaAlturaModoPadrao"],
                  },
                }))
              }
            >
              <option value="equal">Todas iguais</option>
              <option value="top_small_mid_medium_bottom_large">Topo pequeno, meio medio, baixo grande</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>
      </Panel>

      <Panel title="Viewer" description="Qualidade visual e opções de visualização do ambiente 3D.">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Qualidade</span>
            <select
              className="input"
              value={draft.viewer.qualidade}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  viewer: { ...prev.viewer, qualidade: e.target.value as SettingsSchema["viewer"]["qualidade"] },
                }))
              }
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <NumberField
            label="Intensidade de luz"
            value={draft.viewer.luzIntensidade}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, viewer: { ...prev.viewer, luzIntensidade: value } }))}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.viewer.mostrarGrid}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, viewer: { ...prev.viewer, mostrarGrid: e.target.checked } }))
              }
            />
            Mostrar grid
          </label>
        </div>
      </Panel>
    </div>
  );
}
