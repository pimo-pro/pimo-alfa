import { useEffect, useMemo, useRef, useState } from "react";
import type { V4Piece, V4Placement, V4Sheet } from "../../nesting-v4/nestingV4Types";
import { rotateHoles } from "../../nesting-v4/nestingV4Engine";
import type { LcaRules } from "../rules/layoutCorteAlfaRules";
import type { LcaViewMode } from "../types";
import { buildVisualSimulation } from "../simulation/buildVisualToolpaths";

const font = "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

type Props = {
  sheet: V4Sheet;
  pieces: V4Piece[];
  placements: V4Placement[];
  kerfMm: number;
  marginMm: number;
  zoom: number;
  viewMode: LcaViewMode;
  selectedId: string | null;
  simulationOn: boolean;
  simSpeed: number;
  rules: LcaRules;
  showGrain: boolean;
  showWaste: boolean;
  onSelect: (id: string | null) => void;
};

export default function LcaCncCanvas(props: Props) {
  const {
    sheet,
    pieces,
    placements,
    kerfMm,
    marginMm,
    zoom,
    viewMode,
    selectedId,
    simulationOn,
    simSpeed,
    rules,
    showGrain,
    showWaste,
    onSelect,
  } = props;

  const sim = useMemo(
    () => buildVisualSimulation(sheet, pieces, placements, kerfMm, rules),
    [sheet, pieces, placements, kerfMm, rules]
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
      setProgress((p) => {
        const next = p + dt * simSpeed * 0.35;
        return next >= 1 ? 0 : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [simulationOn, simSpeed]);

  const W = sheet.widthMm;
  const H = sheet.heightMm;
  const pad = 48;
  const flipY = viewMode === "floor";
  const vbY = flipY ? 0 : -H;
  const scaleY = flipY ? 1 : -1;

  const totalOps = Math.max(1, sim.toolpaths.length);
  const visibleOps = simulationOn ? Math.max(1, Math.ceil(progress * totalOps)) : totalOps;

  const hatchId = `lca-hatch-${sheet.index}`;
  const hatchStep = rules.visualization.hatchStyle === "dense" ? 8 : rules.visualization.hatchStyle === "sparse" ? 18 : 12;

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--black,#050816)", position: "relative" }}>
      <svg
        width={W * zoom + pad * 2}
        height={H * zoom + pad * 2}
        viewBox={`${-pad} ${vbY - pad / zoom} ${W + (pad * 2) / zoom} ${H + (pad * 2) / zoom}`}
        style={{ display: "block", margin: "0 auto", cursor: "default", fontFamily: font }}
        onClick={() => onSelect(null)}
      >
        <defs>
          <pattern id={hatchId} width={hatchStep} height={hatchStep} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={hatchStep} stroke={rules.grain.yyColor} strokeWidth={1} />
          </pattern>
        </defs>

        <g transform={`scale(1,${scaleY})`}>
          {/* Chapa */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="#1a2332"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth={2 / zoom}
          />
          {/* Margem */}
          <rect
            x={marginMm}
            y={marginMm}
            width={Math.max(0, W - marginMm * 2)}
            height={Math.max(0, H - marginMm * 2)}
            fill="none"
            stroke="rgba(251,191,36,0.45)"
            strokeWidth={1 / zoom}
            strokeDasharray={`${6 / zoom} ${4 / zoom}`}
          />

          {showWaste && (
            <rect
              x={0}
              y={0}
              width={W}
              height={H}
              fill={`rgba(248,113,113,${rules.visualization.wasteOverlayOpacity})`}
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Peças */}
          {placements
            .filter((p) => p.sheetIndex === sheet.index)
            .map((pl) => {
              const piece = pieces.find((pc) => pc.id === pl.pieceId);
              if (!piece) return null;
              const rot90 = piece.rotation === 90 || piece.rotation === 270;
              const w = rot90 ? piece.heightMm : piece.widthMm;
              const h = rot90 ? piece.widthMm : piece.heightMm;
              const selected = selectedId === piece.id;
              const holes = rotateHoles(
                piece.originalHoles,
                rot90 ? 90 : 0,
                piece.widthMm,
                piece.heightMm
              );
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
                    opacity={showWaste ? 0.92 : 1}
                  />
                  {showGrain && rules.grain.showHatch && (
                    <rect x={0} y={0} width={w} height={h} fill={`url(#${hatchId})`} opacity={0.55} />
                  )}
                  {holes.map((hole, i) => (
                    <circle
                      key={i}
                      cx={hole.x}
                      cy={hole.y}
                      r={Math.max(hole.diameter / 2, 1.5)}
                      fill="none"
                      stroke={rules.visualization.drillColor}
                      strokeWidth={1.2 / zoom}
                    />
                  ))}
                  <text
                    x={4}
                    y={12}
                    fill="#0f172a"
                    fontSize={Math.max(9, 11 / zoom)}
                    fontFamily={font}
                    style={{ pointerEvents: "none" }}
                  >
                    {piece.name.slice(0, 18)}
                  </text>
                </g>
              );
            })}

          {/* Contornos kerf / toolpaths */}
          {sim.contours
            .filter((c) => c.kind === "kerf")
            .slice(0, simulationOn ? visibleOps : undefined)
            .map((c) => (
              <path
                key={`kerf-${c.pieceId}-${c.order}`}
                d={c.pathD}
                fill="none"
                stroke={rules.visualization.kerfColor}
                strokeWidth={1 / zoom}
                opacity={0.7}
              />
            ))}

          {sim.toolpaths.slice(0, visibleOps).map((tp) => {
            if (tp.kind === "contour" && tp.points.length > 1) {
              const d = tp.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.xMm} ${p.yMm}`).join(" ");
              return (
                <path
                  key={`tp-${tp.order}`}
                  d={d}
                  fill="none"
                  stroke={rules.visualization.pathColor}
                  strokeWidth={1.6 / zoom}
                  strokeDasharray={simulationOn ? `${8 / zoom} ${4 / zoom}` : undefined}
                  opacity={0.9}
                />
              );
            }
            if (tp.kind === "drill") {
              return tp.points.map((p, i) => (
                <circle
                  key={`dr-${tp.order}-${i}`}
                  cx={p.xMm}
                  cy={p.yMm}
                  r={3 / zoom}
                  fill={rules.visualization.drillColor}
                  opacity={0.85}
                />
              ));
            }
            return null;
          })}

          {/* Origem CNC canto superior direito + eixos */}
          {rules.simulation.showOriginMarker && (
            <g>
              <circle cx={W} cy={H} r={5 / zoom} fill="#f87171" />
              <text
                x={W - 8 / zoom}
                y={H - 8 / zoom}
                fill="#f87171"
                fontSize={10 / zoom}
                textAnchor="end"
                fontFamily={font}
              >
                ORIGEM CNC
              </text>
            </g>
          )}
          {rules.cncOrigin.showMachineAxes && (
            <g stroke="#94a3b8" strokeWidth={1.2 / zoom}>
              <line x1={W} y1={H} x2={W - 120} y2={H} markerEnd="url(#arrow)" />
              <line x1={W} y1={H} x2={W} y2={H - 120} />
              {rules.cncOrigin.labelAxes && (
                <>
                  <text x={W - 130} y={H - 6} fill="#94a3b8" fontSize={10 / zoom} fontFamily={font}>
                    X−
                  </text>
                  <text x={W + 4} y={H - 110} fill="#94a3b8" fontSize={10 / zoom} fontFamily={font}>
                    Y−
                  </text>
                  <text x={W + 6} y={H + 14} fill="#64748b" fontSize={9 / zoom} fontFamily={font}>
                    Z↑
                  </text>
                </>
              )}
            </g>
          )}

          {rules.simulation.showOperationOrder &&
            sim.contours
              .filter((c) => c.kind === "outer")
              .map((c, idx) => {
                const piece = pieces.find((p) => p.id === c.pieceId);
                const pl = placements.find((p) => p.pieceId === c.pieceId && p.sheetIndex === sheet.index);
                if (!piece || !pl) return null;
                return (
                  <text
                    key={`ord-${c.order}`}
                    x={pl.xMm + 4}
                    y={pl.yMm + 26}
                    fill="#38bdf8"
                    fontSize={10 / zoom}
                    fontFamily={font}
                  >
                    #{idx + 1}
                  </text>
                );
              })}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          fontSize: 10,
          color: "var(--text-muted,#94a3b8)",
          background: "rgba(15,23,42,0.75)",
          padding: "6px 8px",
          borderRadius: 6,
          fontFamily: font,
        }}
      >
        {W}×{H} mm · {viewMode === "top" ? "Vista topo" : "Vista chão"} ·{" "}
        {simulationOn ? `Simulação ${(progress * 100).toFixed(0)}%` : "Simulação OFF"}
      </div>
    </div>
  );
}
