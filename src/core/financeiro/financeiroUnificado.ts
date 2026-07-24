/**
 * P3.5/P3.6 — Financeiro Unificado (SSOT).
 * Total = materiais + ADM + montagem + portes + IVA(materiais).
 * Sem margem comercial.
 */

import type { ProjectState } from "../../context/projectTypes";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  CHAPA_PADRAO_ALTURA,
  CHAPA_PADRAO_LARGURA,
  DENSIDADE_PADRAO,
} from "../manufacturing/materials";
import { buildCutlistItemsForIndustrialExport } from "../fabrication/buildCutlistItemsForIndustrialExport";
import { ferragensFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { computeChapasReal } from "../industrial/computeChapasReal";
import { getLayoutKerfMmForCncNesting } from "../cnc/tcnGenerator";
import { getSettings } from "../settings/settingsService";
import { isDrawerPieceTipo } from "../../services/drawerCutlistAdapter";
import type { IndustrialPieceEditsStore } from "../industrial/industrialPieceEditsTypes";
import {
  computeFinanceiroAdminCustos,
  defaultFinanceiroAdminSettings,
  loadGlobalFinanceiroAdminSettings,
  normalizeFinanceiroAdminSettings,
  type FinanceiroAdminSettings,
} from "./financeiroAdminRules";
import {
  FINANCEIRO_CUSTO_MATERIAL_KEYS,
  FINANCEIRO_IVA_DEFAULT_PCT,
  normalizeFinanceiroOverrides,
  type FinanceiroCustoKey,
  type FinanceiroOverrides,
  type FinanceiroUnificadoSnapshot,
} from "./financeiroUnificadoTypes";

export type FinanceiroUnificadoProjectSlice = Pick<
  ProjectState,
  | "boxes"
  | "rules"
  | "materialId"
  | "projectName"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
  | "ferragemOrla"
> & {
  industrialPieceEdits?: IndustrialPieceEditsStore;
  financeiroOverrides?: FinanceiroOverrides;
  financeiroAdminSettings?: FinanceiroAdminSettings;
};

function pieceWeightKg(
  item: CutListItemComPreco,
  materials: MaterialIndustrial[]
): number {
  const largura = item.dimensoes?.largura ?? 0;
  const altura = item.dimensoes?.altura ?? 0;
  const espessura = item.espessura ?? item.dimensoes?.profundidade ?? 18;
  const qty = item.quantidade ?? 1;
  const mat = materials.find(
    (m) => m.nome === item.material || m.id === item.material || m.id === item.materialId
  );
  const densidade = mat?.densidade ?? DENSIDADE_PADRAO;
  const volumeM3 = (largura * altura * espessura * qty) / 1_000_000_000;
  return volumeM3 * densidade;
}

export function classifyFinanceiroCustoKey(tipo: string): FinanceiroCustoKey {
  const t = String(tipo ?? "").toLowerCase();
  if (t.includes("porta")) return "portas";
  if (isDrawerPieceTipo(tipo) || t.includes("gaveta")) return "gavetas";
  if (
    t.includes("remate") ||
    t.includes("rodape") ||
    t.includes("roda_pe") ||
    t.includes("roda-pe") ||
    t.includes("rodapé")
  ) {
    return "remates";
  }
  return "paineis";
}

function boxVolumeMontadoM3(box: BoxModule): number {
  const d = box.dimensoes;
  const L = Number(d?.largura) || 0;
  const A = Number(d?.altura) || 0;
  const P = Number(box.profundidadeExterna ?? d?.profundidade) || 0;
  if (L <= 0 || A <= 0 || P <= 0) return 0;
  return (L * A * P) / 1_000_000_000;
}

function estimateSerragemM2(cutlist: CutListItemComPreco[]): number {
  const kerf = getLayoutKerfMmForCncNesting(getSettings());
  if (!(kerf > 0) || cutlist.length === 0) return 0;
  let mm2 = 0;
  for (const item of cutlist) {
    const w = item.dimensoes?.largura ?? 0;
    const h = item.dimensoes?.altura ?? 0;
    const qty = item.quantidade ?? 1;
    if (w <= 0 || h <= 0) continue;
    mm2 += 2 * (w + h) * kerf * 0.5 * qty;
  }
  return mm2 / 1_000_000;
}

function emptyCustos(): Record<FinanceiroCustoKey, number> {
  return {
    paineis: 0,
    portas: 0,
    gavetas: 0,
    ferragens: 0,
    orla: 0,
    remates: 0,
    adm: 0,
    montagem: 0,
    portes: 0,
  };
}

function resolveAdminSettings(project: FinanceiroUnificadoProjectSlice): FinanceiroAdminSettings {
  if (project.financeiroAdminSettings) {
    return normalizeFinanceiroAdminSettings(project.financeiroAdminSettings);
  }
  try {
    return loadGlobalFinanceiroAdminSettings();
  } catch {
    return defaultFinanceiroAdminSettings();
  }
}

/**
 * Calcula o snapshot financeiro unificado (SSOT).
 */
export function computeFinanceiroUnificado(
  project: FinanceiroUnificadoProjectSlice,
  materials: MaterialIndustrial[] = []
): FinanceiroUnificadoSnapshot {
  const boxes = project.boxes ?? [];
  const projectName = project.projectName?.trim() || "Projeto";
  const overrides = normalizeFinanceiroOverrides(project.financeiroOverrides);
  const adminSettings = resolveAdminSettings(project);

  const cutlist = buildCutlistItemsForIndustrialExport({
    boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    industrialPieceEdits: project.industrialPieceEdits,
  });

  const ferragens = ferragensFromBoxes(boxes, project.rules);
  const pecasTotais = cutlist.reduce((s, i) => s + (i.quantidade ?? 0), 0);
  const ferragensTotais = ferragens.reduce((s, a) => s + (a.quantidade ?? 0), 0);

  const areaTotalMm2 = cutlist.reduce(
    (s, i) => s + (i.dimensoes?.largura ?? 0) * (i.dimensoes?.altura ?? 0) * (i.quantidade ?? 0),
    0
  );
  const areaTotalM2 = areaTotalMm2 / 1_000_000;
  const pesoTotalKg = cutlist.reduce((s, i) => s + pieceWeightKg(i, materials), 0);
  const areaTotalMontadoM3 = boxes.reduce((s, b) => s + boxVolumeMontadoM3(b), 0);

  const orlaTotalM = Number(project.ferragemOrla?.metrosTotal) || 0;
  const custoOrla = Number(project.ferragemOrla?.custoTotal) || 0;

  const custosComputed = emptyCustos();
  for (const item of cutlist) {
    const key = classifyFinanceiroCustoKey(String(item.tipo ?? ""));
    if (key === "adm" || key === "montagem" || key === "portes") continue;
    custosComputed[key] += Number(item.precoTotal) || 0;
  }
  custosComputed.ferragens = ferragens.reduce((s, a) => s + (Number(a.precoTotal) || 0), 0);
  custosComputed.orla = custoOrla;

  // Materiais efetivos (com overrides) ? base para ADM/montagem/portes e IVA
  const custosEffective = emptyCustos();
  const custoKeysOverridden: FinanceiroCustoKey[] = [];
  for (const key of FINANCEIRO_CUSTO_MATERIAL_KEYS) {
    const ov = overrides.custos?.[key];
    if (typeof ov === "number" && Number.isFinite(ov) && ov >= 0) {
      custosEffective[key] = ov;
      custoKeysOverridden.push(key);
    } else {
      custosEffective[key] = custosComputed[key];
    }
  }

  const subtotal = FINANCEIRO_CUSTO_MATERIAL_KEYS.reduce((s, k) => s + custosEffective[k], 0);

  const distanciaKm =
    typeof overrides.distanciaKm === "number" && Number.isFinite(overrides.distanciaKm)
      ? overrides.distanciaKm
      : adminSettings.distanciaKmDefault;

  const adminCalc = computeFinanceiroAdminCustos({
    subtotalMateriais: subtotal,
    caixas: boxes.length,
    pesoTotalKg,
    volumeMontadoM3: areaTotalMontadoM3,
    distanciaKm,
    settings: adminSettings,
  });

  custosComputed.adm = adminCalc.adm;
  custosComputed.montagem = adminCalc.montagem;
  custosComputed.portes = adminCalc.portes;

  for (const key of ["adm", "montagem", "portes"] as const) {
    const ov = overrides.custos?.[key];
    if (typeof ov === "number" && Number.isFinite(ov) && ov >= 0) {
      custosEffective[key] = ov;
      custoKeysOverridden.push(key);
    } else {
      custosEffective[key] = custosComputed[key];
    }
  }

  const ivaPct =
    typeof overrides.ivaPct === "number" && Number.isFinite(overrides.ivaPct)
      ? overrides.ivaPct
      : FINANCEIRO_IVA_DEFAULT_PCT;
  // IVA sobre subtotal de materiais (antes de ADM/montagem/portes) — P3.5 confirmado
  const ivaValor = subtotal * (ivaPct / 100);
  const subtotalComAdmin =
    subtotal + custosEffective.adm + custosEffective.montagem + custosEffective.portes;
  const totalProjeto = subtotalComAdmin + ivaValor;

  const chapasReal = computeChapasReal(cutlist, projectName, boxes);
  const areaChapaMm2 = CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA;
  const chapasEstimadas = areaTotalMm2 > 0 ? Math.ceil(areaTotalMm2 / areaChapaMm2) : 0;
  const isReal = chapasReal.sheets.length > 0;

  return {
    caixas: boxes.length,
    pecasTotais,
    areaTotalM2,
    pesoTotalKg,
    areaTotalMontadoM3,
    chapas: {
      count: isReal ? chapasReal.totalSheets : chapasEstimadas,
      mode: isReal ? "real" : "estimado",
    },
    desperdicioTotalM2: isReal ? chapasReal.totalWasteMm2 / 1_000_000 : 0,
    serragemTotalM2: estimateSerragemM2(cutlist),
    ferragensTotais,
    orlaTotalM,
    custosComputed,
    custosEffective,
    custoKeysOverridden,
    ivaPct,
    distanciaKm: adminCalc.distanciaKm,
    subtotal,
    subtotalComAdmin,
    ivaValor,
    totalProjeto,
    overrides,
    adminSettings,
  };
}

/** Linhas PDF/UI de métricas (bloco A). */
export function financeiroMetricRows(snap: FinanceiroUnificadoSnapshot): Array<[string, string]> {
  const chapasLabel =
    snap.chapas.mode === "real" ? `Nº de chapas (Real)` : `Nº de chapas (Estimado)`;
  return [
    ["Caixas", String(snap.caixas)],
    ["Peças totais", String(snap.pecasTotais)],
    ["Área total", `${snap.areaTotalM2.toFixed(3)} m²`],
    ["Peso total", `${snap.pesoTotalKg.toFixed(2)} kg`],
    ["Área total montado", `${snap.areaTotalMontadoM3.toFixed(3)} m³`],
    [chapasLabel, String(snap.chapas.count)],
    ["Desperdício total", `${snap.desperdicioTotalM2.toFixed(3)} m²`],
    ["Serragem total", `${snap.serragemTotalM2.toFixed(3)} m²`],
    ["Ferragens totais", String(snap.ferragensTotais)],
    ["Orla total", `${snap.orlaTotalM.toFixed(2)} m`],
    ["Distância (portes)", `${snap.distanciaKm.toFixed(1)} km`],
  ];
}

/** Linhas de custos (bloco B) — valores efetivos. */
export function financeiroCustoRows(
  snap: FinanceiroUnificadoSnapshot
): Array<{ label: string; valor: number | null; emBreve?: boolean; total?: boolean }> {
  return [
    { label: "Painéis", valor: snap.custosEffective.paineis },
    { label: "Portas", valor: snap.custosEffective.portas },
    { label: "Gavetas", valor: snap.custosEffective.gavetas },
    { label: "Ferragens", valor: snap.custosEffective.ferragens },
    { label: "Orla", valor: snap.custosEffective.orla },
    { label: "Remates", valor: snap.custosEffective.remates },
    { label: "ADM", valor: snap.custosEffective.adm },
    { label: "Montagem", valor: snap.custosEffective.montagem },
    { label: "Portes", valor: snap.custosEffective.portes },
    { label: `IVA (${snap.ivaPct}%)`, valor: snap.ivaValor },
    { label: "Total projeto", valor: snap.totalProjeto, total: true },
  ];
}
