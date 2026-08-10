import { useState } from "react";
import {
  DEFAULT_LCA_RULES,
  loadLcaRules,
  saveLcaRules,
  type LcaRules,
} from "../../../layout-de-corte-alfa/rules/layoutCorteAlfaRules";
import {
  DEFAULT_LCA_TCN_RULES,
  loadLcaTcnRules,
  saveLcaTcnRules,
  type LcaTcnRules,
} from "../../../layout-de-corte-alfa/rules/layoutCorteAlfaTcnRules";
import { AdminStickyActionBar } from "../../../components/admin/AdminUi";

/**
 * Editor de regras Layout de Corte Alfa (simulação + TCN real viz).
 * Não altera writer «mo» nem pipeline CNC de produção.
 */
export function LayoutCorteAlfaRulesEditor() {
  const [draft, setDraft] = useState<LcaRules>(() => loadLcaRules());
  const [tcn, setTcn] = useState<LcaTcnRules>(() => loadLcaTcnRules());
  const [msg, setMsg] = useState<string | null>(null);

  const save = () => {
    setDraft(saveLcaRules(draft));
    setTcn(saveLcaTcnRules(tcn));
    setMsg("Regras Layout de Corte Alfa (visual + TCN) guardadas.");
  };

  const reset = () => {
    setDraft(structuredClone(DEFAULT_LCA_RULES));
    setTcn(structuredClone(DEFAULT_LCA_TCN_RULES));
    setMsg("Valores por omissão carregados (ainda não guardados).");
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      <AdminStickyActionBar>
        <button type="button" className="button button-ghost button-sm" onClick={reset}>
          Restaurar defaults
        </button>
        <button type="button" className="button button-primary button-sm" onClick={save}>
          Guardar regras Alfa
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
        Estação /layout_de_corte_alfa. TCN real usa writer nesting_mo via export SSOT (sem alterar o writer).
      </p>

      <fieldset style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontSize: 12 }}>TCN Real — visualização 2D/3D</legend>
        <label style={{ fontSize: 12, display: "grid", gap: 4, marginBottom: 8 }}>
          <span style={{ color: "var(--text-muted)" }}>Modo canvas default</span>
          <select
            value={tcn.display.defaultView}
            onChange={(e) =>
              setTcn((p) => ({
                ...p,
                display: { ...p.display, defaultView: e.target.value === "3d" ? "3d" : "2d" },
              }))
            }
          >
            <option value="2d">2D</option>
            <option value="3d">3D</option>
          </select>
        </label>
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Num
            label="Velocidade simulação"
            value={tcn.display.simulationSpeed}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(n) => setTcn((p) => ({ ...p, display: { ...p.display, simulationSpeed: n } }))}
          />
          <Num
            label="Espessura linhas"
            value={tcn.display.lineWidthPx}
            min={0.5}
            max={6}
            step={0.1}
            onChange={(n) => setTcn((p) => ({ ...p, display: { ...p.display, lineWidthPx: n } }))}
          />
          <Color
            label="Cor trajetórias"
            value={tcn.display.pathColor}
            onChange={(v) => setTcn((p) => ({ ...p, display: { ...p.display, pathColor: v } }))}
          />
          <Color
            label="Cor Z-moves"
            value={tcn.display.zMoveColor}
            onChange={(v) => setTcn((p) => ({ ...p, display: { ...p.display, zMoveColor: v } }))}
          />
        </div>
        <Check
          label="Exibir Z-moves"
          checked={tcn.motion.showZMoves}
          onChange={(v) => setTcn((p) => ({ ...p, motion: { ...p.motion, showZMoves: v } }))}
        />
        <Check
          label="Exibir feedrate"
          checked={tcn.motion.showFeedrate}
          onChange={(v) => setTcn((p) => ({ ...p, motion: { ...p.motion, showFeedrate: v } }))}
        />
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 8 }}>
          <Num
            label="Feed default (mm/min)"
            value={tcn.motion.defaultFeedMmPerMin}
            min={100}
            step={100}
            onChange={(n) => setTcn((p) => ({ ...p, motion: { ...p.motion, defaultFeedMmPerMin: n } }))}
          />
          <Num
            label="Spindle (rpm)"
            value={tcn.motion.spindleRpm}
            min={1000}
            step={500}
            onChange={(n) => setTcn((p) => ({ ...p, motion: { ...p.motion, spindleRpm: n } }))}
          />
          <Num
            label="Z-safe (mm)"
            value={tcn.motion.zSafeMm}
            min={1}
            step={1}
            onChange={(n) => setTcn((p) => ({ ...p, motion: { ...p.motion, zSafeMm: n } }))}
          />
          <Num
            label="Kerf preferido (mm)"
            value={tcn.kerf.preferredKerfMm}
            min={0}
            step={0.5}
            onChange={(n) => setTcn((p) => ({ ...p, kerf: { ...p.kerf, preferredKerfMm: n } }))}
          />
          <Num
            label="Profundidade furo default"
            value={tcn.drilling.defaultDepthMm}
            min={0.1}
            step={0.5}
            onChange={(n) => setTcn((p) => ({ ...p, drilling: { ...p.drilling, defaultDepthMm: n } }))}
          />
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
        <legend style={{ fontSize: 12 }}>Simulação visual (legado Alfa)</legend>
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Num
            label="Velocidade visual default"
            value={draft.simulation.defaultSpeed}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(n) => setDraft((p) => ({ ...p, simulation: { ...p.simulation, defaultSpeed: n } }))}
          />
        </div>
        <Check
          label="Mostrar ordem de operações"
          checked={draft.simulation.showOperationOrder}
          onChange={(v) => setDraft((p) => ({ ...p, simulation: { ...p.simulation, showOperationOrder: v } }))}
        />
        <Check
          label="Mostrar gizmo de eixos"
          checked={draft.simulation.showAxisGizmo}
          onChange={(v) => setDraft((p) => ({ ...p, simulation: { ...p.simulation, showAxisGizmo: v } }))}
        />
        <Check
          label="Mostrar marcador de origem"
          checked={draft.simulation.showOriginMarker}
          onChange={(v) => setDraft((p) => ({ ...p, simulation: { ...p.simulation, showOriginMarker: v } }))}
        />
      </fieldset>
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

function Color(props: { label: string; value: string; onChange: (v: string) => void }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(props.value);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{props.label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        {isHex ? (
          <input type="color" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
        ) : null}
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 6 }}
        />
      </div>
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
