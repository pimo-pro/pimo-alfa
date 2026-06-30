/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import Panel from "../../../components/ui/Panel";
import { AdminPageHeader, AdminStickyActionBar, adminPageShellStyle } from "../../../components/admin/AdminUi";
import { useProject } from "../../../context/useProject";
import { useSettings } from "../../../context/SettingsContext";
import { useToast } from "../../../context/ToastContext";
import {
  defaultRulesConfig,
  normalizeRulesConfig,
  type PortaRange,
  type RulesConfig,
} from "../../../core/rules/rulesConfig";
import { settingsDefaults, type SettingsSchema } from "../../../core/settings/settingsSchema";
import {
  DOOR_ANIMATION_DURATION_MS,
  DOOR_MIN_HEIGHT_MM,
  DOOR_MIN_WIDTH_MM,
  DOOR_OVERLAY_FABRICO_MM,
  resolveDoorRules,
  validateResolvedDoorRules,
} from "../../../core/doors/doorRules";

type DoorRulesDraft = {
  portas: SettingsSchema["portas"];
  hingeRanges: PortaRange[];
  profile: RulesConfig["furos"]["tecnicos"]["dobradica"];
  settingsHinge: NonNullable<SettingsSchema["furação"]>["dobradica"];
  lateralFixation: NonNullable<SettingsSchema["furação"]>["dobradicaFixacao"];
};

function buildDraft(rules: RulesConfig, settings: SettingsSchema): DoorRulesDraft {
  return {
    portas: { ...settings.portas },
    hingeRanges: rules.portas.ranges.map((r) => ({ ...r })),
    profile: { ...rules.furos.tecnicos.dobradica },
    settingsHinge: { ...settings.furação!.dobradica },
    lateralFixation: { ...settings.furação!.dobradicaFixacao },
  };
}

function draftToRules(base: RulesConfig, draft: DoorRulesDraft): RulesConfig {
  return {
    ...base,
    portas: { ranges: draft.hingeRanges.map((r) => ({ ...r })) },
    furos: {
      ...base.furos,
      tecnicos: {
        ...base.furos.tecnicos,
        dobradica: { ...draft.profile },
      },
    },
  };
}

export function DoorRulesAdminPage() {
  const { showToast } = useToast();
  const { project, actions } = useProject();
  const { settings, updateSettings } = useSettings();
  const perfilAtivoId = project.rulesProfiles.perfilAtivoId;
  const baseRules = useMemo(() => normalizeRulesConfig(project.rules), [project.rules]);

  const [draft, setDraft] = useState<DoorRulesDraft>(() => buildDraft(baseRules, settings));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(buildDraft(normalizeRulesConfig(project.rules), settings));
  }, [project.rules, settings, perfilAtivoId]);

  const updateHingeRange = (index: number, field: keyof PortaRange, value: number) => {
    setDraft((prev) => {
      const next = [...prev.hingeRanges];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, hingeRanges: next };
    });
  };

  const addHingeRange = () => {
    setDraft((prev) => {
      const last = prev.hingeRanges[prev.hingeRanges.length - 1];
      const newRange: PortaRange = {
        min: (last?.max ?? 0) + 1,
        max: (last?.max ?? 0) + 50,
        dobradicas: 2,
      };
      return { ...prev, hingeRanges: [...prev.hingeRanges, newRange] };
    });
  };

  const removeHingeRange = (index: number) => {
    if (draft.hingeRanges.length <= 1) {
      showToast("Deve existir pelo menos um range.", "warning");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      hingeRanges: prev.hingeRanges.filter((_, i) => i !== index),
    }));
  };

  const updateProfile = (patch: Partial<DoorRulesDraft["profile"]>) => {
    setDraft((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  };

  const onSave = () => {
    const rulesToSave = draftToRules(baseRules, draft);
    const settingsPatch = {
      portas: draft.portas,
      furação: {
        dobradica: draft.settingsHinge,
        dobradicaFixacao: draft.lateralFixation,
      },
    };
    const resolved = resolveDoorRules(rulesToSave, {
      portas: settingsPatch.portas,
      furação: {
        ...settings.furação,
        dobradica: settingsPatch.furação.dobradica,
        dobradicaFixacao: settingsPatch.furação.dobradicaFixacao,
      },
    });
    const issues = validateResolvedDoorRules(resolved);
    if (issues.length) {
      showToast(issues.map((i) => i.message).join(" "), "error");
      return;
    }

    actions.updateRulesInProfile(perfilAtivoId, rulesToSave);
    const settingsResult = updateSettings(settingsPatch);
    if (!settingsResult.success) {
      showToast(settingsResult.message || "Erro ao guardar settings.", "error");
      return;
    }

    setSaved(true);
    showToast("Regras da porta guardadas com sucesso.", "info");
    setTimeout(() => setSaved(false), 2000);
  };

  const onReset = () => {
    const defaults = buildDraft(defaultRulesConfig, settingsDefaults);
    setDraft(defaults);
    showToast("Rascunho reposto para o padrão. Guarde para aplicar.", "info");
  };

  const numField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    opts?: { min?: number; max?: number; step?: number }
  ) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
      <input
        type="number"
        className="input input-sm"
        value={value}
        min={opts?.min}
        max={opts?.max}
        step={opts?.step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );

  return (
    <div style={adminPageShellStyle}>
      <AdminPageHeader
        title="Regras da Porta"
        subtitle="Folgas, ranges de dobradiças e furação (perfil activo + settings globais). Comportamento industrial inalterado."
      />
      <AdminStickyActionBar>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {saved ? "Regras guardadas." : "Alterações pendentes até guardar."}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-sm" onClick={onReset}>
            Repor padrão
          </button>
          <button type="button" className="button button-primary button-sm" onClick={onSave}>
            Guardar
          </button>
        </div>
      </AdminStickyActionBar>

      <Panel title="Folgas e offsets (settings globais)" description="Parâmetros de folgas e posicionamento no viewer.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {numField("Gap vertical (mm)", draft.portas.portaGapVerticalMm, (v) =>
            setDraft((p) => ({ ...p, portas: { ...p.portas, portaGapVerticalMm: v } }))
          , { step: 0.1 })}
          {numField("Gap horizontal (mm)", draft.portas.portaGapHorizontalMm, (v) =>
            setDraft((p) => ({ ...p, portas: { ...p.portas, portaGapHorizontalMm: v } }))
          , { step: 0.1 })}
          {numField("Gap porta dupla (mm)", draft.portas.portaGapDuplaMm, (v) =>
            setDraft((p) => ({ ...p, portas: { ...p.portas, portaGapDuplaMm: v } }))
          , { step: 0.1 })}
          {numField("Offset posZ (mm)", draft.portas.portaPosZOffsetMm, (v) =>
            setDraft((p) => ({ ...p, portas: { ...p.portas, portaPosZOffsetMm: v } }))
          , { step: 0.1 })}
        </div>
      </Panel>

      <Panel title="Ranges altura → dobradiças (perfil)" description="Altura da porta (mm) → número de dobradiças.">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {draft.hingeRanges.map((range, index) => (
            <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <input
                type="number"
                value={range.min}
                onChange={(e) => updateHingeRange(index, "min", Number(e.target.value))}
                placeholder="De (mm)"
                className="input input-xs"
                style={{ width: 80 }}
              />
              <span>–</span>
              <input
                type="number"
                value={range.max}
                onChange={(e) => updateHingeRange(index, "max", Number(e.target.value))}
                placeholder="Até (mm)"
                className="input input-xs"
                style={{ width: 80 }}
              />
              <span>mm →</span>
              <input
                type="number"
                value={range.dobradicas}
                onChange={(e) => updateHingeRange(index, "dobradicas", Number(e.target.value))}
                placeholder="Dobradiças"
                className="input input-xs"
                style={{ width: 80 }}
              />
              <button
                type="button"
                onClick={() => removeHingeRange(index)}
                className="button button-ghost"
                style={{ padding: "4px 8px" }}
              >
                Remover
              </button>
            </div>
          ))}
          <button type="button" onClick={addHingeRange} className="button button-ghost" style={{ marginTop: 4 }}>
            + Adicionar range
          </button>
        </div>
      </Panel>

      <Panel title="Furação na porta (perfil)" description="Caneco e furos de fixação — rules.furos.tecnicos.dobradica">
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={draft.profile.enabled}
            onChange={(e) => updateProfile({ enabled: e.target.checked })}
          />
          Ativar furação de dobradiça na porta
        </label>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Caneco (porta): taça 35 mm</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {numField("Diâm. caneco (mm)", draft.profile.diametro, (v) => updateProfile({ diametro: v }))}
          {numField("Prof. caneco (mm)", draft.profile.profundidade, (v) => updateProfile({ profundidade: v }))}
          {numField(
            "Dist. centro caneco (mm)",
            draft.profile.distanciaCentroDaBorda ?? draft.profile.distanciaBordaLateral,
            (v) => updateProfile({ distanciaCentroDaBorda: v, distanciaBordaLateral: v })
          )}
          {numField("Offset superior (mm)", draft.profile.offsetSuperior, (v) => updateProfile({ offsetSuperior: v }))}
          {numField("Offset inferior (mm)", draft.profile.offsetInferior, (v) => updateProfile({ offsetInferior: v }))}
          {numField("Qtd/porta", draft.profile.numeroPorPorta, (v) => updateProfile({ numeroPorPorta: Math.max(2, v) }), {
            min: 2,
          })}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", margin: "12px 0 8px" }}>
          Furos de fixação na porta (medidas ao centro do furo)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {numField(
            "Dist. borda → centro (mm)",
            draft.profile.distanciaFurosFixacaoBorda ?? 28,
            (v) => updateProfile({ distanciaFurosFixacaoBorda: v })
          )}
          {numField(
            "Entre centros (mm)",
            draft.profile.distanciaEntreFurosFixacao ?? 52,
            (v) => updateProfile({ distanciaEntreFurosFixacao: v })
          )}
          {numField(
            "Diâm. fixação (mm)",
            draft.profile.diametroFurosFixacao ?? 10,
            (v) => updateProfile({ diametroFurosFixacao: v })
          )}
          {numField(
            "Prof. fixação (mm)",
            draft.profile.profundidadeFurosFixacao ?? 12,
            (v) => updateProfile({ profundidadeFurosFixacao: v })
          )}
        </div>
      </Panel>

      <Panel title="Furação lateral (settings globais)" description="Posicionamento na lateral e fixação (calço + parafuso união).">
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Regras de dobradiça na lateral</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
          {numField("Dist. topo (mm)", draft.settingsHinge.distanciaDobradiçaTopo, (v) =>
            setDraft((p) => ({ ...p, settingsHinge: { ...p.settingsHinge, distanciaDobradiçaTopo: v } }))
          )}
          {numField("Dist. fundo (mm)", draft.settingsHinge.distanciaDobradiçaFundo, (v) =>
            setDraft((p) => ({ ...p, settingsHinge: { ...p.settingsHinge, distanciaDobradiçaFundo: v } }))
          )}
          {numField("Número por porta", draft.settingsHinge.numeroPorPorta, (v) =>
            setDraft((p) => ({ ...p, settingsHinge: { ...p.settingsHinge, numeroPorPorta: v } }))
          , { min: 2, max: 6 })}
          {numField("Distância centro–borda (mm)", draft.settingsHinge.distanciaCentroDaBorda, (v) =>
            setDraft((p) => ({ ...p, settingsHinge: { ...p.settingsHinge, distanciaCentroDaBorda: v } }))
          , { step: 0.5 })}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={draft.settingsHinge.distribuicaoAutomatica}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                settingsHinge: { ...p.settingsHinge, distribuicaoAutomatica: e.target.checked },
              }))
            }
          />
          Distribuição automática (distTopo/distFundo/proporcional)
        </label>

        <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginTop: 16 }}>
          Fixação na lateral (2 calço + 1 parafuso união)
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
          {numField("Dist. borda frontal — calço (mm)", draft.lateralFixation.distanciaDaBordaCalco, (v) =>
            setDraft((p) => ({
              ...p,
              lateralFixation: { ...p.lateralFixation, distanciaDaBordaCalco: v },
            }))
          )}
          {numField("Dist. borda — parafuso união (mm)", draft.lateralFixation.distanciaDaBordaParafusoUniao, (v) =>
            setDraft((p) => ({
              ...p,
              lateralFixation: { ...p.lateralFixation, distanciaDaBordaParafusoUniao: v },
            }))
          )}
          {numField("Dist. entre furos calço (mm)", draft.lateralFixation.distanciaEntreFurosCalco, (v) =>
            setDraft((p) => ({
              ...p,
              lateralFixation: { ...p.lateralFixation, distanciaEntreFurosCalco: v },
            }))
          )}
          {numField("Diâmetro calço (mm)", draft.lateralFixation.diametro, (v) =>
            setDraft((p) => ({ ...p, lateralFixation: { ...p.lateralFixation, diametro: v } }))
          )}
          {numField("Profundidade calço (mm)", draft.lateralFixation.profundidadeFuro, (v) =>
            setDraft((p) => ({
              ...p,
              lateralFixation: { ...p.lateralFixation, profundidadeFuro: v },
            }))
          )}
          {numField("Diâmetro parafuso união (mm)", draft.lateralFixation.diametroParafusoUniao, (v) =>
            setDraft((p) => ({
              ...p,
              lateralFixation: { ...p.lateralFixation, diametroParafusoUniao: v },
            }))
          )}
          {numField("Profundidade parafuso união (mm)", draft.lateralFixation.profundidadeParafusoUniao, (v) =>
            setDraft((p) => ({
              ...p,
              lateralFixation: { ...p.lateralFixation, profundidadeParafusoUniao: v },
            }))
          )}
        </div>
      </Panel>

      <Panel title="Constantes do sistema (somente leitura)" description="Valores fixos no código; não editáveis nesta fase.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, fontSize: 12 }}>
          <div>Overlay fabrico: <strong>{DOOR_OVERLAY_FABRICO_MM} mm</strong></div>
          <div>Altura mínima porta: <strong>{DOOR_MIN_HEIGHT_MM} mm</strong></div>
          <div>Largura mínima porta: <strong>{DOOR_MIN_WIDTH_MM} mm</strong></div>
          <div>Animação viewer: <strong>{DOOR_ANIMATION_DURATION_MS} ms</strong></div>
        </div>
      </Panel>
    </div>
  );
}
