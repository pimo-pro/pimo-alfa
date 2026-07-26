/**
 * cncMapping.ts — Mapeamento industrial DXF/furos ? operações CNC.
 * Sem recalcular geometry ou furos — apenas converter.
 */

import type {
  DrawerGeometry,
  DrawerPieceBox,
  EuropeanDrawerHole,
  EuropeanDrawerResult,
} from "../types";
import type { DxfEntity, DxfLineEntity } from "../dxf/dxfTypes";
import type { DxfPieceContour } from "../dxf/dxfGeometry";
import {
  resolveCncPieceKeyFromCodigo,
  type EuropeanCncPieceKey,
} from "./cncFileNaming";

/** Grupo CNC alinhado aos layers industriais. */
export type CncIndustrialGroup = "FRONT" | "SIDES" | "BACK" | "BOTTOM" | "CUT" | "DRILL" | "META";

export type CncCutOperation = {
  type: "CUT";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  layer: string;
  group: CncIndustrialGroup;
};

export type CncDrillOperation = {
  type: "DRILL";
  x: number;
  y: number;
  diameterMm: number;
  depthMm: number;
  face: "A" | "B";
  holeType: string;
  group: CncIndustrialGroup;
};

export type CncPocketOperation = {
  type: "POCKET";
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  group: CncIndustrialGroup;
};

export type CncPieceMeta = {
  pieceCode: string;
  pieceKey: EuropeanCncPieceKey;
  group: CncIndustrialGroup;
  material: string;
  thicknessMm: number;
  widthMm: number;
  heightMm: number;
  originXMm: number;
  originYMm: number;
  originZMm: number;
  toleranceMm: number;
};

const PIECE_DEFS: Array<{
  key: EuropeanCncPieceKey;
  code: string;
  group: CncIndustrialGroup;
  pick: (g: DrawerGeometry) => DrawerPieceBox | undefined;
  faceSize: (p: DrawerPieceBox) => { w: number; h: number };
}> = [
  {
    key: "front",
    code: "gav_fren",
    group: "FRONT",
    pick: (g) => g.front,
    faceSize: (p) => ({ w: p.widthMm, h: p.heightMm }),
  },
  {
    key: "front_int",
    code: "gav_fre_int",
    group: "FRONT",
    pick: (g) => g.frontInt,
    faceSize: (p) => ({ w: p.widthMm, h: p.heightMm }),
  },
  {
    key: "lat_esq",
    code: "gav_lat_esq",
    group: "SIDES",
    pick: (g) => g.leftSide,
    faceSize: (p) => ({ w: p.depthMm, h: p.heightMm }),
  },
  {
    key: "lat_dir",
    code: "gav_lat_dir",
    group: "SIDES",
    pick: (g) => g.rightSide,
    faceSize: (p) => ({ w: p.depthMm, h: p.heightMm }),
  },
  {
    key: "costa",
    code: "gav_costa",
    group: "BACK",
    pick: (g) => g.back,
    faceSize: (p) => ({ w: p.widthMm, h: p.heightMm }),
  },
  {
    key: "fundo",
    code: "gav_fun",
    group: "BOTTOM",
    pick: (g) => g.bottom,
    faceSize: (p) => ({ w: p.widthMm, h: p.depthMm }),
  },
];

/** Layer DXF ? grupo CNC. */
export function mapDxfLayerToCncGroup(layer: string): CncIndustrialGroup {
  const l = layer.toUpperCase();
  if (l === "FRONT") return "FRONT";
  if (l === "SIDES") return "SIDES";
  if (l === "BACK") return "BACK";
  if (l === "BOTTOM") return "BOTTOM";
  if (l === "DRILLING" || l === "DRILL") return "DRILL";
  if (l === "DIMENSIONS") return "META";
  return "CUT";
}

/**
 * Mapeia pieceRef de furo ? código industrial da peça do Modelo B.
 * Furos de módulo (module_*) ficam de fora das peças de gaveta.
 */
export function mapHolePieceRefToCodigo(pieceRef: string): string | null {
  const ref = (pieceRef || "").toLowerCase();
  if (!ref || ref.startsWith("module_")) return null;
  if (ref.includes("fre_int") || ref.includes("front_int")) return "gav_fre_int";
  if (ref.includes("fren") || ref === "front") return "gav_fren";
  if (ref.includes("lat_esq")) return "gav_lat_esq";
  if (ref.includes("lat_dir")) return "gav_lat_dir";
  if (ref.includes("costa") || ref === "back") return "gav_costa";
  if (ref.includes("fun") || ref === "bottom") return "gav_fun";
  const key = resolveCncPieceKeyFromCodigo(ref);
  if (!key) return null;
  const def = PIECE_DEFS.find((d) => d.key === key);
  return def?.code ?? null;
}

/** Contornos DXF ? operações CUT (LINEs no layer CUT). */
export function mapDxfEntitiesToCutOps(
  entities: DxfEntity[],
  origin?: { x: number; y: number }
): CncCutOperation[] {
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const cuts: CncCutOperation[] = [];
  for (const e of entities) {
    if (e.type !== "LINE") continue;
    if (e.layer !== "CUT" && e.layer !== "FRONT" && e.layer !== "SIDES" && e.layer !== "BACK" && e.layer !== "BOTTOM") {
      continue;
    }
    if (e.layer !== "CUT") continue;
    const line = e as DxfLineEntity;
    cuts.push({
      type: "CUT",
      x0: round3(line.start.x - ox),
      y0: round3(line.start.y - oy),
      x1: round3(line.end.x - ox),
      y1: round3(line.end.y - oy),
      layer: line.layer,
      group: "CUT",
    });
  }
  return cuts;
}

/** Retângulo de peça ? 4 operações CUT (fallback se DXF ausente). */
export function mapPieceBoxToCutOps(widthMm: number, heightMm: number): CncCutOperation[] {
  const w = round3(widthMm);
  const h = round3(heightMm);
  const edge = (
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): CncCutOperation => ({
    type: "CUT",
    x0,
    y0,
    x1,
    y1,
    layer: "CUT",
    group: "CUT",
  });
  return [
    edge(0, 0, w, 0),
    edge(w, 0, w, h),
    edge(w, h, 0, h),
    edge(0, h, 0, 0),
  ];
}

/** Furos ? operações DRILL (coordenadas locais da peça). */
export function mapHolesToDrillOps(
  holes: EuropeanDrawerHole[],
  pieceCode: string
): { drills: CncDrillOperation[]; warnings: string[] } {
  const drills: CncDrillOperation[] = [];
  const warnings: string[] = [];
  for (const h of holes) {
    const code = mapHolePieceRefToCodigo(h.pieceRef);
    if (code !== pieceCode) continue;
    if (!(h.diameter > 0)) {
      warnings.push(`Furo sem — válido em ${pieceCode} @(${h.x},${h.y}).`);
      continue;
    }
    if (!(h.depth > 0)) {
      warnings.push(`Furo sem profundidade válida em ${pieceCode} @(${h.x},${h.y}).`);
    }
    drills.push({
      type: "DRILL",
      x: round3(h.x),
      y: round3(h.y),
      diameterMm: round3(h.diameter),
      depthMm: round3(Math.max(0, h.depth)),
      face: h.face,
      holeType: h.holeType,
      group: "DRILL",
    });
  }
  return { drills, warnings };
}

export type MappedCncPiece = {
  meta: CncPieceMeta;
  cuts: CncCutOperation[];
  drills: CncDrillOperation[];
  pockets: CncPocketOperation[];
  warnings: string[];
};

/**
 * Mapeia result (geometry + holes + dxf opcional) para peças CNC.
 */
export function mapEuropeanResultToCncPieces(
  result: EuropeanDrawerResult,
  options?: { pieces?: EuropeanCncPieceKey[] }
): MappedCncPiece[] {
  const selection = options?.pieces;
  const toleranceMm = result.assembly?.toleranceMm ?? 0.5;
  const contours = result.dxf?.document?.contours ?? [];
  const contourByCode = new Map<string, DxfPieceContour>();
  for (const c of contours) contourByCode.set(c.pieceCode, c);

  const out: MappedCncPiece[] = [];

  for (const def of PIECE_DEFS) {
    if (selection && selection.length > 0 && !selection.includes(def.key)) continue;
    const box = def.pick(result.geometry);
    if (!box) continue;

    const { w, h } = def.faceSize(box);
    const cutlistItem = result.cutlist.find(
      (i) => (i.codigo || "").toLowerCase() === def.code || (i.codigo || "").includes(def.code)
    );
    const material = cutlistItem?.material || result.model?.notes || "mdf";

    const contour = contourByCode.get(def.code);
    const dxfEntities =
      result.dxf?.document?.entities?.filter((e) => e.pieceCode === def.code) ?? [];
    let cuts = mapDxfEntitiesToCutOps(dxfEntities, contour?.origin);
    if (cuts.length === 0) {
      cuts = mapPieceBoxToCutOps(w, h);
    }

    const { drills, warnings } = mapHolesToDrillOps(result.holes, def.code);

    out.push({
      meta: {
        pieceCode: def.code,
        pieceKey: def.key,
        group: def.group,
        material,
        thicknessMm: box.thicknessMm,
        widthMm: w,
        heightMm: h,
        originXMm: box.originXMm,
        originYMm: box.originYMm,
        originZMm: box.originZMm,
        toleranceMm,
      },
      cuts,
      drills,
      pockets: [],
      warnings,
    });
  }

  return out;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
