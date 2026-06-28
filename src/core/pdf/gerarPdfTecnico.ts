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
const MARGIN = 8;
const HEADER_COLOR: [number, number, number] = [80, 80, 80];
const ROW_ALT_COLOR: [number, number, number] = [245, 245, 245];

/** Carrega logo como base64 via XHR síncrono (browser context). Fallback: null. */
function loadLogoBase64(): string | null {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/logo-pi.png", false);
    xhr.responseType = "arraybuffer";
    xhr.send();
    if (xhr.status === 200) {
      const arr = new Uint8Array(xhr.response as ArrayBuffer);
      let binary = "";
      arr.forEach((b) => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }
  } catch {
    /* fallback para texto */
  }
  return null;
}

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

  // — HEADER: Logo + info direita —
  let y = MARGIN;
  const logoB64 = loadLogoBase64();
  const logoH = 14;
  const logoW = 40;
  if (logoB64) {
    doc.addImage(logoB64, "PNG", MARGIN, y, logoW, logoH);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text("PIMO", MARGIN, y + 10);
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const infoRight = `Data de design: ${dataHoje}     Designer: ${designer}`;
  doc.text(infoRight, pageW - MARGIN - doc.getTextWidth(infoRight), y + 5);
  doc.setTextColor(0, 0, 0);
  y += logoH + 3;

  // — BLOCO DE INFO (tabela com bordas, largura total) —
  const blockW = pageW - MARGIN * 2;
  const rowH = 7;
  const infoH = rowH * 2;
  const blockX = MARGIN;
  let blockY = y;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  // exterior
  doc.rect(blockX, blockY, blockW, infoH);
  // linha horizontal central
  doc.line(blockX, blockY + rowH, blockX + blockW, blockY + rowH);
  // linha vertical central
  doc.line(blockX + blockW / 2, blockY, blockX + blockW / 2, blockY + infoH);

  const c1x = blockX + 4;
  const c2x = blockX + blockW / 2 + 4;
  const boldLabel = (label: string, lx: number, ly: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(label, lx, ly);
  };
  const normalVal = (val: string, lx: number, ly: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(val, lx, ly);
  };

  let iy = blockY + rowH - 1.5;
  boldLabel("PROJETO / MÓVEL:", c1x, iy);
  normalVal(projectName || "Projeto", c1x + doc.getTextWidth("PROJETO / MÓVEL:") + 2, iy);
  boldLabel("Acabamento:", c2x, iy);
  normalVal(acabamentos.length > 0 ? acabamentos[0] : "—", c2x + doc.getTextWidth("Acabamento:") + 2, iy);

  iy += rowH;
  boldLabel("No. de Caixas:", c1x, iy);
  normalVal(String(boxes.length), c1x + doc.getTextWidth("No. de Caixas:") + 2, iy);
  boldLabel("Pecas Total:", c2x, iy);
  const totalPecasPos = { x: c2x + doc.getTextWidth("Pecas Total:") + 2, y: iy };

  y = blockY + infoH + 1;

  // — BLOCO DE DATAS OPERACIONAIS (6 etapas, 2 colunas: inicio | fim) —
  const etapas = [
    "CORTE NESTING",
    "CORTE DISCO",
    "FOLHEAGEM",
    "CNC",
    "ORLAGEM",
    "MONTAGEM",
  ];
  const dateRowH = 7;
  const dateBlockH = etapas.length * dateRowH;
  blockY = y;
  const midDateX = blockX + blockW / 2;

  doc.setLineWidth(0.3);
  doc.rect(blockX, blockY, blockW, dateBlockH);
  doc.line(midDateX, blockY, midDateX, blockY + dateBlockH);

  for (let i = 0; i < etapas.length; i++) {
    const rowY = blockY + i * dateRowH;
    if (i > 0) {
      doc.setLineWidth(0.15);
      doc.line(blockX, rowY, blockX + blockW, rowY);
    }
    const textY = rowY + dateRowH - 2;

    // coluna esquerda: label + início
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`${etapas[i]}`, c1x, textY);
    const labelW = doc.getTextWidth(etapas[i]);
    doc.setFont("helvetica", "normal");
    doc.text("  inicio:", c1x + labelW, textY);
    const siW = doc.getTextWidth("  inicio:");
    doc.setLineWidth(0.2);
    doc.line(c1x + labelW + siW + 1, textY + 0.3, c1x + labelW + siW + 25, textY + 0.3);
    doc.text(" h:", c1x + labelW + siW + 27, textY);
    const hW = doc.getTextWidth(" h:");
    doc.line(c1x + labelW + siW + 27 + hW + 1, textY + 0.3, c1x + labelW + siW + 27 + hW + 12, textY + 0.3);

    // coluna direita: fim
    doc.setFont("helvetica", "normal");
    doc.text("fim:", c2x, textY);
    const fW = doc.getTextWidth("fim:");
    doc.line(c2x + fW + 1, textY + 0.3, c2x + fW + 25, textY + 0.3);
    doc.text(" h:", c2x + fW + 27, textY);
    doc.line(c2x + fW + 27 + hW + 1, textY + 0.3, c2x + fW + 27 + hW + 12, textY + 0.3);
  }

  y = blockY + dateBlockH + 2;

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
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(String(totalPecasReal), totalPecasPos.x, totalPecasPos.y);

  // — TÍTULO DE SECÇÃO —
  doc.setFillColor(200, 200, 200);
  doc.rect(blockX, y, blockW, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const titulo = "Lista de Corte - Painéis";
  doc.text(titulo, blockX + (blockW - doc.getTextWidth(titulo)) / 2, y + 4.2);
  y += 7;

  const head = [
    "REF PECA",
    "MATERIAL",
    "QTD",
    "COMP",
    "LARG",
    "ESP",
    "No ETQ",
    "NESTING",
    "CNC",
    "Drill",
    "O2",
    "O3",
    "O4",
    "O5",
    "F2",
    "F3",
    "F4",
  ];

  const bodyRows: string[][] = [];
  const separatorRowIndices = new Set<number>();
  let prevBoxIndex = 0;

  if (linhas.length === 0) {
    bodyRows.push(["Nenhuma peca", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"]);
  } else {
    for (const r of linhas) {
      if (prevBoxIndex > 0 && prevBoxIndex !== r.boxIndex) {
        separatorRowIndices.add(bodyRows.length);
        bodyRows.push(Array(17).fill(""));
      }
      prevBoxIndex = r.boxIndex;
      bodyRows.push([
        r.refPeca,
        r.material,
        String(r.qtd),
        String(r.comp),
        String(r.larg),
        String(r.esp),
        String(r.nQr),
        r.nesting,
        r.drill,
        r.drill,
        r.o2,
        r.o3,
        r.o4,
        r.o5,
        r.f2,
        r.f3,
        r.f4,
      ]);
    }
  }

  const isSeparatorRow = (rowIndex: number) => separatorRowIndices.has(rowIndex);

  autoTable(doc, {
    head: [head],
    body: bodyRows,
    theme: "grid",
    didParseCell: (data) => {
      if (data.section === "head") {
        data.cell.styles.fillColor = [80, 80, 80];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 7;
      }
      if (data.section === "body") {
        if (isSeparatorRow(data.row.index)) {
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.minCellHeight = 3;
        } else if (data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [255, 255, 255];
        } else {
          data.cell.styles.fillColor = ROW_ALT_COLOR;
        }
      }
    },
    startY: y,
    styles: {
      fontSize: 7,
      cellPadding: 1.2,
      lineColor: TABLE_GRID_LINE,
      lineWidth: TABLE_GRID_WIDTH,
    },
    headStyles: {
      fillColor: HEADER_COLOR,
      textColor: [255, 255, 255],
      lineColor: TABLE_GRID_LINE,
      lineWidth: TABLE_GRID_WIDTH,
    },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 46 },
      2: { cellWidth: 10 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 10 },
      6: { cellWidth: 14 },
      7: { cellWidth: 14 },
      8: { cellWidth: 10 },
      9: { cellWidth: 10 },
      10: { cellWidth: 8 },
      11: { cellWidth: 8 },
      12: { cellWidth: 8 },
      13: { cellWidth: 8 },
      14: { cellWidth: 8 },
      15: { cellWidth: 8 },
      16: { cellWidth: 8 },
    },
  });

  // rodapé
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `PIMO  |  ${dataHoje}  |  ${linhas.length} ref.  |  ${totalPecasReal} pecas  |  pag. ${p}/${pageCount}`,
      MARGIN,
      207
    );
  }
  doc.setTextColor(0, 0, 0);

  if (opcoes?.incluirPaginaPrecos) {
    gerarPdfPrecos(doc, boxes, rules);
  }

  return doc;
}
