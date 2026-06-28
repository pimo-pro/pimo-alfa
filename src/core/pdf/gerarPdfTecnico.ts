/**
 * PDF Técnico Industrial — tabela única estilo Excel.
 * Uma única página landscape com todas as peças do projeto (modelo FINAL).
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ComponentType } from "../components/componentTypes";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { resolveIndustrialPieceRef } from "../cutlayout/cutLayoutProPieceNaming";
import {
  buildIndustrialListPiecesPerSheet,
  resolveIndustrialListNqr,
} from "./industrialListQr";
import { safeGetItem } from "../../utils/storage";
import type { PieceObservacoesStore } from "../observacoes/observacoesTypes";
import {
  formatObservacoesForPdf,
  normalizeObservacoesList,
  resolveObservacoesForCutListItem,
} from "../observacoes/ObservacoesService";

import { COMPONENT_TYPES_DEFAULT } from "../components/componentTypes";
import { MATERIAIS_INDUSTRIAIS, getMaterial, type MaterialIndustrial } from "../manufacturing/materials";

/** Grelha preta fina — impressão e conferência manual. */
const TABLE_GRID_LINE: [number, number, number] = [0, 0, 0];
const TABLE_GRID_WIDTH = 0.15;
const MARGIN = 15;
const HEADER_COLOR: [number, number, number] = [15, 23, 42];

/** Mapeamento tipo peça (boxManufacturing) → id componentType */
const TIPO_TO_COMPONENT_ID: Record<string, string> = {
  cima: "cima",
  fundo: "fundo",
  lateral_esquerda: "lateral_esquerda",
  lateral_direita: "lateral_direita",
  COSTA: "costa",
  prateleira: "prateleira",
  porta_dupla: "porta",
  porta_simples: "porta",
  porta_correr: "porta",
  gaveta_frente: "gaveta_frente",
  gaveta_lat_esq: "gaveta_lat_esq",
  gaveta_lat_dir: "gaveta_lat_dir",
  gaveta_fundo: "gaveta_fundo",
  gaveta_traseira: "gaveta_traseira",
};

interface LinhaPeca {
  refPeca: string;
  boxIndex: number;
  material: string;
  qtd: number;
  comp: number;
  larg: number;
  esp: number;
  nesting: string;
  drill: string;
  o2: string;
  o3: string;
  o4: string;
  o5: string;
  f2: string;
  f3: string;
  f4: string;
  f5: string;
  observacoes: string;
  nQr: string;
  boxNome: string;
  espessura_mm: number;
  tipo: string;
}

function loadComponentTypesFromStorage(): ComponentType[] {
  const raw = safeGetItem("pimo_component_types");
  if (!raw) return [...COMPONENT_TYPES_DEFAULT];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ComponentType[];
  } catch {
    /* ignore */
  }
  return [...COMPONENT_TYPES_DEFAULT];
}

function loadMaterialsFromStorage(): MaterialIndustrial[] {
  const raw = safeGetItem("pimo_admin_materials");
  if (!raw) return [...MATERIAIS_INDUSTRIAIS];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as MaterialIndustrial[];
  } catch {
    /* ignore */
  }
  return [...MATERIAIS_INDUSTRIAIS];
}

function formatMaterial(materialNome: string, espessura: number, materials: MaterialIndustrial[]): string {
  const mat =
    materials.find((m) => m.nome === materialNome || m.id === materialNome) ?? getMaterial(materialNome);
  const cor = mat.cor ?? "";
  const parts = [materialNome];
  if (cor) parts.push(cor);
  parts.push(`${espessura}mm`);
  return parts.join(" ");
}

function getFurosLados(componentType: ComponentType): Set<string> {
  const lados = new Set<string>();
  for (const r of componentType.regras_de_furo ?? []) {
    for (const lado of r.aplicar_em ?? []) {
      lados.add(lado);
    }
  }
  return lados;
}

/** Furos laterais = fundo, esquerda ou direita (não topo). Topo = Nesting. Drill só "X" se houver lateral. */
function temFurosLaterais(ladosFuro: Set<string>): boolean {
  return ladosFuro.has("fundo") || ladosFuro.has("esquerda") || ladosFuro.has("direita");
}

export type GerarPdfTecnicoOpcoes = {
  incluirPaginaPrecos?: boolean;
  materialId?: string;
  extractedPartsByBoxId?: Record<string, Record<string, CutListItemComPreco[]>>;
  /** Itens já com shortCode (ex.: fabricação multi‑projeto). */
  precomputedItems?: CutListItemComPreco[];
  /** Observações por peça (panelId). */
  pieceObservacoes?: PieceObservacoesStore;
};

function loadCutlistForIndustrialList(
  boxes: BoxModule[],
  rules: RulesConfig,
  projectName: string,
  pdfOpts?: Pick<GerarPdfTecnicoOpcoes, "materialId" | "extractedPartsByBoxId" | "precomputedItems">
): CutListItemComPreco[] {
  if (pdfOpts?.precomputedItems && pdfOpts.precomputedItems.length > 0) {
    return pdfOpts.precomputedItems;
  }
  return buildGlobalQrCutlistMerged(
    boxes,
    rules,
    pdfOpts?.materialId,
    projectName,
    pdfOpts?.extractedPartsByBoxId
  );
}

function construirLinhas(
  boxes: BoxModule[],
  rules: RulesConfig,
  componentTypes: ComponentType[],
  materials: MaterialIndustrial[],
  projectName: string,
  pdfOpts?: Pick<
    GerarPdfTecnicoOpcoes,
    "materialId" | "extractedPartsByBoxId" | "precomputedItems" | "pieceObservacoes"
  >
): LinhaPeca[] {
  const ctById = Object.fromEntries(componentTypes.map((c) => [c.id, c]));
  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const boxIndexById = new Map(boxes.map((b, i) => [b.id, i + 1]));

  const cutlist = loadCutlistForIndustrialList(boxes, rules, projectName, pdfOpts);
  const piecesPerSheet = buildIndustrialListPiecesPerSheet(cutlist);
  const qrCtx = { projectName, boxes, rules };

  const pecasCompletas: Array<{
    box: BoxModule | undefined;
    boxIndex: number;
    tipo: string;
    refPeca: string;
    larg: number;
    comp: number;
    esp: number;
    material: string;
    qtd: number;
    nQr: string;
    observacoes: string[];
  }> = [];

  cutlist.forEach((item, index0) => {
    const box = item.boxId ? boxById.get(item.boxId) : undefined;
    const boxIndex = item.boxId ? (boxIndexById.get(item.boxId) ?? 0) : 0;
    const boxNome = box?.nome ?? item.boxId ?? "";
    const refPeca = resolveIndustrialPieceRef(item, boxNome, projectName);
    const materialNome = item.material ?? box?.material ?? "mdf_branco";
    const itemObs = resolveObservacoesForCutListItem(item, {
      pieceObservacoes: pdfOpts?.pieceObservacoes,
    });

    pecasCompletas.push({
      box,
      boxIndex,
      tipo: item.tipo,
      refPeca,
      larg: item.dimensoes.largura,
      comp: item.dimensoes.altura,
      esp: item.espessura,
      material: materialNome,
      qtd: item.quantidade,
      nQr: resolveIndustrialListNqr(item, qrCtx, piecesPerSheet, index0),
      observacoes: itemObs,
    });
  });

  pecasCompletas.sort((a, b) => {
    const boxCmp = a.boxIndex - b.boxIndex;
    if (boxCmp !== 0) return boxCmp;
    const espCmp = a.esp - b.esp;
    if (espCmp !== 0) return espCmp;
    return a.refPeca.localeCompare(b.refPeca);
  });

  const agrupado = new Map<
    string,
    LinhaPeca & { observacoesLista: string[] }
  >();

  for (const p of pecasCompletas) {
    const componentId = TIPO_TO_COMPONENT_ID[p.tipo] ?? p.tipo;
    const ct = ctById[componentId];
    const ladosFuro = ct ? getFurosLados(ct) : new Set<string>();

    const materialStr = formatMaterial(p.material, p.esp, materials);
    const temFurosLateraisPiece = temFurosLaterais(ladosFuro);
    const key = `${p.refPeca}|${p.larg}|${p.comp}|${p.esp}|${materialStr}|${p.box?.id ?? ""}`;
    const esp10 = p.esp === 10;
    const o2o5 = esp10 ? "" : "X";

    const exist = agrupado.get(key);
    if (exist) {
      exist.qtd += p.qtd;
      exist.observacoesLista = normalizeObservacoesList([...exist.observacoesLista, ...p.observacoes]);
      exist.observacoes = formatObservacoesForPdf(exist.observacoesLista);
    } else {
      agrupado.set(key, {
        refPeca: p.refPeca,
        material: materialStr,
        qtd: p.qtd,
        comp: p.comp,
        larg: p.larg,
        esp: p.esp,
        nesting: "X",
        drill: temFurosLateraisPiece ? "X" : "",
        o2: o2o5,
        o3: o2o5,
        o4: o2o5,
        o5: o2o5,
        f2: ladosFuro.has("topo") ? "X" : "",
        f3: ladosFuro.has("fundo") ? "X" : "",
        f4: ladosFuro.has("esquerda") ? "X" : "",
        f5: ladosFuro.has("direita") ? "X" : "",
        observacoes: formatObservacoesForPdf(p.observacoes),
        observacoesLista: normalizeObservacoesList(p.observacoes),
        nQr: p.nQr,
        boxNome: p.box?.nome || p.box?.id || "—",
        boxIndex: p.boxIndex,
        espessura_mm: p.esp,
        tipo: p.tipo,
      });
    }
  }

  const resultado = Array.from(agrupado.values()).map(({ observacoesLista: _omit, ...row }) => row);
  resultado.sort((a, b) => {
    const boxCmp = a.boxIndex - b.boxIndex;
    if (boxCmp !== 0) return boxCmp;
    const espCmp = a.espessura_mm - b.espessura_mm;
    if (espCmp !== 0) return espCmp;
    return a.refPeca.localeCompare(b.refPeca);
  });

  return resultado;
}

function gerarPdfPrecos(doc: jsPDF, boxes: BoxModule[], rules: RulesConfig): void {
  adicionarResumoFinanceiro(doc, null);
  adicionarCustosPorCaixa(doc, boxes, rules);
}

function adicionarResumoFinanceiro(doc: jsPDF, dados: unknown): void {
  void doc;
  void dados;
}

function adicionarCustosPorCaixa(doc: jsPDF, boxes: BoxModule[], rules: RulesConfig): void {
  void doc;
  void boxes;
  void rules;
}

function getAcabamentosUnicos(boxes: BoxModule[], materials: MaterialIndustrial[]): string[] {
  const seen = new Set<string>();
  const acc: string[] = [];
  for (const box of boxes) {
    const mat = box.material ?? "mdf_branco";
    const esp = box.espessura > 0 ? box.espessura : 18;
    const matInfo = materials.find((m) => m.nome === mat || m.id === mat) ?? getMaterial(mat);
    const cor = matInfo.cor ?? "";
    const s = `${mat}${cor ? " " + cor : ""} ${esp}mm`;
    if (!seen.has(s)) {
      seen.add(s);
      acc.push(s);
    }
  }
  return acc;
}

/**
 * Gera PDF técnico industrial em tabela única (landscape).
 * @param opcoes.incluirPaginaPrecos — quando true (futuro), adiciona Página 2 com preços
 * @param opcoes.materialId — opcional (compatibilidade com ProjectProvider)
 */
export function gerarPdfTecnicoCompleto(
  boxes: BoxModule[],
  rules: RulesConfig,
  projectName: string,
  opcoes?: GerarPdfTecnicoOpcoes
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const componentTypes = loadComponentTypesFromStorage();
  const materials = loadMaterialsFromStorage();

  const acabamentos = getAcabamentosUnicos(boxes, materials);
  const dataHoje = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const pageW = 297; // A4 landscape
  const designer = "KHALED"; // TODO: substituir por username autenticado

  // — Cabeçalho topo: π PIMO | Data de design | Designer —
  let y = MARGIN + 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("π", MARGIN, y);
  doc.setFontSize(18);
  doc.text("PIMO", MARGIN + 10, y - 1);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const headerRight = `Data de design: ${dataHoje}     Designer: ${designer}`;
  const hrW = doc.getTextWidth(headerRight);
  doc.text(headerRight, pageW - MARGIN - hrW, y - 1);
  y += 6;

  // — Retângulo central: 180mm, centrado —
  const rectW = 180;
  const rectX = (pageW - rectW) / 2;
  const rowH = 8;
  const infoRows = 2;   // bloco de info: 2 linhas
  const dateRows = 5;   // bloco de datas: 5 linhas (CNC, Drill, Orlar, Limp, Mont)
  const infoH = infoRows * rowH;
  const dateH = dateRows * rowH;
  const rectH = infoH + dateH + 1; // +1 para a linha divisória horizontal
  const rectY = y;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(rectX, rectY, rectW, rectH);

  // linha divisória vertical (meio)
  const midX = rectX + rectW / 2;
  doc.line(midX, rectY, midX, rectY + rectH);

  // linha divisória horizontal (entre info e datas)
  const divY = rectY + infoH;
  doc.line(rectX, divY, rectX + rectW, divY);

  // helper para desenhar campo com label + sublinha
  const drawField = (label: string, lx: number, ly: number, lineLen: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, lx, ly);
    const lw = doc.getTextWidth(label);
    doc.setLineWidth(0.25);
    doc.line(lx + lw + 1, ly + 0.5, lx + lw + 1 + lineLen, ly + 0.5);
  };

  // helper para campo de data/hora: __/__/____  H__:__
  const drawDateTime = (label: string, lx: number, ly: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, lx, ly);
    const lw = doc.getTextWidth(label);
    const fx = lx + lw + 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("__/__/____", fx, ly);
    const dw = doc.getTextWidth("__/__/____");
    doc.text("H__:__", fx + dw + 2, ly);
  };

  // — Bloco info (linha 1: PROJETO + Nº Caixas) —
  const c1x = rectX + 4;
  const c2x = midX + 4;
  let iy = rectY + rowH - 1;

  drawField("PROJETO / MÓVEL:", c1x, iy, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  // escreve valor do projeto à direita da label
  doc.text(projectName || "Projeto", c1x + doc.getTextWidth("PROJETO / MÓVEL:") + 3, iy);

  drawField("Acabamento:", c2x, iy, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(acabamentos.length > 0 ? acabamentos[0] : "—", c2x + doc.getTextWidth("Acabamento:") + 3, iy);

  iy += rowH;
  drawField("Nº de Caixas:", c1x, iy, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(String(boxes.length), c1x + doc.getTextWidth("Nº de Caixas:") + 3, iy);

  // "Peças Total" — placeholder, preenchido após construirLinhas
  drawField("Peças Total:", c2x, iy, 20);
  const totalPecasPos = { x: c2x + doc.getTextWidth("Peças Total:") + 3, y: iy };

  // — Bloco datas (5 linhas) —
  iy = divY + rowH - 1;
  const etapas = ["CNC", "Drill", "Orlar", "Limp", "Mont"];
  for (const etapa of etapas) {
    drawDateTime(`Início ${etapa}:`, c1x, iy);
    drawDateTime(`Fim ${etapa}:`, c2x, iy);
    iy += rowH;
  }

  y = rectY + rectH + 6;

  // — Construir linhas (dados) —
  const linhas = construirLinhas(boxes, rules, componentTypes, materials, projectName, {
    materialId: opcoes?.materialId,
    extractedPartsByBoxId: opcoes?.extractedPartsByBoxId,
    precomputedItems: opcoes?.precomputedItems,
    pieceObservacoes: opcoes?.pieceObservacoes,
  });

  // Preencher "Peças Total" com valor real
  const totalPecasReal = linhas.reduce((sum, r) => sum + r.qtd, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(String(totalPecasReal), totalPecasPos.x, totalPecasPos.y);

  const head = [
    "REF PEÇA",
    "MATERIAL",
    "QTD",
    "COMP",
    "LARG",
    "ESP",
    "NESTING",
    "Drill",
    "O2",
    "O3",
    "O4",
    "O5",
    "F2",
    "F3",
    "F4",
    "F5",
    "OBSERVAÇÕES",
    "N QR",
  ];

  const bodyRows: string[][] = [];
  const separatorRowIndices = new Set<number>();
  let prevBoxIndex = 0;

  if (linhas.length === 0) {
    bodyRows.push(["Nenhuma peça", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"]);
  } else {
    for (const r of linhas) {
      if (prevBoxIndex > 0 && prevBoxIndex !== r.boxIndex) {
        separatorRowIndices.add(bodyRows.length);
        bodyRows.push(["—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"]);
      }
      prevBoxIndex = r.boxIndex;
      bodyRows.push([
        r.refPeca,
        r.material,
        String(r.qtd),
        String(r.comp),
        String(r.larg),
        String(r.esp),
        r.nesting,
        r.drill,
        r.o2,
        r.o3,
        r.o4,
        r.o5,
        r.f2,
        r.f3,
        r.f4,
        r.f5,
        r.observacoes,
        String(r.nQr),
      ]);
    }
  }

  const isSeparatorRow = (rowIndex: number) => separatorRowIndices.has(rowIndex);

  autoTable(doc, {
    head: [head],
    body: bodyRows,
    theme: "grid",
    didParseCell: (data) => {
      if (data.section === "body" && isSeparatorRow(data.row.index)) {
        data.cell.styles.fillColor = [235, 238, 242];
        data.cell.styles.minCellHeight = 6;
      }
    },
    startY: y,
    styles: {
      fontSize: 7,
      lineColor: TABLE_GRID_LINE,
      lineWidth: TABLE_GRID_WIDTH,
    },
    headStyles: {
      fillColor: HEADER_COLOR,
      lineColor: TABLE_GRID_LINE,
      lineWidth: TABLE_GRID_WIDTH,
    },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 45 },
      2: { cellWidth: 12 },
      3: { cellWidth: 18 },
      4: { cellWidth: 18 },
      5: { cellWidth: 12 },
      6: { cellWidth: 14 },
      7: { cellWidth: 10 },
      8: { cellWidth: 8 },
      9: { cellWidth: 8 },
      10: { cellWidth: 8 },
      11: { cellWidth: 8 },
      12: { cellWidth: 8 },
      13: { cellWidth: 8 },
      14: { cellWidth: 8 },
      15: { cellWidth: 8 },
      16: { cellWidth: 25 },
      17: { cellWidth: 12 },
    },
  });

  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `π PIMO  |  ${dataHoje}  |  ${linhas.length} referência(s)  |  ${totalPecasReal} peça(s)`,
    MARGIN,
    205
  );
  doc.setTextColor(0, 0, 0);

  if (opcoes?.incluirPaginaPrecos) {
    gerarPdfPrecos(doc, boxes, rules);
  }

  return doc;
}
