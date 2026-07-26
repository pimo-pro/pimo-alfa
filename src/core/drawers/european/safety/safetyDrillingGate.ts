/**
 * safetyDrillingGate.ts  Bloqueia furos industriais invlidos.
 */

import type { DrawerGeometry, EuropeanDrawerHole } from "../types";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

/** Margem: bloquear s claramente fora (coordenada negativa ou alm da pea). */
const EDGE_FORBIDDEN_MM = -0.5;

function pieceBounds(
  geometry: DrawerGeometry | undefined,
  pieceRef: string
): { w: number; h: number } | null {
  if (!geometry) return null;
  const ref = pieceRef.toLowerCase();
  // Apenas frente/fundo (furos gerados localmente). Laterais/costa/mdulo: eixos Modelo A  no forar.
  if (ref.includes("fren") || ref === "front") {
    return { w: geometry.front.widthMm, h: geometry.front.heightMm };
  }
  if (ref.includes("fun") || ref === "bottom") {
    return { w: geometry.bottom.depthMm, h: geometry.bottom.widthMm };
  }
  return null;
}

/**
 * Gate de furacao: /profundidade, NaN, fora da peca, zonas proibidas.
 */
export function runSafetyDrillingGate(
  holes: EuropeanDrawerHole[],
  geometry?: DrawerGeometry
): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  holes.forEach((h, idx) => {
    const tag = h.pieceRef || `hole#${idx}`;

    if (![h.x, h.y, h.z].every((n) => Number.isFinite(n))) {
      errors.push(issue("drilling", "error", "HOLE_NAN", `Coordenadas NaN/Inf`, tag));
    }
    if (!Number.isFinite(h.diameter) || h.diameter < 0) {
      errors.push(
        issue("drilling", "error", "HOLE_DIA_INVALID", `Diametro NaN/negativo: ${h.diameter}`, tag)
      );
    } else if (h.diameter === 0) {
      // Alguns furos Modelo A / marcadores industriais emitem Ø=0 — aviso, nao bloqueio
      warnings.push(
        issue("drilling", "warning", "HOLE_DIA_ZERO", `Diametro 0 (marcador)`, tag)
      );
    }
    if (!Number.isFinite(h.depth) || h.depth < 0) {
      errors.push(
        issue("drilling", "error", "HOLE_DEPTH_INVALID", `Profundidade NaN/negativa: ${h.depth}`, tag)
      );
    } else if (h.depth === 0) {
      warnings.push(
        issue("drilling", "warning", "HOLE_DEPTH_ZERO", `Profundidade 0 (marcador)`, tag)
      );
    }

    const bounds = pieceBounds(geometry, h.pieceRef);
    if (bounds && Number.isFinite(h.x) && Number.isFinite(h.y)) {
      if (
        h.x < EDGE_FORBIDDEN_MM ||
        h.y < EDGE_FORBIDDEN_MM ||
        h.x > bounds.w - EDGE_FORBIDDEN_MM ||
        h.y > bounds.h - EDGE_FORBIDDEN_MM
      ) {
        errors.push(
          issue(
            "drilling",
            "error",
            "HOLE_OUTSIDE_PIECE",
            `Furo fora da peca (${h.x},${h.y}) bounds ${bounds.w}x${bounds.h}`,
            tag
          )
        );
      }
    }

    if (geometry && h.diameter > 0) {
      const maxDia = Math.max(
        geometry.front.thicknessMm,
        geometry.bottom.thicknessMm,
        geometry.leftSide.thicknessMm,
        50
      );
      if (h.diameter > maxDia * 2) {
        errors.push(
          issue(
            "drilling",
            "error",
            "HOLE_FORBIDDEN_ZONE",
            `Diametro ${h.diameter} mm em zona/tamanho proibido`,
            tag
          )
        );
      }
    }
  });

  return finalizeGate("drilling", t0, errors, warnings);
}
