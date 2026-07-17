/**
 * Normalizacao exclusiva do PDF ferragens_totais (apresentacao).
 * Nao altera catalogo industrial, CNC, furos nem outros PDFs.
 */

import type { BoxModule, CutListItemComPreco } from "../types";
import type { FerragensTotaisArmazemRow } from "../industrial/industrialBottomSectionData";

export const CORREDICA_LENGTHS_MM = [300, 350, 400, 450, 500, 550] as const;
export const PARAFUSO_COSTA_SPACING_MM = 180;

export function snapCorredicaLengthMm(depthMm: number): number {
  if (!Number.isFinite(depthMm) || depthMm <= 0) return 450;
  let best: number = CORREDICA_LENGTHS_MM[0];
  let bestDist = Math.abs(depthMm - best);
  for (const len of CORREDICA_LENGTHS_MM) {
    const d = Math.abs(depthMm - len);
    if (d < bestDist) {
      best = len;
      bestDist = d;
    }
  }
  return best;
}

/** Parafuso 3x30: 1 por cada 18 cm em cada uma das 4 bordas (ceil por lado). */
export function countParafusosCosta3x30(
  items: Array<Pick<CutListItemComPreco, "tipo" | "dimensoes" | "quantidade">>
): number {
  let total = 0;
  for (const item of items) {
    const tipo = String(item.tipo ?? "").trim().toLowerCase();
    if (tipo !== "costa") continue;
    const w = Number(item.dimensoes?.largura) || 0;
    const h = Number(item.dimensoes?.altura) || 0;
    if (w <= 0 || h <= 0) continue;
    const qty = Math.max(1, Math.floor(Number(item.quantidade) || 1));
    const perPiece =
      Math.ceil(w / PARAFUSO_COSTA_SPACING_MM) +
      Math.ceil(w / PARAFUSO_COSTA_SPACING_MM) +
      Math.ceil(h / PARAFUSO_COSTA_SPACING_MM) +
      Math.ceil(h / PARAFUSO_COSTA_SPACING_MM);
    total += perPiece * qty;
  }
  return total;
}

function normalizeKey(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/×/g, "x");
}

type Bucket =
  | "cavilha"
  | "corredica"
  | "dobradica"
  | "suporte"
  | "parafuso_puxador"
  | "prego_costa"
  | "other";

function classifyFerragem(nome: string, ref: string): Bucket {
  const n = normalizeKey(nome);
  const r = normalizeKey(ref);
  if (n.includes("parafuso") && n.includes("puxador")) return "parafuso_puxador";
  if (r === "parafuso_puxador") return "parafuso_puxador";
  if (n.includes("prego") && n.includes("costa")) return "prego_costa";
  if (r === "prego_costa") return "prego_costa";
  if (n.includes("cavilha") || r.startsWith("cavilha")) return "cavilha";
  if (n.includes("corredica") || r.startsWith("corredica") || n === "corredicas") {
    return "corredica";
  }
  if (n.includes("dobradica") || r.startsWith("dobradica") || n === "dobradicas") {
    return "dobradica";
  }
  if (n.includes("suporte") && n.includes("prateleira")) return "suporte";
  if (r === "suporte_prateleira" || n === "suportes_prateleira") return "suporte";
  return "other";
}

function drawerDepthMm(box: BoxModule): number {
  const fromDim = Number(box.dimensoes?.profundidade);
  if (Number.isFinite(fromDim) && fromDim > 0) return fromDim;
  const layer = box.drawersLayer ?? [];
  for (const d of layer) {
    const util = Number((d as { profundidadeUtilMm?: number }).profundidadeUtilMm);
    if (Number.isFinite(util) && util > 0) return util;
  }
  return 450;
}

function countDrawersInBox(box: BoxModule): number {
  const layer = box.drawersLayer ?? [];
  if (layer.length > 0) return layer.length;
  return Math.max(0, Math.floor(Number(box.gavetas) || 0));
}

/**
 * Distribui pares de corredica por comprimento (snap 300-550),
 * proporcional ao numero de gavetas por profundidade.
 */
export function distributeCorredicaPairsByLength(
  pairs: number,
  boxes: BoxModule[]
): Array<{ lengthMm: number; qty: number }> {
  if (pairs <= 0) return [];

  const byLength = new Map<number, number>();
  let drawerSlots = 0;
  for (const box of boxes) {
    const n = countDrawersInBox(box);
    if (n <= 0) continue;
    const len = snapCorredicaLengthMm(drawerDepthMm(box));
    byLength.set(len, (byLength.get(len) ?? 0) + n);
    drawerSlots += n;
  }

  if (drawerSlots <= 0 || byLength.size === 0) {
    return [{ lengthMm: 450, qty: pairs }];
  }

  const lengths = [...byLength.keys()].sort((a, b) => a - b);
  const out: Array<{ lengthMm: number; qty: number }> = [];
  let assigned = 0;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    const weight = byLength.get(len) ?? 0;
    const qty =
      i === lengths.length - 1
        ? pairs - assigned
        : Math.max(0, Math.round((pairs * weight) / drawerSlots));
    if (qty > 0) out.push({ lengthMm: len, qty });
    assigned += qty;
  }
  if (assigned < pairs) {
    const last = out[out.length - 1];
    if (last) last.qty += pairs - assigned;
    else out.push({ lengthMm: 450, qty: pairs - assigned });
  }
  return out.filter((r) => r.qty > 0);
}

export type NormalizeFerragensTotaisInput = {
  ferragens: FerragensTotaisArmazemRow[];
  cutlistItems: Array<Pick<CutListItemComPreco, "tipo" | "dimensoes" | "quantidade">>;
  boxes: BoxModule[];
};

/**
 * Aplica regras de nomenclatura/quantidade exclusivas do PDF ferragens_totais.
 */
export function normalizeFerragensTotaisForPdf(
  input: NormalizeFerragensTotaisInput
): FerragensTotaisArmazemRow[] {
  let cavilhaQty = 0;
  let corredicaPieces = 0;
  let dobradicaQty = 0;
  let suporteQty = 0;
  const others = new Map<string, FerragensTotaisArmazemRow>();

  for (const row of input.ferragens) {
    const bucket = classifyFerragem(row.material, row.ref);
    const qty = Math.max(0, Math.floor(Number(row.quantidade) || 0));
    if (qty <= 0) continue;

    switch (bucket) {
      case "parafuso_puxador":
      case "prego_costa":
        break;
      case "cavilha":
        cavilhaQty += qty;
        break;
      case "corredica":
        corredicaPieces += qty;
        break;
      case "dobradica":
        dobradicaQty += qty;
        break;
      case "suporte":
        suporteQty += qty;
        break;
      default: {
        const key = `${normalizeKey(row.material)}||${normalizeKey(row.ref)}||${normalizeKey(row.medida)}`;
        const prev = others.get(key);
        if (prev) prev.quantidade += qty;
        else {
          others.set(key, {
            material: row.material,
            ref: row.ref === "—" ? "" : row.ref,
            medida: row.medida === "—" ? "" : row.medida,
            quantidade: qty,
          });
        }
        break;
      }
    }
  }

  const result: FerragensTotaisArmazemRow[] = [];

  if (cavilhaQty > 0) {
    result.push({
      material: "Cavilha 10mm",
      ref: "",
      medida: "10mm",
      quantidade: cavilhaQty,
    });
  }

  const pairs = Math.floor(corredicaPieces / 2);
  for (const row of distributeCorredicaPairsByLength(pairs, input.boxes ?? [])) {
    result.push({
      material: "Corrediça",
      ref: "",
      medida: `${row.lengthMm}mm`,
      quantidade: row.qty,
    });
  }

  if (dobradicaQty > 0) {
    result.push({
      material: "Dobradiça",
      ref: "8654i",
      medida: "35mm",
      quantidade: dobradicaQty,
    });
  }

  const parafusosCosta = countParafusosCosta3x30(input.cutlistItems ?? []);
  if (parafusosCosta > 0) {
    result.push({
      material: "Parafuso 3x30",
      ref: "",
      medida: "3×30mm",
      quantidade: parafusosCosta,
    });
  }

  if (suporteQty > 0) {
    result.push({
      material: "Suporte de Prateleira",
      ref: "",
      medida: "",
      quantidade: suporteQty,
    });
  }

  for (const row of others.values()) {
    result.push(row);
  }

  return result.sort((a, b) => a.material.localeCompare(b.material, "pt"));
}
