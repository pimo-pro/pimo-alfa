import type { ReactNode } from "react";
import type { NestingV4EngineId } from "../../nesting-v4/rules/nestingV4Rules";
import type { LcaViewMode } from "../types";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

export type LcaTcnDisplayMode = "real" | "visual";
export type LcaCanvasMode = "2d" | "3d";

type Props = {
  projectName: string;
  kerfMm: number;
  marginMm: number;
  zoom: number;
  viewMode: LcaViewMode;
  engine: NestingV4EngineId;
  simulationOn: boolean;
  simSpeed: number;
  tcnDisplayMode: LcaTcnDisplayMode;
  canvasMode: LcaCanvasMode;
  realSimOn: boolean;
  busy?: boolean;
  onBackToProject: () => void;
  onGoNestingV4: () => void;
  onKerf: (v: number) => void;
  onMargin: (v: number) => void;
  onZoom: (v: number) => void;
  onViewMode: (v: LcaViewMode) => void;
  onEngine: (v: NestingV4EngineId) => void;
  onAutoLayout: () => void;
  onClear: () => void;
  onPdf: () => void;
  onTcnVisual: () => void;
  onTcnRealExport: () => void;
  onLabels: () => void;
  onGenerateAll: () => void;
  onImportProject: () => void;
  onToggleSimulation: () => void;
  onToggleRealSim: () => void;
  onSimSpeed: (v: number) => void;
  onTcnDisplayMode: (v: LcaTcnDisplayMode) => void;
  onCanvasMode: (v: LcaCanvasMode) => void;
};

export default function LcaTopBar(props: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderBottom: "1px solid var(--border,rgba(255,255,255,0.1))",
        background: "var(--blue-dark,#1e293b)",
        fontFamily: font,
        flexShrink: 0,
      }}
    >
      <Tool onClick={props.onBackToProject} c="#94a3b8">
        Voltar ao Projeto
      </Tool>
      <Tool onClick={props.onGoNestingV4} c="#60a5fa">
        Nesting V4
      </Tool>
      <Badge>{props.projectName}</Badge>

      <Sep />
      <Num label="Kerf" value={props.kerfMm} onChange={props.onKerf} />
      <Num label="Margem" value={props.marginMm} onChange={props.onMargin} />
      <Num label="Zoom" value={Math.round(props.zoom * 100)} min={20} max={300} step={5} onChange={(v) => props.onZoom(v / 100)} />

      <select
        value={props.viewMode}
        onChange={(e) => props.onViewMode(e.target.value as LcaViewMode)}
        className="input input-sm"
        title="Vista chapa"
        style={{ width: 110 }}
      >
        <option value="top">Vista topo</option>
        <option value="floor">Vista chão</option>
      </select>

      <select
        value={props.engine}
        onChange={(e) => props.onEngine(e.target.value as NestingV4EngineId)}
        className="input input-sm"
        title="Motor nesting"
        style={{ width: 150 }}
      >
        <option value="pro">Modo PRO</option>
        <option value="experimental">Modo Experimental</option>
        <option value="deepnest">Modo Deepnest</option>
      </select>

      <Sep />
      <Tool
        onClick={() => props.onTcnDisplayMode("real")}
        c={props.tcnDisplayMode === "real" ? "#34d399" : "#64748b"}
      >
        TCN Real
      </Tool>
      <Tool
        onClick={() => props.onTcnDisplayMode("visual")}
        c={props.tcnDisplayMode === "visual" ? "#fbbf24" : "#64748b"}
      >
        TCN Visual
      </Tool>
      <Tool onClick={() => props.onCanvasMode("2d")} c={props.canvasMode === "2d" ? "#38bdf8" : "#64748b"}>
        2D
      </Tool>
      <Tool onClick={() => props.onCanvasMode("3d")} c={props.canvasMode === "3d" ? "#38bdf8" : "#64748b"}>
        3D
      </Tool>

      <Sep />
      <Tool onClick={props.onAutoLayout} c="#34d399" disabled={props.busy}>
        Auto Layout (visual)
      </Tool>
      <Tool onClick={props.onClear} c="#f87171">
        Limpar
      </Tool>
      <Tool onClick={props.onPdf} c="#a78bfa">
        PDF (visual)
      </Tool>
      <Tool onClick={props.onTcnVisual} c="#fbbf24">
        TCN (visual)
      </Tool>
      <Tool onClick={props.onTcnRealExport} c="#4ade80">
        Exportar TCN Real
      </Tool>
      <Tool onClick={props.onLabels} c="#38bdf8">
        Etiquetas (visual)
      </Tool>
      <Tool onClick={props.onGenerateAll} c="#4ade80">
        Gerar Tudo (visual)
      </Tool>
      <Tool onClick={props.onImportProject} c="#94a3b8">
        Importar Projeto
      </Tool>

      <Sep />
      <Tool onClick={props.onToggleSimulation} c={props.simulationOn ? "#34d399" : "#64748b"}>
        Simulação CNC {props.simulationOn ? "ON" : "OFF"}
      </Tool>
      <Tool onClick={props.onToggleRealSim} c={props.realSimOn ? "#34d399" : "#64748b"}>
        Simulação CNC Real {props.realSimOn ? "ON" : "OFF"}
      </Tool>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted,#94a3b8)" }}>
        Vel.
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={props.simSpeed}
          onChange={(e) => props.onSimSpeed(Number(e.target.value))}
          style={{ width: 72 }}
        />
      </label>
    </div>
  );
}

function Tool({
  children,
  onClick,
  c,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  c: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 10px",
        borderRadius: 7,
        border: `1px solid ${c}44`,
        background: `${c}14`,
        color: c,
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: font,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-main,#e2e8f0)",
        padding: "4px 8px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.06)",
        maxWidth: 180,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 22, background: "var(--border,rgba(255,255,255,0.12))", margin: "0 2px" }} />;
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
    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted,#94a3b8)" }}>
      {props.label}
      <input
        type="number"
        className="input input-sm"
        value={Number.isFinite(props.value) ? props.value : 0}
        min={props.min}
        max={props.max}
        step={props.step ?? 0.5}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ width: 64 }}
      />
    </label>
  );
}
