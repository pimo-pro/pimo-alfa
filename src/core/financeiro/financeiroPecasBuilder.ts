/**
 * P3.7 — Builder SSOT — Financeiro peçasó.
 * Linhas detalhadas por peça: cutlist industrial + indicadores + preço.
 * Não altera CNC/TCN.
 */

import type { ProjectState } from "../../context/projectTypes";
import type { CutListItemComPreco } from "../types";
import type { MaterialIndustrial } from "../manufacturing/materials";
import { DENSIDADE_PADRAO } from "../manufacturing/materials";
import { buildCutlistItemsForIndustrialExport } from "../fabrication/buildCutlistItemsForIndustrialExport";
import { panelIdFromCutListItem } from "../observacoes/ObservacoesService";
import { lookupPieceOrlaConfig } from "../orla/orlaCalculator";
import { ORLA_SIDES, type PieceOrlaConfig } from "../orla/orlaTypes";
import { COMPONENT_TYPES_DEFAULT, type ComponentType } from "../components/componentTypes";
import { safeGetItem } from "../../utils/storage";
import {
  buildIndustrialListPiecesPerSheet,
  resolveIndustrialListNqr,
} from "../pdf/industrialListQr";
import { formatEtqForPdf } from "../pdf/pdfIndustrialListShell";
import { classifyFinanceiroCustoKey } from "./financeiroUnificado";
import {
  computeFinanceiroUnificado,
  type FinanceiroUnificadoProjectSlice,
} from "./financeiroUnificado";
import type { FinanceiroCustoMaterialKey } from "./financeiroUnificadoTypes";
import { FINANCEIRO_CUSTO_MATERIAL_KEYS } from "./financeiroUnificadoTypes";

export type FinanceiroPecaRow = {
  pieceId: string;
  caixa: string;
  tipo: string;
  material: string;
  qtd: number;
  dimensoes: string;
  pesoKg: number;
  hasOrla: boolean;
  hasCnc: boolean;
  hasDrill: boolean;
  ferragensQty: number;
  etq: string;
  preco: number;
  custoKey: FinanceiroCustoMaterialKey;
};

export type FinanceiroPecasBuildInput = FinanceiroUnificadoProjectSlice &
  Pick<ProjectState, "orlaPieces" | "orlaPresets" | "rules"> & {
    industrialPieceEdits?: ProjectState["industrialPieceEdits"];
  };

const TIPO_TO_COMPONENT_ID: Record<string, string> = {
  cima: "cima",
  fundo: "fundo",
  lateral_esquerda: "lateral_esquerda",
  lateral_direita: "lateral_direita",
  COSTA: "costa",
  costa: "costa",
  prateleira: "prateleira",
  porta_dupla: "porta",
  porta_simples: "porta",
  porta_correr: "porta",
  gaveta_frente: "gaveta_frente",
  gaveta_frente_ext: "gaveta_frente",
  gaveta_lat_esq: "gaveta_lat_esq",
  gaveta_lat_dir: "gaveta_lat_dir",
  gaveta_fundo: "gaveta_fundo",
  gaveta_traseira: "gaveta_traseira",
};

const JOINT_FERRAGEM_IDS = new Set(["cavilha_8mm", "cavilha_10mm", "parafuso_4x50"]);
const JOINT_COUNT_PIECE_TIPOS = new Set(["cima", "fundo"]);

function loadComponentTypes(): ComponentType[] {
  const raw = safeGetItem("pimo_component_types");
  if (!raw) return COMPONENT_TYPES_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as ComponentType[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : COMPONENT_TYPES_DEFAULT;
  } catch {
    return COMPONENT_TYPES_DEFAULT;
  }
}

function pieceWeightKg(item: CutListItemComPreco, materials: MaterialIndustrial[]): number {
  const largura = item.dimensoes?.largura ?? 0;
  const altura = item.dimensoes?.altura ?? 0;
  const espessura = item.espessura ?? item.dimensoes?.profundidade ?? 18;
  const qty = item.quantidade ?? 1;
  const mat = materials.find(
    (m) => m.nome === item.material || m.id === item.material || m.id === item.materialId
  );
  const densidade = mat?.densidade ?? DENSIDADE_PADRAO;
  return ((largura * altura * espessura * qty) / 1_000_000_000) * densidade;
}

function pieceHasOrla(
  item: CutListItemComPreco,
  orlaPieces: Record<string, PieceOrlaConfig> | undefined
): boolean {
  const metaOrla = item.metadata?.orla as PieceOrlaConfig["sides"] | undefined;
  if (metaOrla && typeof metaOrla === "object") {
    for (const side of ORLA_SIDES) {
      if (metaOrla[side]?.enabled) return true;
    }
  }
  const key = panelIdFromCutListItem(item);
  const cfg = lookupPieceOrlaConfig(key, orlaPieces ?? {});
  if (!cfg) return false;
  return ORLA_SIDES.some((side) => cfg.sides[side]?.enabled);
}

/** CNC: peça de chapa nestável (área + espessura). Sem ler ficheiros TCN. */
function pieceHasCnc(item: CutListItemComPreco): boolean {
  const w = item.dimensoes?.largura ?? 0;
  const h = item.dimensoes?.altura ?? 0;
  const e = item.espessura ?? item.dimensoes?.profundidade ?? 0;
  return w > 0 && h > 0 && e > 0;
}

function pieceHasDrill(item: CutListItemComPreco): boolean {
  return (item.drillHoles?.length ?? 0) > 0;
}

function countFerragensForPiece(
  item: CutListItemComPreco,
  ctById: Record<string, ComponentType>
): number {
  const componentId = TIPO_TO_COMPONENT_ID[item.tipo] ?? item.tipo;
  const ct = ctById[componentId];
  const defs = ct?.ferragens_default ?? [];
  if (defs.length === 0) return 0;

  const pieceTipo = String(item.tipo ?? "");
  const qtyMult = Math.max(1, item.quantidade ?? 1);
  let total = 0;
  for (const def of defs) {
    if (JOINT_FERRAGEM_IDS.has(def.ferragem_id) && !JOINT_COUNT_PIECE_TIPOS.has(pieceTipo)) {
      continue;
    }
    const qtdBase =
      def.quantidade_fixa ??
      (def.quantidade_por_lado != null
        ? def.quantidade_por_lado * Math.max(1, def.aplicar_em?.length ?? 1)
        : 1);
    total += qtdBase * qtyMult;
  }
  return total;
}

function resolveEtq(
  item: CutListItemComPreco,
  projectName: string,
  boxes: ProjectState["boxes"],
  rules: ProjectState["rules"],
  piecesPerSheet: Map<string, number>,
  index0: number
): string {
  const nqr = resolveIndustrialListNqr(
    item,
    { projectName, boxes: boxes ?? [], rules },
    piecesPerSheet,
    index0
  );
  return formatEtqForPdf(nqr) || String(item.pieceNumber ?? item.shortCode ?? "—");
}

/**
 * Constrói as linhas da tabela Financeiro peças (SSOT).
 * Preços individuais respeitam overrides de categoria (escala proporcional).
 */
export function buildFinanceiroPecasRows(
  project: FinanceiroPecasBuildInput,
  materials: MaterialIndustrial[] = []
): FinanceiroPecaRow[] {
  const boxes = project.boxes ?? [];
  const projectName = project.projectName?.trim() || "Projeto";
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
  const snap = computeFinanceiroUnificado(project, materials);

  const scales = {} as Record<FinanceiroCustoMaterialKey, number>;
  for (const key of FINANCEIRO_CUSTO_MATERIAL_KEYS) {
    const computed = snap.custosComputed[key];
    const effective = snap.custosEffective[key];
    scales[key] = computed > 0 ? effective / computed : 1;
  }

  const ctById = Object.fromEntries(loadComponentTypes().map((ct) => [ct.id, ct]));
  const boxNomeById = Object.fromEntries(boxes.map((b) => [b.id, b.nome?.trim() || b.id]));
  const piecesPerSheet = buildIndustrialListPiecesPerSheet(cutlist);
  const orlaPieces = project.orlaPieces ?? {};

  return cutlist.map((item, index0) => {
    const custoKeyRaw = classifyFinanceiroCustoKey(String(item.tipo ?? ""));
    const custoKey: FinanceiroCustoMaterialKey =
      custoKeyRaw === "adm" || custoKeyRaw === "montagem" || custoKeyRaw === "portes"
        ? "paineis"
        : (custoKeyRaw as FinanceiroCustoMaterialKey);
    const basePreco = Number(item.precoTotal) || 0;
    const preco = Math.round(basePreco * (scales[custoKey] ?? 1) * 100) / 100;
    const L = item.dimensoes?.largura ?? 0;
    const A = item.dimensoes?.altura ?? 0;
    const E = item.espessura ?? item.dimensoes?.profundidade ?? 0;

    return {
      pieceId: item.id,
      caixa: boxNomeById[item.boxId ?? ""] ?? item.boxId ?? "—",
      tipo: String(item.tipo ?? item.nome ?? "—"),
      material: String(item.material ?? item.materialId ?? "—"),
      qtd: item.quantidade ?? 1,
      dimensoes: `${L}×${A}×${E}`,
      pesoKg: pieceWeightKg(item, materials),
      hasOrla: pieceHasOrla(item, orlaPieces),
      hasCnc: pieceHasCnc(item),
      hasDrill: pieceHasDrill(item),
      ferragensQty: countFerragensForPiece(item, ctById),
      etq: resolveEtq(item, projectName, boxes, project.rules, piecesPerSheet, index0),
      preco,
      custoKey,
    };
  });
}

/** Linhas prontas para PDF (strings). */
export function buildFinanceiroPecasPdfRows(
  project: FinanceiroPecasBuildInput,
  materials: MaterialIndustrial[],
  showPrices: boolean
): string[][] {
  const rows = buildFinanceiroPecasRows(project, materials);
  return rows.map((r) => {
    const base = [
      r.caixa,
      r.tipo,
      r.material,
      String(r.qtd),
      r.dimensoes,
      r.pesoKg.toFixed(2),
      r.hasOrla ? "?" : "",
      r.hasCnc ? "?" : "",
      r.hasDrill ? "?" : "",
      r.ferragensQty > 0 ? String(r.ferragensQty) : "",
      r.etq,
    ];
    if (showPrices) base.push(r.preco.toFixed(2));
    return base;
  });
}

export function financeiroPecasPdfHead(showPrices: boolean): string[] {
  const head = [
    "Caixa",
    "Tipo",
    "Material",
    "Qtd",
    "L×A×E",
    "Peso",
    "Orla",
    "CNC",
    "Drill",
    "Ferr.",
    "Nº ETQ",
  ];
  if (showPrices) head.push("Preço €");
  return head;
}
