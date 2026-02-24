import { useEffect, useState } from "react";
import Panel from "../ui/Panel";
import { useToast } from "../../context/ToastContext";
import { useSettings } from "../../context/SettingsContext";
import type { SettingsSchema } from "../../core/settings/settingsService";

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
  const { showToast } = useToast();
  const { settings, refreshSettings, updateSettings, validate } = useSettings();
  const [draft, setDraft] = useState<SettingsSchema>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const applyAndSave = () => {
    const validation = validate(draft);
    const result = updateSettings(validation.normalized);
    if (result.success) {
      showToast("Configurações globais guardadas com sucesso.", "info");
    } else {
      showToast(result.errors[0] ?? "Configurações guardadas com ajustes.", "warning");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>System Settings</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-ghost" onClick={refreshSettings}>
            Recarregar
          </button>
          <button type="button" className="button button-primary" onClick={applyAndSave}>
            Salvar Configurações
          </button>
        </div>
      </div>

      <Panel title="Geral">
        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Locale</span>
            <input
              className="input"
              value={draft.geral.locale}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, geral: { ...prev.geral, locale: e.target.value } }))
              }
            />
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

      <Panel title="Fábrica (dimensões e tolerâncias)">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
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
          <NumberField
            label="Tolerância de corte (mm)"
            value={draft.fabrica.toleranciaCorteMm}
            step={0.1}
            onChange={(value) => setDraft((prev) => ({ ...prev, fabrica: { ...prev.fabrica, toleranciaCorteMm: value } }))}
          />
        </div>
      </Panel>

      <Panel title="Preços">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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

      <Panel title="Materiais (defaults)">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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

      <Panel title="CNC (offsets e tolerâncias)">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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

      <Panel title="Nesting (parâmetros globais)">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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

      <Panel title="Viewer">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
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
