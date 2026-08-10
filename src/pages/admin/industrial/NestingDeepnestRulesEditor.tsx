import { useState } from "react";
import {
  DEFAULT_DEEPNEST_RULES,
  loadDeepnestRules,
  saveDeepnestRules,
  type DeepnestRules,
} from "../../../nesting-v4/deepnestEngine/deepnestRules";
import { AdminStickyActionBar } from "../../../components/admin/AdminUi";

/**
 * Editor de regras do motor Deepnest (Nesting V4 — visual/análise).
 * Não altera writer TCN «mo» nem pipeline CNC de produção.
 */
export function NestingDeepnestRulesEditor() {
  const [draft, setDraft] = useState<DeepnestRules>(() => loadDeepnestRules());
  const [msg, setMsg] = useState<string | null>(null);

  const save = () => {
    const next = saveDeepnestRules(draft);
    setDraft(next);
    setMsg("Regras Nesting Deepnest guardadas.");
  };

  const reset = () => {
    setDraft({ ...DEFAULT_DEEPNEST_RULES });
    setMsg("Valores por omissão carregados (ainda não guardados).");
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <AdminStickyActionBar>
        <button type="button" className="button button-ghost button-sm" onClick={reset}>
          Restaurar defaults
        </button>
        <button type="button" className="button button-primary button-sm" onClick={save}>
          Guardar regras Deepnest
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

      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
        Motor visual baseado em algoritmos SVGnest/Deepnest (MIT): NFP rectangular, GA e SA. Não afecta o CNC
        nesting_mo.
      </p>

      <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
        <span style={{ color: "var(--text-muted)" }}>Modo de compactação</span>
        <select
          value={draft.mode}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              mode: e.target.value === "conservative" ? "conservative" : "aggressive",
            }))
          }
        >
          <option value="aggressive">Agressivo</option>
          <option value="conservative">Conservador</option>
        </select>
      </label>

      <label style={{ fontSize: 12, display: "grid", gap: 4 }}>
        <span style={{ color: "var(--text-muted)" }}>Limite de rotação</span>
        <select
          value={draft.rotationLimit}
          onChange={(e) =>
            setDraft((p) => ({
              ...p,
              rotationLimit: e.target.value === "free" ? "free" : "only90",
              rotations: e.target.value === "free" ? 4 : 2,
            }))
          }
        >
          <option value="only90">0° / 90° (CNC)</option>
          <option value="free">0° / 90° / 180° / 270° (visual)</option>
        </select>
      </label>

      <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Num label="População GA" value={draft.populationSize} min={3} step={1} onChange={(n) => setDraft((p) => ({ ...p, populationSize: n }))} />
        <Num label="Taxa mutação" value={draft.mutationRate} min={1} step={1} onChange={(n) => setDraft((p) => ({ ...p, mutationRate: n }))} />
        <Num label="Gerações" value={draft.generations} min={1} step={1} onChange={(n) => setDraft((p) => ({ ...p, generations: n }))} />
        <Num label="Amostras NFP/aresta" value={draft.nfpSamplesPerEdge} min={2} step={1} onChange={(n) => setDraft((p) => ({ ...p, nfpSamplesPerEdge: n }))} />
        <Num label="Margem (mm)" value={draft.marginMm} min={0} onChange={(n) => setDraft((p) => ({ ...p, marginMm: n }))} />
        <Num label="Kerf (mm)" value={draft.kerfMm} min={0} onChange={(n) => setDraft((p) => ({ ...p, kerfMm: n }))} />
        <Num label="Padding colisão (mm)" value={draft.collisionPaddingMm} min={0} onChange={(n) => setDraft((p) => ({ ...p, collisionPaddingMm: n }))} />
        <Num label="Seed" value={draft.seed} step={1} onChange={(n) => setDraft((p) => ({ ...p, seed: n }))} />
      </div>

      <fieldset style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontSize: 12 }}>Simulated Annealing</legend>
        <Check
          label="Activar SA após GA"
          checked={draft.enableSa}
          onChange={(v) => setDraft((p) => ({ ...p, enableSa: v }))}
        />
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 8 }}>
          <Num label="Iterações SA" value={draft.saIterations} min={0} step={1} onChange={(n) => setDraft((p) => ({ ...p, saIterations: n }))} />
          <Num label="Temperatura inicial" value={draft.saInitialTemperature} min={0.01} step={0.1} onChange={(n) => setDraft((p) => ({ ...p, saInitialTemperature: n }))} />
          <Num label="Cooling rate" value={draft.saCoolingRate} min={0.8} max={0.999} step={0.001} onChange={(n) => setDraft((p) => ({ ...p, saCoolingRate: n }))} />
        </div>
      </fieldset>

      <Check
        label="Respeitar grain YY / lockWoodGrain"
        checked={draft.respectGrainLock}
        onChange={(v) => setDraft((p) => ({ ...p, respectGrainLock: v }))}
      />
    </div>
  );
}

function Num(props: {
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

function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}
