/**
 * validateHolePositions.ts — Furos do Sistema Europeu.
 */

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
} from "../types";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

const EPS = 0.6;

function pieceBounds(
  hole: EuropeanDrawerHole,
  geometry: DrawerGeometry,
  box: EuropeanDrawerBoxInput
): { maxX: number; maxY: number; maxThickness: number } {
  if (hole.pieceRef === "front") {
    return {
      maxX: geometry.front.widthMm,
      maxY: geometry.front.heightMm,
      maxThickness: geometry.front.thicknessMm,
    };
  }
  if (hole.pieceRef === "bottom") {
    return {
      maxX: geometry.bottom.depthMm,
      maxY: geometry.bottom.widthMm,
      maxThickness: geometry.bottom.thicknessMm,
    };
  }
  // Laterais do modulo
  return {
    maxX: box.dimensoes.profundidade,
    maxY: box.dimensoes.altura,
    maxThickness: box.espessura,
  };
}

/**
 * Valida coordenadas, profundidades e padrao oficial (32 mm / setback / bottom gap).
 */
export function validateHolePositions(
  box: EuropeanDrawerBoxInput,
  model: DrawerEuropeanModel,
  geometry: DrawerGeometry,
  holes: EuropeanDrawerHole[]
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();
  const pattern = model.holePattern;

  for (const hole of holes) {
    const bounds = pieceBounds(hole, geometry, box);
    if (hole.x < -EPS || hole.y < -EPS || hole.x > bounds.maxX + EPS || hole.y > bounds.maxY + EPS) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_BOUNDS,
          `Furo fora da peca ${hole.pieceRef}: X=${hole.x.toFixed(1)} Y=${hole.y.toFixed(1)}.`,
          `holes.${hole.pieceRef}`
        )
      );
    }
    if (hole.depth < 0 || hole.diameter <= 0) {
      result.errors.push(
        euError(EU_ERROR_CODES.HOLE_DEPTH, `Furo com profundidade/diametro invalido em ${hole.pieceRef}.`, `holes.${hole.pieceRef}`)
      );
    }
    if (hole.depth > bounds.maxThickness + EPS) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_THICKNESS,
          `Profundidade do furo (${hole.depth} mm) ultrapassa espessura (${bounds.maxThickness} mm) em ${hole.pieceRef}.`,
          `holes.${hole.pieceRef}`
        )
      );
    }
  }

  // Setback frontal exacto nos furos de corredica / frente
  const runnerHoles = holes.filter((h) => h.holeType === "corredica");
  for (const h of runnerHoles) {
    const distToSetback = Math.abs(h.x - pattern.setbackFrontMm);
    // Aceita setback ou setback + n*32
    const fromSetback = h.x - pattern.setbackFrontMm;
    const onPitch =
      Math.abs(fromSetback % pattern.systemPitchMm) < EPS ||
      Math.abs(fromSetback % pattern.systemPitchMm - pattern.systemPitchMm) < EPS;
    if (distToSetback > EPS && !onPitch) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_PITCH32,
          `Furo corredica X=${h.x.toFixed(1)} nao respeita setback ${pattern.setbackFrontMm} + sistema ${pattern.systemPitchMm} mm.`,
          "holes.corredica"
        )
      );
    }
  }

  const frontFix = holes.filter((h) => h.pieceRef === "front" && h.holeType === "fixacao_metalica");
  for (const h of frontFix) {
    const leftOk = Math.abs(h.x - pattern.setbackFrontMm) < EPS;
    const rightOk = Math.abs(h.x - (geometry.front.widthMm - pattern.setbackFrontMm)) < EPS;
    if (!leftOk && !rightOk) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_SETBACK,
          `Fixacao frente X=${h.x.toFixed(1)} nao respeita setback oficial ${pattern.setbackFrontMm} mm.`,
          "holes.front"
        )
      );
    }
  }

  // Bottom gap: Y dos furos de corredica relativamente a base da gaveta
  for (const h of runnerHoles) {
    // yFromBottom ja inclui bottomGap na geracao; verificar coerencia com padrao
    const expectedMin = pattern.bottomGapMm;
    if (h.y + EPS < expectedMin) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_BOTTOM_GAP,
          `Bottom gap do furo Y=${h.y.toFixed(1)} < oficial ${pattern.bottomGapMm} mm.`,
          "holes.corredica"
        )
      );
    }
  }

  result.valid = result.errors.length === 0;
  return result;
}
