/**
 * validateHolePositions.ts — Furos do Sistema Europeu.
 * Laterais/costa da gaveta: regras Modelo A (não forçar pitch 32 do módulo).
 */

import type {
  DrawerEuropeanModel,
  DrawerGeometry,
  EuropeanDrawerBoxInput,
  EuropeanDrawerHole,
} from "../types";
import { EUROPEAN_BACK_THICKNESS_MM, EUROPEAN_SIDE_THICKNESS_MM } from "../measures";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

const EPS = 0.6;

function isDrawerWoodPieceRef(pieceRef: string): boolean {
  return (
    pieceRef === "gav_lat_esq" ||
    pieceRef === "gav_lat_dir" ||
    pieceRef === "gav_costa" ||
    pieceRef === "gav_fun"
  );
}

function pieceBounds(
  hole: EuropeanDrawerHole,
  geometry: DrawerGeometry,
  box: EuropeanDrawerBoxInput
): { maxX: number; maxY: number; maxThickness: number; allowEdgeDepth: boolean } {
  if (hole.pieceRef === "front") {
    return {
      maxX: geometry.front.widthMm,
      maxY: geometry.front.heightMm,
      maxThickness: geometry.front.thicknessMm,
      allowEdgeDepth: false,
    };
  }
  if (hole.pieceRef === "bottom" || hole.pieceRef === "gav_fun") {
    return {
      maxX: Math.max(geometry.bottom.depthMm, geometry.bottom.widthMm),
      maxY: Math.max(geometry.bottom.depthMm, geometry.bottom.widthMm),
      maxThickness: geometry.bottom.thicknessMm,
      allowEdgeDepth: false,
    };
  }
  if (hole.pieceRef === "gav_lat_esq") {
    return {
      maxX: geometry.leftSide.depthMm,
      maxY: geometry.leftSide.heightMm,
      maxThickness: EUROPEAN_SIDE_THICKNESS_MM,
      allowEdgeDepth: true,
    };
  }
  if (hole.pieceRef === "gav_lat_dir") {
    return {
      maxX: geometry.rightSide.depthMm,
      maxY: geometry.rightSide.heightMm,
      maxThickness: EUROPEAN_SIDE_THICKNESS_MM,
      allowEdgeDepth: true,
    };
  }
  if (hole.pieceRef === "gav_costa") {
    return {
      maxX: geometry.back.widthMm,
      maxY: geometry.back.heightMm,
      maxThickness: EUROPEAN_BACK_THICKNESS_MM,
      allowEdgeDepth: true,
    };
  }
  // Laterais do módulo
  return {
    maxX: box.dimensoes.profundidade,
    maxY: box.dimensoes.altura,
    maxThickness: box.espessura,
    allowEdgeDepth: false,
  };
}

/**
 * Valida coordenadas, profundidades e padrão oficial (módulo 32 mm / setback).
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
    // Rasgo / groove: diâmetro 0 permitido
    const isGroove = hole.diameter === 0 && hole.holeType === "fixacao_estrutural";

    if (hole.x < -EPS || hole.y < -EPS || hole.x > bounds.maxX + EPS || hole.y > bounds.maxY + EPS) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_BOUNDS,
          `Furo fora da peça ${hole.pieceRef}: X=${hole.x.toFixed(1)} Y=${hole.y.toFixed(1)}.`,
          `holes.${hole.pieceRef}`
        )
      );
    }
    if (hole.depth < 0 || (!isGroove && hole.diameter <= 0)) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_DEPTH,
          `Furo com profundidade/diâmetro inválido em ${hole.pieceRef}.`,
          `holes.${hole.pieceRef}`
        )
      );
    }
    // Furos de face/topo Modelo A podem ter profundidade > espessura (orientação de face)
    if (!bounds.allowEdgeDepth && hole.depth > bounds.maxThickness + EPS) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_THICKNESS,
          `Profundidade do furo (${hole.depth} mm) ultrapassa espessura (${bounds.maxThickness} mm) em ${hole.pieceRef}.`,
          `holes.${hole.pieceRef}`
        )
      );
    }
  }

  // Pitch 32 / setback: apenas furos de corrediça nas laterais do módulo
  const moduleRunnerHoles = holes.filter(
    (h) =>
      h.holeType === "corredica" &&
      (h.pieceRef === "module_lat_esq" || h.pieceRef === "module_lat_dir")
  );
  for (const h of moduleRunnerHoles) {
    const distToSetback = Math.abs(h.x - pattern.setbackFrontMm);
    const fromSetback = h.x - pattern.setbackFrontMm;
    const onPitch =
      Math.abs(fromSetback % pattern.systemPitchMm) < EPS ||
      Math.abs(fromSetback % pattern.systemPitchMm - pattern.systemPitchMm) < EPS;
    if (distToSetback > EPS && !onPitch) {
      result.errors.push(
        euError(
          EU_ERROR_CODES.HOLE_PITCH32,
          `Furo corrediça módulo X=${h.x.toFixed(1)} não respeita setback ${pattern.setbackFrontMm} + sistema ${pattern.systemPitchMm} mm.`,
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
          `Fixação frente X=${h.x.toFixed(1)} não respeita setback oficial ${pattern.setbackFrontMm} mm.`,
          "holes.front"
        )
      );
    }
  }

  for (const h of moduleRunnerHoles) {
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

  void isDrawerWoodPieceRef;
  result.valid = result.errors.length === 0;
  return result;
}
