import {
  cutlistComPrecoFromBoxes,
  ferragensFromBoxes,
} from "../manufacturing/cutlistFromBoxes";
import {
  calcularPrecoTotalPecas,
  calcularPrecoTotalProjeto,
} from "../pricing/pricing";
import {
  CHAPA_PADRAO_LARGURA,
  CHAPA_PADRAO_ALTURA,
  DENSIDADE_PADRAO,
} from "../manufacturing/materials";
import { buildCutlistItemsForIndustrialExport } from "../fabrication/buildCutlistItemsForIndustrialExport";
import { buildIndustrialFerragensForProject } from "../industriais/buildIndustrialFerragensForProject";
import { gerarFerragensIndustriais, agruparPorComponente } from "../industriais/ferragensIndustriais";
import { computeChapasReal } from "./computeChapasReal";
import { getSheetDefinitionFromSettings } from "../cnc/cncPipeline";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { ProjectState } from "../../context/projectTypes";
import { formatCurrency } from "../../utils/formatting";
import { formatObservacoesForPdf, resolveObservacoesForCutListItem } from "../observacoes/ObservacoesService";
import type { PieceObservacoesStore } from "../observacoes/observacoesTypes";
import type { IndustrialPieceEditsStore } from "./industrialPieceEditsTypes";
import { isIndustrialPieceEdited, computeIndustrialPieceMetrics } from "./IndustrialPieceEditsService";
import {
  listPesPlasticoPorCaixa,
  loadPesPlasticoConfig,
  PE_PLASTICO_NOME,
} from "../ferragens/pesPlasticoConfig";

export type PecasTotaisRow = {
  categoria: string;
  caixa: string;
  tipo: string;
  dimensoes: string;
  material: string;
  pesoKg: number;
  qtd: number;
};

function pieceWeightKg(
  item: { dimensoes: { largura: number; altura: number; profundidade?: number }; espessura?: number; quantidade: number; material?: string },
  materials: MaterialIndustrial[]
): number {
  const largura = item.dimensoes.largura ?? 0;
  const altura = item.dimensoes.altura ?? 0;
  const espessura = item.espessura ?? item.dimensoes.profundidade ?? 18;
  const qty = item.quantidade ?? 1;
  const mat = materials.find((m) => m.nome === item.material);
  const densidade = mat?.densidade ?? DENSIDADE_PADRAO;
  const volumeM3 = (largura * altura * espessura * qty) / 1_000_000_000;
  return volumeM3 * densidade;
}

export function buildPecasTotaisRows(
  project: Pick<
    ProjectState,
    | "boxes"
    | "rules"
    | "materialId"
    | "projectName"
    | "remates"
    | "rodapes"
    | "extractedPartsByBoxId"
  > & { industrialPieceEdits?: import("./industrialPieceEditsTypes").IndustrialPieceEditsStore },
  materials: MaterialIndustrial[]
): PecasTotaisRow[] {
  const boxes = project.boxes ?? [];
  const items = buildCutlistItemsForIndustrialExport({
    boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName: project.projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    industrialPieceEdits: project.industrialPieceEdits,
  });
  const boxNomeById = Object.fromEntries(boxes.map((b) => [b.id, b.nome?.trim() || b.id]));
  const rows: PecasTotaisRow[] = [];

  for (const item of items) {
    const cat = item.tipo.includes("porta")
      ? "Porta"
      : item.tipo.includes("gaveta")
        ? "Gaveta"
        : item.tipo.includes("remate") || item.tipo.includes("orla")
          ? "Remate/Orla"
          : "Painel";
    rows.push({
      categoria: cat,
      caixa: boxNomeById[item.boxId ?? ""] ?? item.boxId ?? "—",
      tipo: item.tipo,
      dimensoes: `${item.dimensoes.largura}×${item.dimensoes.altura}×${item.dimensoes.profundidade ?? item.espessura} mm`,
      material: String(item.material ?? item.materialId ?? "—"),
      pesoKg: pieceWeightKg(item, materials),
      qtd: item.quantidade,
    });
  }
  return rows;
}

export function buildResumoFinanceiroPdfRows(
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string | undefined,
  materials: MaterialIndustrial[],
  showPrices: boolean
): { summary: string[][]; pecas: string[][] } {
  const cutlist = cutlistComPrecoFromBoxes(boxes, rules, materialId, projectName);
  const ferragens = ferragensFromBoxes(boxes, rules);
  const totalPecas = cutlist.reduce((s, i) => s + i.quantidade, 0);
  const totalFerragens = ferragens.reduce((s, a) => s + a.quantidade, 0);
  const areaTotalMm2 = cutlist.reduce(
    (s, i) => s + (i.dimensoes?.largura ?? 0) * (i.dimensoes?.altura ?? 0) * i.quantidade,
    0
  );
  const pesoTotalKg = cutlist.reduce((s, i) => s + pieceWeightKg(i, materials), 0);
  const areaChapaMm2 = CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA;
  const numeroChapas = areaTotalMm2 > 0 ? Math.ceil(areaTotalMm2 / areaChapaMm2) : 0;

  const summary: string[][] = [
    ["Peças totais", String(totalPecas)],
    ["Ferragens totais", String(totalFerragens)],
    ["Total de itens", String(totalPecas + totalFerragens)],
    ["Área total", `${(areaTotalMm2 / 1_000_000).toFixed(3)} m²`],
    ["Peso total", `${pesoTotalKg.toFixed(2)} kg`],
    ["Nº de chapas", String(numeroChapas)],
  ];

  if (showPrices) {
    const custoPecas = cutlist.length > 0 ? calcularPrecoTotalPecas(cutlist) : 0;
    const custoFerragens = ferragens.reduce((s, a) => s + (a.precoTotal ?? 0), 0);
    const total = calcularPrecoTotalProjeto(custoPecas + custoFerragens);
    summary.push(
      ["Total peças", formatCurrency(custoPecas, { placement: "prefix", empty: "—" })],
      ["Total ferragens", formatCurrency(custoFerragens, { placement: "prefix", empty: "—" })],
      ["Total projeto", formatCurrency(total, { placement: "prefix", empty: "—" })]
    );
  }

  const pecas: string[][] = cutlist.map((item) => [
    boxes.find((b) => b.id === item.boxId)?.nome ?? item.boxId ?? "—",
    item.tipo,
    `${item.dimensoes.largura}×${item.dimensoes.altura}×${item.espessura} mm`,
    String(item.quantidade),
    String(item.material ?? "—"),
  ]);

  return { summary, pecas };
}

export type FerragensTotaisArmazemRow = {
  material: string;
  ref: string;
  medida: string;
  quantidade: number;
  /** Preço unitário (€) — opcional, usado na apresentação do PDF ferragens_totais. */
  preco?: number;
};

type FerragensTotaisProjectSlice = Pick<
  ProjectState,
  | "boxes"
  | "rules"
  | "materialId"
  | "projectName"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
  | "pieceObservacoes"
>;

/**
 * Totais agregados para o PDF ferragens_totais (armazém):
 * chapas por material/espessura + ferragens somadas (sem caixa/peça).
 */
export function buildFerragensTotaisArmazemData(
  project: FerragensTotaisProjectSlice,
  _componentTypes: ComponentType[],
  catalogFerragens: Ferragem[],
  materials: MaterialIndustrial[]
): { materiaisChapas: FerragensTotaisArmazemRow[]; ferragens: FerragensTotaisArmazemRow[] } {
  const boxes = project.boxes ?? [];
  const projectName = project.projectName?.trim() || "Projeto";
  const items = buildCutlistItemsForIndustrialExport({
    boxes,
    rules: project.rules,
    materialId: project.materialId,
    projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    industrialPieceEdits: undefined,
  });

  const chapas = computeChapasReal(items, projectName, boxes);
  const sheetDef = getSheetDefinitionFromSettings();
  const defaultW = sheetDef.largura_mm || CHAPA_PADRAO_LARGURA;
  const defaultH = sheetDef.altura_mm || CHAPA_PADRAO_ALTURA;

  const chapasMap = new Map<
    string,
    { material: string; espessuraMm: number; qty: number; w: number; h: number }
  >();

  if (chapas.sheets.length > 0) {
    for (const s of chapas.sheets) {
      const key = `${s.material}||${s.espessuraMm}`;
      const prev = chapasMap.get(key);
      if (prev) {
        prev.qty += 1;
      } else {
        const mat = materials.find((m) => m.nome === s.material || m.id === s.material);
        chapasMap.set(key, {
          material: s.material,
          espessuraMm: s.espessuraMm,
          qty: 1,
          w: mat?.larguraChapa ?? defaultW,
          h: mat?.alturaChapa ?? defaultH,
        });
      }
    }
  } else if (chapas.totalSheets > 0) {
    const matName = sheetDef.materialName ?? "MDF";
    const esp = sheetDef.espessura_mm ?? 18;
    chapasMap.set(`${matName}||${esp}`, {
      material: matName,
      espessuraMm: esp,
      qty: chapas.totalSheets,
      w: defaultW,
      h: defaultH,
    });
  }

  const materiaisChapas: FerragensTotaisArmazemRow[] = [...chapasMap.values()]
    .sort((a, b) => a.material.localeCompare(b.material, "pt") || a.espessuraMm - b.espessuraMm)
    .map((r) => {
      const mat = materials.find((m) => m.nome === r.material || m.id === r.material);
      return {
        material: r.material,
        ref: mat?.id ?? "—",
        medida: `${r.w}×${r.h}×${r.espessuraMm} mm`,
        quantidade: r.qty,
      };
    });

  const industrial = buildIndustrialFerragensForProject({
    projectName: project.projectName,
    boxes,
    rules: project.rules,
    materialId: project.materialId,
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    pieceObservacoes: project.pieceObservacoes,
  });

  const byFerragem = new Map<string, { nome: string; ref: string; medida: string; qty: number }>();
  const catalogByNome = new Map(catalogFerragens.map((f) => [f.nome.trim().toLowerCase(), f]));
  const catalogById = new Map(catalogFerragens.map((f) => [f.id, f]));

  for (const row of industrial.rows) {
    const nome = row.ferragem.trim() || "—";
    const cat =
      catalogByNome.get(nome.toLowerCase()) ??
      catalogById.get(nome) ??
      catalogFerragens.find((f) => f.nome.includes(nome) || nome.includes(f.nome));
    const key = cat?.id ?? nome.toLowerCase();
    const prev = byFerragem.get(key);
    if (prev) {
      prev.qty += row.qtd;
    } else {
      byFerragem.set(key, {
        nome: cat?.nome ?? nome,
        ref: cat?.id ?? "—",
        medida: cat?.medidas?.trim() || "—",
        qty: row.qtd,
      });
    }
  }

  const ferragens: FerragensTotaisArmazemRow[] = [...byFerragem.values()]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt"))
    .map((r) => ({
      material: r.nome,
      ref: r.ref,
      medida: r.medida,
      quantidade: r.qty,
    }));

  return { materiaisChapas, ferragens };
}

export function buildFerragensTotaisPdfData(
  project: FerragensTotaisProjectSlice,
  componentTypes: ComponentType[],
  catalogFerragens: Ferragem[]
): { detalhe: string[][]; porTipo: string[][] } {
  const industrial = buildIndustrialFerragensForProject({
    projectName: project.projectName,
    boxes: project.boxes ?? [],
    rules: project.rules,
    materialId: project.materialId,
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    pieceObservacoes: project.pieceObservacoes,
  });

  const detalhe = industrial.rows.map((r) => [
    r.caixa,
    r.ferragem,
    String(r.qtd),
    r.material,
    r.codigoIndustrial,
  ]);

  const byTipo = new Map<string, number>();
  for (const row of industrial.rows) {
    const key = row.ferragem.trim() || "—";
    byTipo.set(key, (byTipo.get(key) ?? 0) + row.qtd);
  }

  const catalog = gerarFerragensIndustriais(componentTypes, catalogFerragens);
  for (const entry of catalog) {
    const key = entry.ferragem_id;
    const existing = byTipo.get(key) ?? 0;
    if (existing === 0) byTipo.set(key, entry.quantidade);
  }

  const porTipo = [...byTipo.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt"))
    .map(([tipo, total]) => [tipo, String(total)]);

  const porComponente = agruparPorComponente(gerarFerragensIndustriais(componentTypes, catalogFerragens));
  for (const [comp, entries] of porComponente.entries()) {
    const qty = entries.reduce((s, e) => s + e.quantidade, 0);
    if (!porTipo.some(([t]) => t === comp)) {
      porTipo.push([`${comp} (catálogo)`, String(qty)]);
    }
  }

  // Pés de plástico: ferragem de catálogo (não industrial) — só apresentação online/PDF.
  const peCfg = loadPesPlasticoConfig();
  const pePorCaixa = listPesPlasticoPorCaixa(project.boxes ?? [], project.rules, peCfg);
  let peTotalQty = 0;
  let peTotalPreco = 0;
  for (const pe of pePorCaixa) {
    peTotalQty += pe.quantidade;
    peTotalPreco += pe.precoTotal;
    detalhe.push([
      pe.caixa,
      PE_PLASTICO_NOME,
      String(pe.quantidade),
      pe.medida,
      formatCurrency(pe.precoTotal),
    ]);
  }
  if (peTotalQty > 0) {
    porTipo.push([
      PE_PLASTICO_NOME,
      `${peTotalQty} un · ${formatCurrency(peTotalPreco)}`,
    ]);
  }

  return { detalhe, porTipo };
}

export function buildTotaisProjetoPdfRows(
  boxes: BoxModule[],
  rules: RulesConfig,
  materialId: string | undefined,
  projectName: string | undefined,
  materials: MaterialIndustrial[],
  showPrices: boolean,
  extras?: {
    totalOrlaMetros?: number;
    custoTotalOrla?: number;
    custoTotalRemates?: number;
    custoTotalPaineis?: number;
    custoTotalPortas?: number;
    custoTotalGavetas?: number;
    custoTotalFerragens?: number;
    custoTotal?: number;
  }
): string[][] {
  const cutlist = cutlistComPrecoFromBoxes(boxes, rules, materialId, projectName);
  const ferragens = ferragensFromBoxes(boxes, rules);
  const totalPecas = cutlist.reduce((s, i) => s + i.quantidade, 0);
  const totalFerragens = ferragens.reduce((s, a) => s + a.quantidade, 0);
  const areaTotalMm2 = cutlist.reduce(
    (s, i) => s + (i.dimensoes?.largura ?? 0) * (i.dimensoes?.altura ?? 0) * i.quantidade,
    0
  );
  const pesoTotalKg = cutlist.reduce((s, i) => s + pieceWeightKg(i, materials), 0);
  const areaChapaMm2 = CHAPA_PADRAO_LARGURA * CHAPA_PADRAO_ALTURA;
  const numeroChapas = areaTotalMm2 > 0 ? Math.ceil(areaTotalMm2 / areaChapaMm2) : 0;

  const rows: string[][] = [
    ["Caixas", String(boxes.length)],
    ["Total de itens (peças)", String(totalPecas)],
    ["Ferragens (unidades)", String(totalFerragens)],
    ["Área total", `${(areaTotalMm2 / 1_000_000).toFixed(3)} m²`],
    ["Peso total", `${pesoTotalKg.toFixed(2)} kg`],
    ["Nº de chapas (estimado)", String(numeroChapas)],
  ];

  if (extras?.totalOrlaMetros != null) {
    rows.push(["Orla total", `${extras.totalOrlaMetros.toFixed(2)} m`]);
  }

  if (showPrices && extras) {
    rows.push(
      ["Custo painéis", formatCurrency(extras.custoTotalPaineis ?? 0, { placement: "prefix", empty: "—" })],
      ["Custo portas", formatCurrency(extras.custoTotalPortas ?? 0, { placement: "prefix", empty: "—" })],
      ["Custo gavetas", formatCurrency(extras.custoTotalGavetas ?? 0, { placement: "prefix", empty: "—" })],
      ["Custo ferragens", formatCurrency(extras.custoTotalFerragens ?? 0, { placement: "prefix", empty: "—" })],
      ["Custo orla", formatCurrency(extras.custoTotalOrla ?? 0, { placement: "prefix", empty: "—" })],
      ["Custo remates", formatCurrency(extras.custoTotalRemates ?? 0, { placement: "prefix", empty: "—" })],
      ["Custo total projeto", formatCurrency(extras.custoTotal ?? 0, { placement: "prefix", empty: "—" })]
    );
  }

  return rows;
}

export function buildResumoIndustriaisRows(
  items: CutListItemComPreco[],
  boxes: BoxModule[],
  pieceObservacoes?: PieceObservacoesStore,
  industrialPieceEdits?: IndustrialPieceEditsStore,
  materials: MaterialIndustrial[] = []
): Array<{
  caixa: string;
  peca: string;
  dimensoes: string;
  areaM2: number;
  pesoKg: number;
  consumoM2: number;
  observacoes: string;
  modified: boolean;
}> {
  const boxNomeById = Object.fromEntries(boxes.map((b) => [b.id, b.nome?.trim() || b.id]));
  return items.map((item) => {
    const obs = formatObservacoesForPdf(
      resolveObservacoesForCutListItem(item, { pieceObservacoes })
    );
    const edit = industrialPieceEdits?.[item.id];
    const metrics = computeIndustrialPieceMetrics(item, materials);
    return {
      caixa: boxNomeById[item.boxId ?? ""] ?? item.boxId ?? "—",
      peca: item.tipo,
      dimensoes: `${item.dimensoes.largura}×${item.dimensoes.altura}×${item.espessura} mm`,
      areaM2: metrics.consumoM2,
      pesoKg: metrics.pesoKg,
      consumoM2: metrics.consumoM2,
      observacoes: obs,
      modified: isIndustrialPieceEdited(edit) || (obs.length > 0 && obs !== "—"),
    };
  });
}
