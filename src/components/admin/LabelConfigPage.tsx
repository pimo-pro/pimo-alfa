/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import Panel from "../ui/Panel";
import { useProject } from "../../context/useProject";
import {
  defaultRulesConfig,
  normalizeRulesConfig,
  buildDefaultLabelV5RulesConfig,
  type LabelV5RulesConfig,
  type RulesConfig,
} from "../../core/rules/rulesConfig";
import { DEFAULT_LABEL_CONFIG } from "../../core/labelConfig/labelConfig";
import type { PaletteGroup } from "../../core/labelConfig/labelConfig";
import {
  AdminPageHeader,
  AdminStickyActionBar,
  adminLabelStyle,
  adminPageShellStyle,
} from "./AdminUi";
import { useAdminFeedback } from "../../hooks/useAdminFeedback";

const PALETTE_CODES: PaletteGroup["code"][] = ["D", "O", "OD", "C", "L", "E"];

type DraftState = {
  etiqueta: RulesConfig["etiqueta"];
  labelV5: LabelV5RulesConfig;
};

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
      <span style={adminLabelStyle}>{label}</span>
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

function mergeDraftFromRules(rules: RulesConfig): DraftState {
  const normalized = normalizeRulesConfig(rules);
  return {
    etiqueta: { ...normalized.etiqueta },
    labelV5: { ...normalized.labelV5 },
  };
}

export default function LabelConfigPage() {
  const feedback = useAdminFeedback();
  const { project, actions } = useProject();
  const perfilAtivoId = project.rulesProfiles.perfilAtivoId;
  const perfilAtivo = project.rulesProfiles.perfis.find((p) => p.id === perfilAtivoId);

  const [draft, setDraft] = useState<DraftState>(() => mergeDraftFromRules(project.rules));
  const [dragStepIndex, setDragStepIndex] = useState<number | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    setDraft(mergeDraftFromRules(project.rules));
  }, [project.rules, perfilAtivoId]);

  const defaultsRef = useMemo(
    () => ({
      etiqueta: defaultRulesConfig.etiqueta,
      labelV5: buildDefaultLabelV5RulesConfig(),
      dimensions: DEFAULT_LABEL_CONFIG.dimensions,
    }),
    []
  );

  const updateEtiqueta = useCallback((patch: Partial<RulesConfig["etiqueta"]>) => {
    setDraft((prev) => ({ ...prev, etiqueta: { ...prev.etiqueta, ...patch } }));
  }, []);

  const updateLabelV5 = useCallback((patch: Partial<LabelV5RulesConfig>) => {
    setDraft((prev) => ({ ...prev, labelV5: { ...prev.labelV5, ...patch } }));
  }, []);

  const syncStepOrders = (steps: LabelV5RulesConfig["productionSteps"]) =>
    steps.map((step, index) => ({ ...step, defaultOrder: index + 1 }));

  const reorderProductionSteps = (from: number, to: number) => {
    if (from === to) return;
    setDraft((prev) => {
      const next = [...prev.labelV5.productionSteps];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return { ...prev, labelV5: { ...prev.labelV5, productionSteps: syncStepOrders(next) } };
    });
  };

  const handleSave = () => {
    const current = normalizeRulesConfig(project.rules);
    const rulesToSave: RulesConfig = {
      ...current,
      etiqueta: { ...draft.etiqueta },
      labelV5: {
        ...draft.labelV5,
        paletteGroups: draft.labelV5.paletteGroups.filter((g) => PALETTE_CODES.includes(g.code)),
        productionSteps: syncStepOrders(
          draft.labelV5.productionSteps.filter((s) => s.id.trim().length > 0)
        ),
        manualPieceNames: draft.labelV5.manualPieceNames.map((n) => n.trim()).filter(Boolean),
      },
    };
    actions.updateRulesInProfile(perfilAtivoId, rulesToSave);
    feedback.success("Configuração de etiquetas v5 guardada no perfil activo.");
  };

  const handleReset = () => {
    if (!confirmResetOpen) return;
    setDraft({
      etiqueta: {
        ...draft.etiqueta,
        larguraMm: defaultsRef.dimensions.totalWidth_mm,
        alturaMm: defaultsRef.dimensions.totalHeight_mm,
        tamanhoQr: defaultsRef.dimensions.qrSize_mm,
        enableV5Layout: false,
      },
      labelV5: buildDefaultLabelV5RulesConfig(),
    });
    setConfirmResetOpen(false);
    feedback.success("Valores repostos para o padrão v5 (ainda não guardados).");
  };

  const addPaletteGroup = () => {
    const used = new Set(draft.labelV5.paletteGroups.map((g) => g.code));
    const nextCode = PALETTE_CODES.find((code) => !used.has(code));
    if (!nextCode) {
      feedback.warning("Todos os grupos de palete já estão na lista.");
      return;
    }
    updateLabelV5({ paletteGroups: [...draft.labelV5.paletteGroups, { code: nextCode }] });
  };

  return (
    <div style={{ ...adminPageShellStyle, maxWidth: 1120 }}>
      <AdminPageHeader
        title="Configuração de Etiquetas (v5)"
        subtitle="Override por perfil de regras do projecto. Valores por defeito vêm de DEFAULT_LABEL_CONFIG."
      />

      <AdminStickyActionBar>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Perfil activo: <strong style={{ color: "var(--text-main)" }}>{perfilAtivo?.nome ?? perfilAtivoId}</strong>
          {" · "}
          <span style={{ color: draft.etiqueta.enableV5Layout ? "#86efac" : "#fca5a5" }}>
            Layout v5 {draft.etiqueta.enableV5Layout ? "activo" : "desactivo"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmResetOpen(true)}>
            Repor padrão v5
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Guardar perfil
          </button>
        </div>
      </AdminStickyActionBar>

      {confirmResetOpen ? (
        <Panel title="Confirmar reposição">
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Repõe dimensões v5, grupos, etapas e regras especiais. Clique novamente para confirmar.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmResetOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleReset}>
              Confirmar reposição
            </button>
          </div>
        </Panel>
      ) : null}

      <Panel title="(E) Activação do layout v5">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={draft.etiqueta.enableV5Layout}
            onChange={(event) => updateEtiqueta({ enableV5Layout: event.target.checked })}
          />
          Activar renderer de etiquetas v5 (rules.etiqueta.enableV5Layout)
        </label>
      </Panel>

      <Panel title="(A) Dimensões">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <NumberField
            label="Largura (mm) — rules.etiqueta.larguraMm"
            value={draft.etiqueta.larguraMm}
            min={40}
            max={200}
            onChange={(value) => updateEtiqueta({ larguraMm: value })}
          />
          <NumberField
            label="Altura (mm) — rules.etiqueta.alturaMm"
            value={draft.etiqueta.alturaMm}
            min={30}
            max={150}
            onChange={(value) => updateEtiqueta({ alturaMm: value })}
          />
          <NumberField
            label="Tamanho QR (mm) — rules.etiqueta.tamanhoQr"
            value={draft.etiqueta.tamanhoQr}
            min={10}
            max={60}
            onChange={(value) => updateEtiqueta({ tamanhoQr: value })}
          />
          <NumberField
            label="Faixa inferior (mm)"
            value={draft.labelV5.bottomStrip_mm}
            min={4}
            max={20}
            onChange={(value) => updateLabelV5({ bottomStrip_mm: value })}
          />
          <NumberField
            label="Altura secção material (mm)"
            value={draft.labelV5.materialHeight_mm}
            min={4}
            max={20}
            onChange={(value) => updateLabelV5({ materialHeight_mm: value })}
          />
          <NumberField
            label="Altura secção medidas (mm)"
            value={draft.labelV5.medidasHeight_mm}
            min={3}
            max={15}
            onChange={(value) => updateLabelV5({ medidasHeight_mm: value })}
          />
          <NumberField
            label="Altura secção produção (mm)"
            value={draft.labelV5.productionHeight_mm}
            min={10}
            max={40}
            onChange={(value) => updateLabelV5({ productionHeight_mm: value })}
          />
          <NumberField
            label="Altura secção observações (mm)"
            value={draft.labelV5.observationHeight_mm}
            min={3}
            max={15}
            onChange={(value) => updateLabelV5({ observationHeight_mm: value })}
          />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
          Padrão estático: {defaultsRef.dimensions.totalWidth_mm}×{defaultsRef.dimensions.totalHeight_mm} mm
        </p>
      </Panel>

      <Panel title="(B) Grupos de palete">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {draft.labelV5.paletteGroups.map((group, index) => (
            <div
              key={`${group.code}-${index}`}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                className="input"
                value={group.code}
                onChange={(event) => {
                  const code = event.target.value as PaletteGroup["code"];
                  const next = draft.labelV5.paletteGroups.map((g, i) =>
                    i === index ? { code } : g
                  );
                  updateLabelV5({ paletteGroups: next });
                }}
              >
                {PALETTE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  updateLabelV5({
                    paletteGroups: draft.labelV5.paletteGroups.filter((_, i) => i !== index),
                  })
                }
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" onClick={addPaletteGroup}>
          Adicionar grupo
        </button>
      </Panel>

      <Panel
        title="(C) Etapas de produção"
        description="Arrastar para reordenar; renomear label; editar defaultOrder."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {draft.labelV5.productionSteps.map((step, index) => (
            <div
              key={`${step.id}-${index}`}
              draggable
              onDragStart={() => setDragStepIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragStepIndex == null) return;
                reorderProductionSteps(dragStepIndex, index);
                setDragStepIndex(null);
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr 120px auto",
                gap: 8,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(255,255,255,0.08)",
                background: dragStepIndex === index ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                cursor: "grab",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>⋮⋮</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>ID: {step.id}</span>
                <input
                  className="input"
                  value={step.label}
                  onChange={(event) => {
                    const next = draft.labelV5.productionSteps.map((s, i) =>
                      i === index ? { ...s, label: event.target.value } : s
                    );
                    updateLabelV5({ productionSteps: next });
                  }}
                  placeholder="Nome apresentado"
                />
              </div>
              <NumberField
                label="Ordem"
                value={step.defaultOrder}
                min={1}
                max={20}
                onChange={(value) => {
                  const next = draft.labelV5.productionSteps.map((s, i) =>
                    i === index ? { ...s, defaultOrder: value } : s
                  );
                  updateLabelV5({ productionSteps: next });
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (draft.labelV5.productionSteps.length <= 1) {
                    feedback.warning("Deve existir pelo menos uma etapa.");
                    return;
                  }
                  updateLabelV5({
                    productionSteps: syncStepOrders(
                      draft.labelV5.productionSteps.filter((_, i) => i !== index)
                    ),
                  });
                }}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="(D) Regras especiais">
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={adminLabelStyle}>Peças manuais (manualPieceNames)</span>
          <input
            className="input"
            value={draft.labelV5.manualPieceNames.join(", ")}
            onChange={(event) =>
              updateLabelV5({
                manualPieceNames: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder="SPURT_TRAS, ENCHIMENTO"
          />
        </label>
        <NumberField
          label="Espessura máx. sem orlar (mm)"
          value={draft.labelV5.noOrlarThickness_mm}
          min={0}
          max={30}
          onChange={(value) => updateLabelV5({ noOrlarThickness_mm: value })}
        />
      </Panel>
    </div>
  );
}
