/**
 * safetyGeometryGate.ts — Bloqueia geometrias industriais corruptas.
 */

import type { DrawerGeometry, DrawerPieceBox } from "../types";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

type PieceEntry = { name: string; piece: DrawerPieceBox };

function collectPieces(geometry: DrawerGeometry): PieceEntry[] {
  const list: PieceEntry[] = [
    { name: "gav_fren", piece: geometry.front },
    { name: "gav_fun", piece: geometry.bottom },
    { name: "gav_lat_esq", piece: geometry.leftSide },
    { name: "gav_lat_dir", piece: geometry.rightSide },
    { name: "gav_costa", piece: geometry.back },
  ];
  if (geometry.frontInt) list.push({ name: "gav_fre_int", piece: geometry.frontInt });
  return list;
}

function hasNegativeDims(p: DrawerPieceBox): boolean {
  return p.widthMm < 0 || p.heightMm < 0 || p.depthMm < 0 || p.thicknessMm < 0;
}

function hasNaNOrigin(p: DrawerPieceBox): boolean {
  return (
    !Number.isFinite(p.originXMm) ||
    !Number.isFinite(p.originYMm) ||
    !Number.isFinite(p.originZMm)
  );
}

function hasNaNDims(p: DrawerPieceBox): boolean {
  return (
    !Number.isFinite(p.widthMm) ||
    !Number.isFinite(p.heightMm) ||
    !Number.isFinite(p.depthMm) ||
    !Number.isFinite(p.thicknessMm)
  );
}

/** AABB 3D — usado só para detetar sobreposição catastrófica (quase idêntica). */
function almostIdentical(a: DrawerPieceBox, b: DrawerPieceBox): boolean {
  const tol = 0.5;
  return (
    Math.abs(a.originXMm - b.originXMm) < tol &&
    Math.abs(a.originYMm - b.originYMm) < tol &&
    Math.abs(a.originZMm - b.originZMm) < tol &&
    Math.abs(a.widthMm - b.widthMm) < tol &&
    Math.abs(a.heightMm - b.heightMm) < tol &&
    Math.abs(a.depthMm - b.depthMm) < tol
  );
}

/**
 * Gate de geometria: NaN, dims negativas, peças colapsadas, sobreposição idêntica.
 * Não bloqueia encaixes industriais válidos (fundo nas laterais / frente sobreposta).
 */
export function runSafetyGeometryGate(geometry: DrawerGeometry): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  for (const key of [
    "externalWidthMm",
    "internalWidthMm",
    "usefulHeightMm",
    "runnerDepthMm",
    "bodyDepthMm",
  ] as const) {
    const v = geometry[key];
    if (!Number.isFinite(v) || v < 0) {
      errors.push(
        issue("geometry", "error", "GEO_SCALAR_INVALID", `geometry.${key} invalido: ${v}`)
      );
    }
  }

  if (geometry.bodyDepthMm > geometry.runnerDepthMm + 0.01) {
    errors.push(
      issue(
        "geometry",
        "error",
        "BODY_GT_RUNNER",
        `bodyDepth ${geometry.bodyDepthMm} > runner ${geometry.runnerDepthMm}`
      )
    );
  }

  const pieces = collectPieces(geometry);
  for (const { name, piece } of pieces) {
    if (hasNaNOrigin(piece)) {
      errors.push(issue("geometry", "error", "ORIGIN_NAN", `Origem NaN/Inf`, name));
    }
    if (hasNaNDims(piece) || hasNegativeDims(piece)) {
      errors.push(issue("geometry", "error", "DIMS_INVALID", `Dimensoes NaN/negativas`, name));
    }
    // Peça principal com volume zero (exceto espessura já coberta)
    if (
      Number.isFinite(piece.widthMm) &&
      Number.isFinite(piece.heightMm) &&
      (piece.widthMm <= 0 || piece.heightMm <= 0)
    ) {
      errors.push(
        issue("geometry", "error", "DIMS_NON_POSITIVE", `Largura/altura <= 0`, name)
      );
    }
    // Rotação: DrawerPieceBox não tem campo de rotação — qualquer propriedade extra "rotation*" ? 0 é proibida
    const extra = piece as DrawerPieceBox & { rotationDeg?: number; rotation?: number };
    const rot = extra.rotationDeg ?? extra.rotation;
    if (typeof rot === "number" && Number.isFinite(rot) && Math.abs(rot) > 0.01) {
      errors.push(
        issue("geometry", "error", "ROTATION_FORBIDDEN", `Rotacao nao permitida: ${rot}`, name)
      );
    }
  }

  // Interseção catastrófica: duas peças distintas com AABB quase idêntico
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i]!;
      const b = pieces[j]!;
      if (almostIdentical(a.piece, b.piece)) {
        errors.push(
          issue(
            "geometry",
            "error",
            "PIECE_OVERLAP_IDENTICAL",
            `Pecas com geometria quase identica (intersecao invalida)`,
            `${a.name}+${b.name}`
          )
        );
      }
    }
  }

  // Laterais devem estar em X espelhados (sinal oposto) — se ambas no mesmo X com mesma largura, fora do espaço
  const left = geometry.leftSide;
  const right = geometry.rightSide;
  if (
    Number.isFinite(left.originXMm) &&
    Number.isFinite(right.originXMm) &&
    Math.abs(left.originXMm - right.originXMm) < 1
  ) {
    errors.push(
      issue(
        "geometry",
        "error",
        "SIDES_SAME_X",
        "Laterais no mesmo X — pecas fora do espaco da caixa",
        "gav_lat_*"
      )
    );
  }

  return finalizeGate("geometry", t0, errors, warnings);
}
