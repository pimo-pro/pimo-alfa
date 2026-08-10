import type { CSSProperties, ReactNode } from "react";
import type { V4Piece, V4Placement } from "../../nesting-v4/nestingV4Types";
import type { LcaSimulationStats, LcaVisualContour, LcaVisualHole } from "../types";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const muted = "var(--text-muted,#94a3b8)";
const text = "var(--text-main,#e2e8f0)";

type Props = {
  pieces: V4Piece[];
  placements: V4Placement[];
  sheetIndex: number;
  holes: LcaVisualHole[];
  contours: LcaVisualContour[];
  stats: LcaSimulationStats;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showWaste: boolean;
  showUtilization: boolean;
};

function fmtSec(s: number): string {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m} min ${r.toFixed(0)} s`;
}

export default function LcaBottomPanel(props: Props) {
  const placed = props.placements
    .filter((p) => p.sheetIndex === props.sheetIndex)
    .map((p) => props.pieces.find((pc) => pc.id === p.pieceId))
    .filter((p): p is V4Piece => p != null);

  const outer = props.contours.filter((c) => c.kind === "outer");

  return (
    <div
      style={{
        borderTop: "1px solid var(--border,rgba(255,255,255,0.1))",
        background: "var(--blue-dark,#1e293b)",
        fontFamily: font,
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr 1.1fr",
        gap: 8,
        padding: "8px 10px",
        maxHeight: 160,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Col title={`Peças colocadas (${placed.length})`}>
        <ul style={listStyle}>
          {placed.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => props.onSelect(p.id)} style={itemBtn(props.selectedId === p.id)}>
                {p.name} · {p.widthMm}×{p.heightMm} · {p.rotation}°
              </button>
            </li>
          ))}
          {placed.length === 0 && <li style={{ color: muted, fontSize: 11 }}>Nenhuma</li>}
        </ul>
      </Col>

      <Col title={`Furos (${props.holes.length})`}>
        <ul style={listStyle}>
          {props.holes.slice(0, 40).map((h, i) => (
            <li key={`${h.pieceId}-${i}`} style={{ fontSize: 11, color: text }}>
              Ø{h.diameterMm} · {h.holeType || "furo"} · ({h.xMm.toFixed(0)},{h.yMm.toFixed(0)})
            </li>
          ))}
          {props.holes.length === 0 && <li style={{ color: muted, fontSize: 11 }}>Nenhum</li>}
        </ul>
      </Col>

      <Col title={`Contornos (${outer.length})`}>
        <ul style={listStyle}>
          {outer.map((c) => (
            <li key={`${c.pieceId}-${c.order}`} style={{ fontSize: 11, color: text }}>
              #{c.order} · {c.pieceId.slice(0, 12)} · outer
            </li>
          ))}
          {outer.length === 0 && <li style={{ color: muted, fontSize: 11 }}>Nenhum</li>}
        </ul>
      </Col>

      <Col title="Estatísticas (visual)">
        <div style={{ display: "grid", gap: 4, fontSize: 11, color: text }}>
          {props.showUtilization && <div>Utilização: {props.stats.utilizationPercent.toFixed(1)}%</div>}
          {props.showWaste && <div>Desperdício: {props.stats.wastePercent.toFixed(1)}%</div>}
          <div>Peças: {props.stats.pieceCount}</div>
          <div>Furos: {props.stats.holeCount}</div>
          <div>Tempo corte (est.): {fmtSec(props.stats.cutTimeSec)}</div>
          <div>Tempo furação (est.): {fmtSec(props.stats.drillTimeSec)}</div>
        </div>
      </Col>
    </div>
  );
}

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: muted,
          marginBottom: 4,
          flexShrink: 0,
        }}
      >
        {title}
      </div>
      <div style={{ overflowY: "auto", minHeight: 0 }}>{children}</div>
    </div>
  );
}

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 2,
};

function itemBtn(active: boolean): CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    background: active ? "rgba(59,130,246,0.18)" : "transparent",
    border: "none",
    color: text,
    fontSize: 11,
    padding: "3px 4px",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: font,
  };
}
