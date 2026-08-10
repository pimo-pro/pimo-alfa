import { useState } from "react";
import {
  DEFAULT_NESTING_V4_RULES,
  loadNestingV4Rules,
  saveNestingV4Rules,
  type NestingV4Rules,
} from "../../../nesting-v4/rules/nestingV4Rules";
import { AdminStickyActionBar } from "../../../components/admin/AdminUi";

/**
 * Editor de regras Nesting V4 no hub industrial.
 * Não altera CNC «mo» — só a estação visual/análise.
 */
export function NestingV4RulesEditor() {
  const [draft, setDraft] = useState<NestingV4Rules>(() => loadNestingV4Rules());
  const [msg, setMsg] = useState<string | null>(null);

  const save = () => {
    const next = saveNestingV4Rules(draft);
    setDraft(next);
    setMsg("Regras Nesting V4 guardadas.");
  };

  const reset = () => {
    setDraft({ ...DEFAULT_NESTING_V4_RULES });
    setMsg("Valores por omissão carregados (ainda não guardados).");
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <AdminStickyActionBar>
        <button type="button" className="button button-ghost button-sm" onClick={reset}>
          Restaurar defaults
        </button>
        <button type="button" className="button button-primary button-sm" onClick={save}>
          Guardar regras V4
        </button>
      </AdminStickyActionBar>
      {msg ? (
        <div
          style={{
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

      <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
        <span style={{ color: "var(--text-muted)" }}>Motor por omissão</span>
        <select
          value={draft.defaultEngine}
          onChange={(e) => {
            const v = e.target.value;
            setDraft((p) => ({
              ...p,
              defaultEngine: v === "pro" ? "pro" : v === "deepnest" ? "deepnest" : "experimental",
            }));
          }}
        >
          <option value="pro">Nesting PRO</option>
          <option value="experimental">Nesting Experimental</option>
          <option value="deepnest">Nesting Deepnest</option>
        </select>
      </label>

      <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Num label="Margem (mm)" value={draft.marginMm} onChange={(n) => setDraft((p) => ({ ...p, marginMm: n }))} />
        <Num label="Kerf (mm)" value={draft.kerfMm} onChange={(n) => setDraft((p) => ({ ...p, kerfMm: n }))} />
        <Num
          label="Utilização mín. compactação"
          value={draft.compaction.minUtilizationPercent}
          step={0.01}
          onChange={(n) =>
            setDraft((p) => ({ ...p, compaction: { ...p.compaction, minUtilizationPercent: n } }))
          }
        />
      </div>

      <fieldset style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontSize: 12 }}>Rotação</legend>
        <Check
          label="Permitir 0°/90°"
          checked={draft.rotation.allow90}
          onChange={(v) => setDraft((p) => ({ ...p, rotation: { ...p.rotation, allow90: v } }))}
        />
        <Check
          label="Preferir scoring agressivo"
          checked={draft.rotation.preferAggressive}
          onChange={(v) => setDraft((p) => ({ ...p, rotation: { ...p.rotation, preferAggressive: v } }))}
        />
        <Check
          label="Respeitar grain YY / lock"
          checked={draft.rotation.respectGrainLock}
          onChange={(v) => setDraft((p) => ({ ...p, rotation: { ...p.rotation, respectGrainLock: v } }))}
        />
      </fieldset>

      <fieldset style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontSize: 12 }}>Distribuição / prioridade</legend>
        <label style={{ fontSize: 12, display: "grid", gap: 4, marginBottom: 8 }}>
          <span style={{ color: "var(--text-muted)" }}>Prioridade</span>
          <select
            value={draft.distribution.priorityMode}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                distribution: {
                  ...p.distribution,
                  priorityMode: e.target.value as NestingV4Rules["distribution"]["priorityMode"],
                },
              }))
            }
          >
            <option value="sheets">Menos folhas</option>
            <option value="waste">Menos sobras</option>
            <option value="balanced">Balanceado</option>
          </select>
        </label>
        <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
          <span style={{ color: "var(--text-muted)" }}>Ordenação de peças</span>
          <select
            value={draft.piecePriority.sortMode}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                piecePriority: {
                  sortMode: e.target.value as NestingV4Rules["piecePriority"]["sortMode"],
                },
              }))
            }
          >
            <option value="area_desc">Área ↓</option>
            <option value="width_desc">Largura ↓</option>
            <option value="height_desc">Altura ↓</option>
          </select>
        </label>
        <Check
          label="Agrupar só por espessura"
          checked={draft.distribution.groupByThicknessOnly}
          onChange={(v) =>
            setDraft((p) => ({ ...p, distribution: { ...p.distribution, groupByThicknessOnly: v } }))
          }
        />
      </fieldset>

      <fieldset style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontSize: 12 }}>Veio / visualização</legend>
        <Check
          label="Bloquear YY"
          checked={draft.grain.lockYy}
          onChange={(v) => setDraft((p) => ({ ...p, grain: { ...p.grain, lockYy: v } }))}
        />
        <Check
          label="Mostrar hachura de veio"
          checked={draft.grain.showHatch}
          onChange={(v) => setDraft((p) => ({ ...p, grain: { ...p.grain, showHatch: v } }))}
        />
        <Check
          label="Mostrar desperdício"
          checked={draft.compaction.showWasteOverlay}
          onChange={(v) =>
            setDraft((p) => ({ ...p, compaction: { ...p.compaction, showWasteOverlay: v } }))
          }
        />
      </fieldset>
    </div>
  );
}

function Num(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{props.label}</span>
      <input
        type="number"
        step={props.step ?? 0.1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ padding: "6px 8px", borderRadius: 6 }}
      />
    </label>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}
