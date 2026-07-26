/**
 * safetyViewerGate.ts — Bloqueia dados de viewer inválidos.
 */

import type { EuropeanDrawerViewerData } from "../types";
import { runSafetyGeometryGate } from "./safetyGeometryGate";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

/**
 * Gate de viewer: posições NaN, dims negativas, escala inválida, fora do espaço.
 */
export function runSafetyViewerGate(viewer: EuropeanDrawerViewerData): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  if (!viewer || !Array.isArray(viewer.drawers)) {
    errors.push(issue("viewer", "error", "VIEWER_NULL", "Viewer data nulo ou sem drawers"));
    return finalizeGate("viewer", t0, errors, warnings);
  }

  for (const d of viewer.drawers) {
    const tag = d.id || `drawer#${d.index}`;

    if (!Number.isFinite(d.index) || d.index < 0) {
      errors.push(issue("viewer", "error", "INDEX_INVALID", `Indice invalido: ${d.index}`, tag));
    }
    if (!Number.isFinite(d.openProgress) || d.openProgress < 0 || d.openProgress > 1.0001) {
      errors.push(
        issue(
          "viewer",
          "error",
          "SCALE_INVALID",
          `openProgress/escala invalida: ${d.openProgress}`,
          tag
        )
      );
    }
    if (!Number.isFinite(d.maxPullMm) || d.maxPullMm < 0) {
      errors.push(
        issue("viewer", "error", "MAX_PULL_INVALID", `maxPullMm invalido: ${d.maxPullMm}`, tag)
      );
    }
    if (!d.geometry) {
      errors.push(issue("viewer", "error", "GEO_MISSING", "Drawer sem geometria", tag));
      continue;
    }

    const geoGate = runSafetyGeometryGate(d.geometry);
    for (const e of geoGate.errors) {
      errors.push({ ...e, gate: "viewer" as const, piece: e.piece ? `${tag}/${e.piece}` : tag });
    }
    for (const w of geoGate.warnings) {
      warnings.push({
        ...w,
        gate: "viewer" as const,
        piece: w.piece ? `${tag}/${w.piece}` : tag,
      });
    }

    const lim = 10000;
    for (const [name, p] of [
      ["front", d.geometry.front],
      ["bottom", d.geometry.bottom],
      ["left", d.geometry.leftSide],
      ["right", d.geometry.rightSide],
      ["back", d.geometry.back],
    ] as const) {
      if (
        Math.abs(p.originXMm) > lim ||
        Math.abs(p.originYMm) > lim ||
        Math.abs(p.originZMm) > lim
      ) {
        errors.push(
          issue(
            "viewer",
            "error",
            "OUT_OF_SPACE",
            `Peca fora do espaco do viewer`,
            `${tag}/${name}`
          )
        );
      }
    }
  }

  return finalizeGate("viewer", t0, errors, warnings);
}
