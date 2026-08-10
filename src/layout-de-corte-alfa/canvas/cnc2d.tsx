/**
 * Canvas CNC 2D — trajetórias reais parseadas do TCN nesting_mo.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { V4Piece, V4Placement, V4Sheet } from "../../nesting-v4/nestingV4Types";
import type { LcaTcnRules } from "../rules/layoutCorteAlfaTcnRules";
import type { ParsedTcnPanel } from "../engines/parseTcnMoPaths";
import { buildVisualSimulation } from "../simulation/buildVisualToolpaths";
import { loadLcaRules } from "../rules/layoutCorteAlfaRules";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

export type Cnc2dProps = {
  sheet: V4Sheet;
  pieces: V4Piece[];
  placements: V4Placement[];
  kerfMm: number;
  marginMm: number;
  zoom: number;
  viewMode?: "top" | "floor";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Modo: real = TCN parseado; visual = heurística Alfa. */
  tcnMode: "real" | "visual";
  parsedPanel: ParsedTcnPanel | null;
  simulationOn: boolean;
  simSpeed: number;
  tcnRules: LcaTcnRules;
  showGrain: boolean;
};

export default function Cnc2dCanvas(props: Cnc2dProps) {
  const {
    sheet,
    pieces,
    placements,
    kerfMm,
    marginMm,
    zoom,
    viewMode = "top",
    selectedId,
    onSelect,
    tcnMode,
    parsedPanel,
    simulationOn,
    simSpeed,
    tcnRules,
    showGrain,
  } = props;

  const vizRules = useMemo(() => loadLcaRules(), []);
  const visual = useMemo(
    () => buildVisualSimulation(sheet, pieces, placements, kerfMm, vizRules),
    [sheet, pieces, placements, kerfMm, vizRules]
  );

  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!simulationOn) {
      setProgress(0);
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const speed = simSpeed * (tcnRules.display.simulationSpeed || 0.5);
      setProgress((p) => {
        const next = p + dt * speed * 0.4;
        return next >= 1 ? 0 : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [simulationOn, simSpeed, tcnRules.display.simulationSpeed]);

  const W = sheet.widthMm;
  const H = sheet.heightMm;
  const pad = 48;
  void viewMode;
  const realPoints = parsedPanel?.points ?? [];
  const visibleCount = simulationOn
    ? Math.max(1, Math.ceil(progress * Math.max(1, realPoints.length)))
    : realPoints.length;

  const lw = tcnRules.display.lineWidthPx;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#050816", position: "relative" }}>
      <svg
        width={W * zoom + pad * 2}
        height={H * zoom + pad * 2}
        viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`}
        style={{ display: "block", margin: "0 auto", fontFamily: font }}
        onClick={() => onSelect(null)}
      >
        <rect x={0} y={0} width={W} height={H} fill="#1a2332" stroke="rgba(148,163,184,0.55)" strokeWidth={2 / zoom} />
        <rect
          x={marginMm}
          y={marginMm}
          width={Math.max(0, W - marginMm * 2)}
          height={Math.max(0, H - marginMm * 2)}
          fill="none"
          stroke="rgba(251,191,36,0.4)"
          strokeWidth={1 / zoom}
          strokeDasharray={`${6 / zoom} ${4 / zoom}`}
        />

        {/* Peças (layout V4 — referencial canvas TL) */}
        {placements
          .filter((p) => p.sheetIndex === sheet.index)
          .map((pl) => {
            const piece = pieces.find((pc) => pc.id === pl.pieceId);
            if (!piece) return null;
            const rot90 = piece.rotation === 90 || piece.rotation === 270;
            const w = rot90 ? piece.heightMm : piece.widthMm;
            const h = rot90 ? piece.widthMm : piece.heightMm;
            const selected = selectedId === piece.id;
            return (
              <g
                key={piece.id}
                transform={`translate(${pl.xMm},${pl.yMm})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(piece.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={0}
                  y={0}
                  width={w}
                  height={h}
                  fill={piece.color}
                  stroke={selected ? "#3b82f6" : "rgba(15,23,42,0.7)"}
                  strokeWidth={(selected ? 2.5 : 1) / zoom}
                  opacity={0.85}
                />
                {showGrain && tcnRules.grain.showGrainOnPieces && (
                  <rect x={0} y={0} width={w} height={h} fill="url(#none)" opacity={0.2} />
                )}
                <text x={4} y={14} fill="#0f172a" fontSize={Math.max(9, 11 / zoom)} fontFamily={font}>
                  {piece.name.slice(0, 16)}
                </text>
              </g>
            );
          })}

        {tcnMode === "visual" &&
          visual.toolpaths.map((tp, idx) => {
            if (tp.kind !== "contour" || tp.points.length < 2) return null;
            const d = tp.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.xMm} ${p.yMm}`).join(" ");
            return (
              <path
                key={`v-${idx}`}
                d={d}
                fill="none"
                stroke={tcnRules.display.pathColor}
                strokeWidth={lw / zoom}
                opacity={0.75}
              />
            );
          })}

        {tcnMode === "real" && realPoints.length > 0 && (
          <g>
            {/* Nota: coordenadas TCN «mo» usam referencial máquina (BL/origem); overlay relativo. */}
            {realPoints.slice(0, visibleCount).map((p, i) => {
              const prev = realPoints[i - 1];
              if (!prev) {
                return (
                  <circle
                    key={`rp-${i}`}
                    cx={p.x}
                    cy={H - p.y}
                    r={(p.kind === "drill" ? 3 : 2) / zoom}
                    fill={p.kind === "drill" ? tcnRules.display.drillColor : tcnRules.display.pathColor}
                  />
                );
              }
              const isZ = Math.abs(p.z - prev.z) > 0.05 && Math.hypot(p.x - prev.x, p.y - prev.y) < 0.5;
              if (isZ && !tcnRules.motion.showZMoves) return null;
              const color = isZ
                ? tcnRules.display.zMoveColor
                : p.kind === "drill"
                  ? tcnRules.display.drillColor
                  : p.feed
                    ? tcnRules.display.pathColor
                    : tcnRules.display.rapidColor;
              const width = isZ ? lw * 0.7 : p.feed ? lw : lw * 0.9;
              return (
                <line
                  key={`rl-${i}`}
                  x1={prev.x}
                  y1={H - prev.y}
                  x2={p.x}
                  y2={H - p.y}
                  stroke={color}
                  strokeWidth={width / zoom}
                  opacity={0.9}
                />
              );
            })}
            {parsedPanel?.drills.map((d, i) => (
              <circle
                key={`dr-${i}`}
                cx={d.x}
                cy={H - d.y}
                r={Math.max((d.diameter ?? 5) / 2, 2) / zoom}
                fill="none"
                stroke={tcnRules.display.drillColor}
                strokeWidth={1.4 / zoom}
              />
            ))}
          </g>
        )}

        {/* Origem CNC canto superior direito (simulação / máquina) */}
        <circle cx={W} cy={0} r={5 / zoom} fill="#f87171" />
        <text x={W - 8 / zoom} y={14 / zoom} fill="#f87171" fontSize={10 / zoom} textAnchor="end" fontFamily={font}>
          ORIGEM CNC
        </text>
        <line x1={W} y1={0} x2={W - 100} y2={0} stroke="#94a3b8" strokeWidth={1.2 / zoom} />
        <line x1={W} y1={0} x2={W} y2={100} stroke="#94a3b8" strokeWidth={1.2 / zoom} />
        <text x={W - 110} y={-4} fill="#94a3b8" fontSize={10 / zoom} fontFamily={font}>
          X−
        </text>
        <text x={W + 4} y={90} fill="#94a3b8" fontSize={10 / zoom} fontFamily={font}>
          Y−
        </text>

        {tcnRules.motion.showFeedrate && tcnMode === "real" && (
          <text x={8} y={H - 8} fill="#94a3b8" fontSize={10 / zoom} fontFamily={font}>
            Feed ref. {tcnRules.motion.defaultFeedMmPerMin} mm/min · Z-safe {tcnRules.motion.zSafeMm} mm
          </text>
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          fontSize: 10,
          color: "#94a3b8",
          background: "rgba(15,23,42,0.8)",
          padding: "6px 8px",
          borderRadius: 6,
          fontFamily: font,
        }}
      >
        2D · {tcnMode === "real" ? "TCN Real (mo)" : "TCN Visual"} ·{" "}
        {simulationOn ? `${(progress * 100).toFixed(0)}%` : "sim OFF"}
        {parsedPanel ? ` · ${parsedPanel.points.length} pts` : ""}
      </div>
    </div>
  );
}
