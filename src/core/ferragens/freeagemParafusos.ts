/**
 * Freeagem: Parafuso 4x35, Parafuso 5x50, Puxa 8mm.
 * Apenas BOM / online / PDF ferragens_totais / custo — sem furos, CNC, Viewer, componentTypes.
 * Literais PT usam escapes Unicode.
 */

import type { BoxModule, WorkspaceBox } from "../types";
import type { RematePiece } from "../remate/rematePieceTypes";

export const PARAFUSO_4X35_ID = "parafuso_4x35";
export const PARAFUSO_4X35_NOME = "Parafuso 4\u00d735";
export const PARAFUSO_4X35_MEDIDA = "4\u00d735mm";
export const PARAFUSO_4X35_PRECO = 0.14;

export const PARAFUSO_5X50_ID = "parafuso_5x50";
export const PARAFUSO_5X50_NOME = "Parafuso 5\u00d750";
export const PARAFUSO_5X50_MEDIDA = "5\u00d750mm";
export const PARAFUSO_5X50_PRECO = 0.24;

export const PUXA_8MM_ID = "puxa_8mm";
export const PUXA_8MM_NOME = "puxa 8mm";
export const PUXA_8MM_MEDIDA = "8\u00d730mm";
export const PUXA_8MM_PRECO = 0.7;

/** 4 parafusos por junta (lado a lado ou empilhada). */
export const PARAFUSO_4X35_POR_JUNTA = 4;
export const PARAFUSO_4X35_ALTURA_BASE_MM = 1000;
export const PARAFUSO_4X35_ALTURA_STEP_MM = 400;
export const PARAFUSO_4X35_ALTURA_BASE_QTY = 4;
export const PARAFUSO_4X35_MUITO_ALTA_MM = 1500;
export const PARAFUSO_4X35_MUITO_ALTA_QTY = 6;
export const PARAFUSO_4X35_REMATE_STEP_MM = 700;
export const PARAFUSO_4X35_REMATE_POR_STEP = 2;

export const PARAFUSO_5X50_BASE_QTY = 3;
export const PARAFUSO_5X50_LARGURA_BASE_MM = 500;
export const PARAFUSO_5X50_LARGURA_STEP_MM = 400;

/** Tolerancia mm para considerar faces coladas. */
export const BOX_JOINT_GAP_TOL_MM = 2;
/** Overlap minimo (mm) no eixo perpendicular para validar junta. */
export const BOX_JOINT_MIN_OVERLAP_MM = 20;

export type BoxPoseLike = {
  id: string;
  nome?: string;
  dimensoes?: { largura?: number; altura?: number; profundidade?: number };
  posicaoX_mm?: number;
  posicaoY_mm?: number;
  posicaoZ_mm?: number;
  cabinetType?: "lower" | "upper";
  feetEnabled?: boolean;
};

export type BoxJoint = {
  aId: string;
  bId: string;
  kind: "side" | "stacked";
};

export type FreeagemAggregateRow = {
  material: string;
  ref: string;
  medida: string;
  quantidade: number;
  precoUnitario: number;
};

export type FreeagemPorCaixaRow = {
  caixa: string;
  boxId: string;
  quantidade: number;
  medida: string;
  precoUnitario: number;
  precoTotal: number;
};

type Aabb = {
  id: string;
  nome: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  w: number;
  h: number;
  d: number;
};

function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function gap1d(a0: number, a1: number, b0: number, b1: number): number {
  if (a1 < b0) return b0 - a1;
  if (b1 < a0) return a0 - b1;
  return 0;
}

/**
 * Resolve poses para juntas: workspaceBoxes (com posicao) tem prioridade;
 * fallback a boxes sem posicao => sem juntas.
 */
export function resolveBoxPosesForJoints(
  boxes: BoxPoseLike[],
  workspaceBoxes?: Array<Pick<WorkspaceBox, "id" | "nome" | "dimensoes" | "posicaoX_mm" | "posicaoY_mm" | "posicaoZ_mm" | "cabinetType" | "feetEnabled">>
): BoxPoseLike[] {
  if (workspaceBoxes && workspaceBoxes.length > 0) {
    return workspaceBoxes.map((w) => ({
      id: w.id,
      nome: w.nome,
      dimensoes: w.dimensoes,
      posicaoX_mm: w.posicaoX_mm,
      posicaoY_mm: w.posicaoY_mm,
      posicaoZ_mm: w.posicaoZ_mm,
      cabinetType: w.cabinetType,
      feetEnabled: w.feetEnabled,
    }));
  }
  return boxes;
}

function toAabb(box: BoxPoseLike): Aabb | null {
  const w = Number(box.dimensoes?.largura) || 0;
  const h = Number(box.dimensoes?.altura) || 0;
  const d = Number(box.dimensoes?.profundidade) || 0;
  if (w <= 0 || h <= 0 || d <= 0) return null;
  const cx = Number(box.posicaoX_mm);
  const cy = Number(box.posicaoY_mm);
  const cz = Number(box.posicaoZ_mm);
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const z = Number.isFinite(cz) ? cz : 0;
  return {
    id: box.id,
    nome: box.nome?.trim() || box.id,
    minX: cx - w / 2,
    maxX: cx + w / 2,
    minY: cy - h / 2,
    maxY: cy + h / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    w,
    h,
    d,
  };
}

/** Detecta juntas undirected entre caixas coladas (lado a lado ou empilhadas). */
export function detectBoxJoints(
  boxes: BoxPoseLike[],
  tolMm = BOX_JOINT_GAP_TOL_MM,
  minOverlapMm = BOX_JOINT_MIN_OVERLAP_MM
): BoxJoint[] {
  const aabbs = boxes.map(toAabb).filter((a): a is Aabb => a != null);
  const joints: BoxJoint[] = [];
  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      const a = aabbs[i]!;
      const b = aabbs[j]!;
      const gapX = gap1d(a.minX, a.maxX, b.minX, b.maxX);
      const gapY = gap1d(a.minY, a.maxY, b.minY, b.maxY);
      const gapZ = gap1d(a.minZ, a.maxZ, b.minZ, b.maxZ);
      const ovX = overlap1d(a.minX, a.maxX, b.minX, b.maxX);
      const ovY = overlap1d(a.minY, a.maxY, b.minY, b.maxY);
      const ovZ = overlap1d(a.minZ, a.maxZ, b.minZ, b.maxZ);

      // Lado a lado em X: gap X pequeno, overlap Y e Z.
      if (gapX <= tolMm && ovY >= minOverlapMm && ovZ >= minOverlapMm) {
        joints.push({ aId: a.id, bId: b.id, kind: "side" });
        continue;
      }
      // Lado a lado em Z: gap Z pequeno, overlap X e Y.
      if (gapZ <= tolMm && ovX >= minOverlapMm && ovY >= minOverlapMm) {
        joints.push({ aId: a.id, bId: b.id, kind: "side" });
        continue;
      }
      // Empilhadas em Y: gap Y pequeno, overlap X e Z.
      if (gapY <= tolMm && ovX >= minOverlapMm && ovZ >= minOverlapMm) {
        joints.push({ aId: a.id, bId: b.id, kind: "stacked" });
      }
    }
  }
  return joints;
}

/** Regra B+C: altura da caixa (por caixa). */
export function quantidadeParafuso4x35PorAltura(alturaMm: number): number {
  const h = Number(alturaMm) || 0;
  if (h <= PARAFUSO_4X35_ALTURA_BASE_MM) return 0;
  let qty =
    PARAFUSO_4X35_ALTURA_BASE_QTY +
    Math.floor((h - PARAFUSO_4X35_ALTURA_BASE_MM) / PARAFUSO_4X35_ALTURA_STEP_MM);
  if (h > PARAFUSO_4X35_MUITO_ALTA_MM) {
    qty += PARAFUSO_4X35_MUITO_ALTA_QTY;
  }
  return qty;
}

/** Regra A: 4 por junta; atribui metade a cada caixa. */
export function quantidadeParafuso4x35JuntasPorCaixa(
  boxes: BoxPoseLike[],
  workspaceBoxes?: Parameters<typeof resolveBoxPosesForJoints>[1]
): Map<string, number> {
  const poses = resolveBoxPosesForJoints(boxes, workspaceBoxes);
  const joints = detectBoxJoints(poses);
  const byBox = new Map<string, number>();
  const half = PARAFUSO_4X35_POR_JUNTA / 2;
  for (const j of joints) {
    byBox.set(j.aId, (byBox.get(j.aId) ?? 0) + half);
    byBox.set(j.bId, (byBox.get(j.bId) ?? 0) + half);
  }
  return byBox;
}

export function quantidadeParafuso4x35JuntasTotal(
  boxes: BoxPoseLike[],
  workspaceBoxes?: Parameters<typeof resolveBoxPosesForJoints>[1]
): number {
  const poses = resolveBoxPosesForJoints(boxes, workspaceBoxes);
  return detectBoxJoints(poses).length * PARAFUSO_4X35_POR_JUNTA;
}

/** Regra D: remate — ceil(comprimento/700)*2. */
export function quantidadeParafuso4x35PorRemate(remate: Pick<RematePiece, "width" | "visible">): number {
  if (remate.visible === false) return 0;
  const len = Number(remate.width) || 0;
  if (len <= 0) return 0;
  return Math.ceil(len / PARAFUSO_4X35_REMATE_STEP_MM) * PARAFUSO_4X35_REMATE_POR_STEP;
}

export function quantidadeParafuso4x35RematesTotal(remates: RematePiece[] | undefined): number {
  let total = 0;
  for (const r of remates ?? []) {
    total += quantidadeParafuso4x35PorRemate(r);
  }
  return total;
}

/** Qty por caixa atribuivel em gerarFerragens (so altura B+C). */
export function quantidadeParafuso4x35AlturaParaCaixa(
  box: Pick<BoxModule, "dimensoes">
): number {
  return quantidadeParafuso4x35PorAltura(Number(box.dimensoes?.altura) || 0);
}

/**
 * Totais 4x35 do projeto = juntas + alturas + remates.
 * Por caixa online: altura + metade das juntas (+ remates do parentBoxId).
 */
export function listParafuso4x35PorCaixa(
  boxes: BoxPoseLike[],
  remates?: RematePiece[],
  workspaceBoxes?: Parameters<typeof resolveBoxPosesForJoints>[1]
): FreeagemPorCaixaRow[] {
  const juntas = quantidadeParafuso4x35JuntasPorCaixa(boxes, workspaceBoxes);
  const remateByBox = new Map<string, number>();
  for (const r of remates ?? []) {
    if (r.visible === false) continue;
    const qty = quantidadeParafuso4x35PorRemate(r);
    if (qty <= 0) continue;
    const bid = r.parentBoxId?.trim() || "__remates__";
    remateByBox.set(bid, (remateByBox.get(bid) ?? 0) + qty);
  }

  const nomeById = new Map(boxes.map((b) => [b.id, b.nome?.trim() || b.id]));
  const ids = new Set<string>([
    ...boxes.map((b) => b.id),
    ...juntas.keys(),
    ...remateByBox.keys(),
  ]);

  const rows: FreeagemPorCaixaRow[] = [];
  for (const id of ids) {
    const box = boxes.find((b) => b.id === id);
    const alturaQty = box ? quantidadeParafuso4x35AlturaParaCaixa(box as BoxModule) : 0;
    const juntaQty = juntas.get(id) ?? 0;
    const remateQty = remateByBox.get(id) ?? 0;
    const quantidade = alturaQty + juntaQty + remateQty;
    if (quantidade <= 0) continue;
    rows.push({
      caixa: nomeById.get(id) || (id === "__remates__" ? "Remates" : id),
      boxId: id,
      quantidade,
      medida: PARAFUSO_4X35_MEDIDA,
      precoUnitario: PARAFUSO_4X35_PRECO,
      precoTotal: PARAFUSO_4X35_PRECO * quantidade,
    });
  }
  return rows.sort((a, b) => a.caixa.localeCompare(b.caixa, "pt"));
}

export function aggregateParafuso4x35FromProject(
  boxes: BoxPoseLike[],
  remates?: RematePiece[],
  workspaceBoxes?: Parameters<typeof resolveBoxPosesForJoints>[1]
): FreeagemAggregateRow[] {
  const juntas = quantidadeParafuso4x35JuntasTotal(boxes, workspaceBoxes);
  let alturas = 0;
  for (const b of boxes) {
    alturas += quantidadeParafuso4x35AlturaParaCaixa(b as BoxModule);
  }
  const rem = quantidadeParafuso4x35RematesTotal(remates);
  const quantidade = juntas + alturas + rem;
  if (quantidade <= 0) return [];
  return [
    {
      material: PARAFUSO_4X35_NOME,
      ref: PARAFUSO_4X35_ID,
      medida: PARAFUSO_4X35_MEDIDA,
      quantidade,
      precoUnitario: PARAFUSO_4X35_PRECO,
    },
  ];
}

/** Caixa superior / elevada sem pes. */
export function boxPrecisaParafuso5x50(
  box: Pick<BoxModule, "cabinetType" | "feetEnabled">
): boolean {
  if (box.cabinetType === "upper") return true;
  return box.feetEnabled === false;
}

export function quantidadeParafuso5x50ParaCaixa(
  box: Pick<BoxModule, "dimensoes" | "cabinetType" | "feetEnabled">
): number {
  if (!boxPrecisaParafuso5x50(box)) return 0;
  let qty = PARAFUSO_5X50_BASE_QTY;
  const w = Number(box.dimensoes?.largura) || 0;
  if (w > PARAFUSO_5X50_LARGURA_BASE_MM) {
    qty += Math.floor((w - PARAFUSO_5X50_LARGURA_BASE_MM) / PARAFUSO_5X50_LARGURA_STEP_MM);
  }
  return qty;
}

export function quantidadePuxa8mmParaCaixa(
  box: Pick<BoxModule, "dimensoes" | "cabinetType" | "feetEnabled">
): number {
  return quantidadeParafuso5x50ParaCaixa(box);
}

export function listParafuso5x50PorCaixa(boxes: BoxPoseLike[]): FreeagemPorCaixaRow[] {
  const rows: FreeagemPorCaixaRow[] = [];
  for (const box of boxes) {
    const quantidade = quantidadeParafuso5x50ParaCaixa(box as BoxModule);
    if (quantidade <= 0) continue;
    rows.push({
      caixa: box.nome?.trim() || box.id,
      boxId: box.id,
      quantidade,
      medida: PARAFUSO_5X50_MEDIDA,
      precoUnitario: PARAFUSO_5X50_PRECO,
      precoTotal: PARAFUSO_5X50_PRECO * quantidade,
    });
  }
  return rows;
}

export function listPuxa8mmPorCaixa(boxes: BoxPoseLike[]): FreeagemPorCaixaRow[] {
  return listParafuso5x50PorCaixa(boxes).map((r) => ({
    ...r,
    medida: PUXA_8MM_MEDIDA,
    precoUnitario: PUXA_8MM_PRECO,
    precoTotal: PUXA_8MM_PRECO * r.quantidade,
  }));
}

export function aggregateParafuso5x50FromBoxes(boxes: BoxPoseLike[]): FreeagemAggregateRow[] {
  let quantidade = 0;
  for (const b of boxes) quantidade += quantidadeParafuso5x50ParaCaixa(b as BoxModule);
  if (quantidade <= 0) return [];
  return [
    {
      material: PARAFUSO_5X50_NOME,
      ref: PARAFUSO_5X50_ID,
      medida: PARAFUSO_5X50_MEDIDA,
      quantidade,
      precoUnitario: PARAFUSO_5X50_PRECO,
    },
  ];
}

export function aggregatePuxa8mmFromBoxes(boxes: BoxPoseLike[]): FreeagemAggregateRow[] {
  return aggregateParafuso5x50FromBoxes(boxes).map((r) => ({
    material: PUXA_8MM_NOME,
    ref: PUXA_8MM_ID,
    medida: PUXA_8MM_MEDIDA,
    quantidade: r.quantidade,
    precoUnitario: PUXA_8MM_PRECO,
  }));
}

/** Custo/qty project-level so de juntas+remates 4x35 (altura/5x50/puxa vao em gerarFerragens). */
export function freeagem4x35JuntasRematesCusto(
  boxes: BoxPoseLike[],
  remates?: RematePiece[],
  workspaceBoxes?: Parameters<typeof resolveBoxPosesForJoints>[1]
): { qty: number; custo: number } {
  const qty =
    quantidadeParafuso4x35JuntasTotal(boxes, workspaceBoxes) +
    quantidadeParafuso4x35RematesTotal(remates);
  return { qty, custo: qty * PARAFUSO_4X35_PRECO };
}
