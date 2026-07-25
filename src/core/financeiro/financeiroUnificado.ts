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
  compareFerragensAvsB,
  priceFerragensFromCatalog,
} from "./priceFerragensFromCatalog";
import { computeOperacoesFinanceiras } from "./computeOperacoesFinanceiras";
import {
  computeDesperdicioSerragemFinanceiras,
  estimateSerragemM2,
} from "./computeDesperdicioSerragemFinanceiras";
import { computeCustosAvancadosFinanceiras } from "./computeCustosAvancadosFinanceiras";
import { computeOperacoesIndustriaisAvancadas } from "./computeOperacoesIndustriaisAvancadas";
import {
  FINANCEIRO_CUSTO_MATERIAL_KEYS,
  FINANCEIRO_IVA_DEFAULT_PCT,
  FINANCEIRO_PIECE_MATERIAL_KEYS,
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

function emptyCustos(): Record<FinanceiroCustoKey, number> {
  return {
    paineis: 0,
    portas: 0,
    gavetas: 0,
    ferragens: 0,
    orla: 0,
    remates: 0,
    operacoes: 0,
    desperdicio: 0,
    serragem: 0,
    chapasReais: 0,
    maoDeObra: 0,
    logistica: 0,
    operacoesAvancadas: 0,
    adm: 0,
    montagem: 0,
    portes: 0,
  };
}

const NON_CUTLIST_CUSTO_KEYS = new Set<FinanceiroCustoKey>([
  "adm",
  "montagem",
  "portes",
  "operacoes",
  "desperdicio",
  "serragem",
  "chapasReais",
  "maoDeObra",
  "logistica",
  "operacoesAvancadas",
]);

function resolveAdminSettings(project: FinanceiroUnificadoProjectSlice): FinanceiroAdminSettings {
  if (project.financeiroAdminSettings) {
    return normalizeFinanceiroAdminSettings(project.financeiroAdminSettings);
  }
  try {
    const fromSystem = getSettings().financeiroAdmin;
    if (fromSystem) return normalizeFinanceiroAdminSettings(fromSystem);
  } catch {
    /* ignore */
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

  const enableUnificacao =
    getSettings().orcamentos?.ferragens?.enableUnificacao === true;

  let ferragensTotais = 0;
  let ferragensEur = 0;
  let ferragensUnificacao: FinanceiroUnificadoSnapshot["ferragensUnificacao"];

  if (enableUnificacao) {
    const priced = priceFerragensFromCatalog({ cutlist });
    ferragensTotais = priced.totalQty;
    ferragensEur = priced.totalEur;
    let compare: ReturnType<typeof compareFerragensAvsB> | undefined;
    try {
      compare = compareFerragensAvsB(boxes, project.rules, cutlist);
    } catch {
      /* STRICT */
    }
    ferragensUnificacao = {
      enabled: true,
      warnings: priced.warnings,
      fallbacks: priced.fallbacks,
      compare,
    };
  } else {
    const ferragens = ferragensFromBoxes(boxes, project.rules);
    ferragensTotais = ferragens.reduce((s, a) => s + (a.quantidade ?? 0), 0);
    ferragensEur = ferragens.reduce((s, a) => s + (Number(a.precoTotal) || 0), 0);
  }

  const pecasTotais = cutlist.reduce((s, i) => s + (i.quantidade ?? 0), 0);

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
    if (NON_CUTLIST_CUSTO_KEYS.has(key)) continue;
    custosComputed[key] += Number(item.precoTotal) || 0;
  }
  custosComputed.ferragens = ferragensEur;
  custosComputed.orla = custoOrla;

  const opsFinanceiras = computeOperacoesFinanceiras(cutlist);
  custosComputed.operacoes = opsFinanceiras.precoTotal;
  const operacoesBreakdown = {
    cnc: opsFinanceiras.precoCNC,
    drill: opsFinanceiras.precoDrill,
    total: opsFinanceiras.precoTotal,
  };

  // Chapas reais 1× — métricas + desperdício € + F3c avançados
  const chapasReal = computeChapasReal(cutlist, projectName, boxes);
  const isReal = chapasReal.sheets.length > 0;
  const wasteM2 = isReal ? chapasReal.totalWasteMm2 / 1_000_000 : 0;
  const serragemM2 = estimateSerragemM2(cutlist);
  const despSerr = computeDesperdicioSerragemFinanceiras({
    cutlist,
    wasteM2,
    serragemM2,
  });
  custosComputed.desperdicio = despSerr.precoDesperdicio;
  custosComputed.serragem = despSerr.precoSerragem;
  const desperdicioSerragemWarnings = despSerr.warnings;

  const pesoByPieceId = new Map<string, number>();
  for (const item of cutlist) {
    const id = String(item.id ?? "");
    if (!id) continue;
    pesoByPieceId.set(id, pieceWeightKg(item, materials));
  }
  const avancados = computeCustosAvancadosFinanceiras({
    cutlist,
    chapasCount: isReal ? chapasReal.totalSheets : 0,
    chapasModeReal: isReal,
    pesoTotalKg,
    pesoByPieceId,
  });
  if (avancados.suppressPieceMaterial) {
    for (const k of FINANCEIRO_PIECE_MATERIAL_KEYS) {
      custosComputed[k] = 0;
    }
  }
  custosComputed.chapasReais = avancados.precoChapasReais;
  custosComputed.maoDeObra = avancados.precoMaoDeObra;
  custosComputed.logistica = avancados.precoLogistica;
  const custosAvancadosWarnings = avancados.warnings;

  const opsAvancadas = computeOperacoesIndustriaisAvancadas(cutlist);
  custosComputed.operacoesAvancadas = opsAvancadas.precoTotal;
  const operacoesAvancadasBreakdown = {
    foros: opsAvancadas.foros,
    grupos: opsAvancadas.grupos,
    rasgos: opsAvancadas.rasgos,
    cortes: opsAvancadas.cortes,
    quadrilha: opsAvancadas.quadrilha,
    total: opsAvancadas.precoTotal,
  };

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

  // Portes = 0 sem escolha explícita (incluirPortes ou override manual de custos.portes).
  const portesOverride = overrides.custos?.portes;
  const hasManualPortesOverride =
    typeof portesOverride === "number" && Number.isFinite(portesOverride) && portesOverride >= 0;
  const hasExplicitPortes = overrides.incluirPortes === true || hasManualPortesOverride;

  const adminSettingsForCalc: FinanceiroAdminSettings = hasExplicitPortes
    ? {
        ...adminSettings,
        // Com escolha explícita, aplicar tarifas mesmo se o default admin estiver off.
        portes: { ...adminSettings.portes, enabled: true },
      }
    : {
        ...adminSettings,
        portes: { ...adminSettings.portes, enabled: false },
      };

  const adminCalc = computeFinanceiroAdminCustos({
    subtotalMateriais: subtotal,
    caixas: boxes.length,
    pesoTotalKg,
    volumeMontadoM3: areaTotalMontadoM3,
    distanciaKm,
    settings: adminSettingsForCalc,
  });

  custosComputed.adm = adminCalc.adm;
  custosComputed.montagem = adminCalc.montagem;
  custosComputed.portes = hasExplicitPortes ? adminCalc.portes : 0;

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
      : (() => {
          try {
            const fromSettings = getSettings().ivaPctDefault;
            if (typeof fromSettings === "number" && Number.isFinite(fromSettings)) return fromSettings;
          } catch {
            /* ignore */
          }
          return FINANCEIRO_IVA_DEFAULT_PCT;
        })();
  // IVA sobre subtotal de materiais (antes de ADM/montagem/portes) — P3.5 confirmado
  const ivaValor = subtotal * (ivaPct / 100);
  const subtotalComAdmin =
    subtotal + custosEffective.adm + custosEffective.montagem + custosEffective.portes;
  const totalProjeto = subtotalComAdmin + ivaValor;

  const areaChapaMm2 = CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA;
  const chapasEstimadas = areaTotalMm2 > 0 ? Math.ceil(areaTotalMm2 / areaChapaMm2) : 0;

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
    desperdicioTotalM2: wasteM2,
    serragemTotalM2: serragemM2,
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
    operacoesBreakdown,
    desperdicioSerragemWarnings,
    custosAvancadosWarnings,
    materialCostMode: avancados.materialCostMode,
    operacoesAvancadasBreakdown,
    ferragensUnificacao,
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
  const rows: Array<{ label: string; valor: number | null; emBreve?: boolean; total?: boolean }> = [
    { label: "Painéis", valor: snap.custosEffective.paineis },
    { label: "Portas", valor: snap.custosEffective.portas },
    { label: "Gavetas", valor: snap.custosEffective.gavetas },
    { label: "Ferragens", valor: snap.custosEffective.ferragens },
    { label: "Orla", valor: snap.custosEffective.orla },
  ];
  // Remates só aparecem com pelo menos uma peça remate/rodapé com custo > 0.
  if ((snap.custosEffective.remates ?? 0) > 0) {
    rows.push({ label: "Remates / Rodapes", valor: snap.custosEffective.remates });
  }
  rows.push(
    { label: "Operacoes (CNC/Drill)", valor: snap.custosEffective.operacoes },
    { label: "Desperdicio", valor: snap.custosEffective.desperdicio },
    { label: "Serragem", valor: snap.custosEffective.serragem },
    { label: "Chapas reais", valor: snap.custosEffective.chapasReais },
    { label: "Mao de obra", valor: snap.custosEffective.maoDeObra },
    { label: "Logistica", valor: snap.custosEffective.logistica },
    { label: "Ops avancadas", valor: snap.custosEffective.operacoesAvancadas },
    { label: "ADM", valor: snap.custosEffective.adm },
    { label: "Montagem", valor: snap.custosEffective.montagem },
    { label: "Portes", valor: snap.custosEffective.portes },
    { label: `IVA (${snap.ivaPct}%)`, valor: snap.ivaValor },
    { label: "Total projeto", valor: snap.totalProjeto, total: true }
  );
  return rows;
}
