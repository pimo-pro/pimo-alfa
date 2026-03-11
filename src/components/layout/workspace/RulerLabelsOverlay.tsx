/**
 * Overlay 2D para labels e linhas da régua: medição manual (ponto↔ponto) e automáticas
 * com regras 500 mm (horizontal), 200 mm (front/back, ceiling). Valores em mm, inteiro, sem unidade.
 */

import * as THREE from "three";
import type { RulerManagerResult, RulerManagerMeasurement } from "../../../3d/viewer-engine/ruler";

const LABEL_STYLE: React.CSSProperties = {
  position: "absolute" as const,
  transform: "translate(-50%, -50%)",
  padding: "4px 8px",
  fontSize: 12,
  lineHeight: 1.2,
  fontFamily: "var(--font-sans, system-ui, sans-serif)",
  color: "#fff",
  background: "rgba(0, 0, 0, 0.65)",
  borderRadius: 4,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: 10,
};

const LINE_COLOR = "#fff";
const LINE_STROKE_WIDTH = 2;

const HORIZONTAL_THRESHOLD_MM = 500;
const FRONT_BACK_CEILING_THRESHOLD_MM = 200;

const SNAP_HIGHLIGHT_COLOR = "#00ffff";

export type RulerLabelsOverlayProps = {
  rulerEnabled: boolean;
  rulerMeasurements: RulerManagerResult;
  /** Medição manual (anchor ↔ hover); quando definida, exibe apenas esta e ignora as automáticas. */
  manualMeasurement: RulerManagerMeasurement | null;
  /** Medição interna (A↔B dentro do box); quando definida, exibe apenas esta e ignora as restantes. */
  internalMeasurement: { pointA: THREE.Vector3; pointB: THREE.Vector3; distanceMm: number } | null;
  /** Ponto de snap no hover (highlight ciano); em coordenadas mundo. */
  hoverSnapPoint: THREE.Vector3 | null;
  projectWorldToScreen: (worldPoint: THREE.Vector3) => { x: number; y: number } | null;
};

/** Aplica regras de exibição e devolve a lista de medições a mostrar. */
function getDisplayableMeasurements(
  m: RulerManagerResult
): RulerManagerMeasurement[] {
  const out: RulerManagerMeasurement[] = [];

  const left = m.horizontalLeft;
  const right = m.horizontalRight;
  const leftOk = left && left.distanceMm < HORIZONTAL_THRESHOLD_MM;
  const rightOk = right && right.distanceMm < HORIZONTAL_THRESHOLD_MM;
  if (leftOk && rightOk) {
    out.push(left!, right!);
  } else if (leftOk) {
    out.push(left!);
  } else if (rightOk) {
    out.push(right!);
  } else if (left && right) {
    out.push(left.distanceMm <= right.distanceMm ? left : right);
  } else if (left) out.push(left);
  else if (right) out.push(right);

  if (m.front && m.front.distanceMm < FRONT_BACK_CEILING_THRESHOLD_MM) out.push(m.front);
  if (m.back && m.back.distanceMm < FRONT_BACK_CEILING_THRESHOLD_MM) out.push(m.back);
  if (m.floor && m.floor.distanceMm > 0) out.push(m.floor);
  if (m.ceiling && m.ceiling.distanceMm < FRONT_BACK_CEILING_THRESHOLD_MM) out.push(m.ceiling);

  return out;
}

export default function RulerLabelsOverlay({
  rulerEnabled,
  rulerMeasurements,
  manualMeasurement,
  internalMeasurement,
  hoverSnapPoint,
  projectWorldToScreen,
}: RulerLabelsOverlayProps) {
  if (!rulerEnabled) return null;

  const measurements: RulerManagerMeasurement[] = internalMeasurement
    ? [{ pointA: internalMeasurement.pointA, pointB: internalMeasurement.pointB, distanceMm: internalMeasurement.distanceMm }]
    : manualMeasurement
      ? [manualMeasurement]
      : getDisplayableMeasurements(rulerMeasurements);

  const items: { left: number; top: number; text: string; x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const mm of measurements) {
    const mid = new THREE.Vector3()
      .addVectors(mm.pointA, mm.pointB)
      .multiplyScalar(0.5);
    const screenMid = projectWorldToScreen(mid);
    const screenA = projectWorldToScreen(mm.pointA);
    const screenB = projectWorldToScreen(mm.pointB);
    if (screenMid && screenA && screenB) {
      items.push({
        left: screenMid.x,
        top: screenMid.y,
        text: String(mm.distanceMm),
        x1: screenA.x,
        y1: screenA.y,
        x2: screenB.x,
        y2: screenB.y,
      });
    }
  }

  const snapScreen = hoverSnapPoint ? projectWorldToScreen(hoverSnapPoint) : null;

  return (
    <>
      {snapScreen && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: snapScreen.x,
            top: snapScreen.y,
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: SNAP_HIGHLIGHT_COLOR,
            pointerEvents: "none",
            zIndex: 11,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
          }}
        />
      )}
      {(items.length > 0 || snapScreen) && (
        <>
          {items.length > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 9,
              }}
              aria-hidden
            >
              {items.map((item, i) => (
                <line
                  key={`line-${i}`}
                  x1={item.x1}
                  y1={item.y1}
                  x2={item.x2}
                  y2={item.y2}
                  stroke={LINE_COLOR}
                  strokeWidth={LINE_STROKE_WIDTH}
                />
              ))}
            </svg>
          )}
          {items.map((label, i) => (
            <div
              key={i}
              aria-hidden
              style={{
                ...LABEL_STYLE,
                left: label.left,
                top: label.top,
              }}
            >
              {label.text}
            </div>
          ))}
        </>
      )}
    </>
  );
}
