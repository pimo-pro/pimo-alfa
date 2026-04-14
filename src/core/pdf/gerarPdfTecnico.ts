/**
 * PDF Técnico Industrial — tabela única estilo Excel.
 * Uma única página landscape com todas as peças do projeto (modelo FINAL).
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ComponentType } from "../components/componentTypes";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { gerarModeloIndustrial } from "../manufacturing/boxManufacturing";
import { buildGlobalQrCutlistMerged } from "../manufacturing/cutlistFromBoxes";
import { safeGetItem } from "../../utils/storage";
import { COMPONENT_TYPES_DEFAULT } from "../components/componentTypes";
import { MATERIAIS_INDUSTRIAIS, getMaterial, type MaterialIndustrial } from "../manufacturing/materials";

const MARGIN = 12;
const HEADER_COLOR: [number, number, number] = [15, 23, 42];

/** Formato REF PEÇA: tipo → nome em maiúsculas para tabela */
const TIPO_TO_REF_NAME: Record<string, string> = {
  cima: "CIMA",
  fundo: "FUNDO",
  lateral_esquerda: "LATERAL_ESQ",
  lateral_direita: "LATERAL_DIR",
  COSTA: "COSTA",
  prateleira: "PRATELEIRA",
  porta_dupla: "PORTA_DUPLA",
  porta_simples: "PORTA_SIMPLES",
  porta_correr: "PORTA_CORRER",
  gaveta_frente: "GAVETA_FRENTE",
  gaveta_lat_esq: "GAVETA_LAT_ESQ",
  gaveta_lat_dir: "GAVETA_LAT_DIR",
  gaveta_fundo: "GAVETA_FUNDO",
  gaveta_traseira: "GAVETA_TRASEIRA",
};

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
};

function panelIdFromCutlistMetadata(metadata?: Record<string, unknown>): string | null {
  if (!metadata || typeof metadata.panelId !== "string") return null;
  const s = metadata.panelId.trim();
  return s || null;
}

function buildShortCodeByBoxPanel(
  boxes: BoxModule[],
  rules: RulesConfig,
  projectName: string,
  materialId: string | undefined,
  extractedPartsByBoxId: Record<string, Record<string, CutListItemComPreco[]>> | undefined,
  precomputedItems: CutListItemComPreco[] | undefined
): Map<string, string> {
  const items =
    precomputedItems && precomputedItems.length > 0
      ? precomputedItems
      : buildGlobalQrCutlistMerged(boxes, rules, materialId, projectName, extractedPartsByBoxId);
  const map = new Map<string, string>();
  for (const it of items) {
    const pid = panelIdFromCutlistMetadata(it.metadata);
    const bid = it.boxId?.trim();
    if (!bid || !pid) continue;
    const key = `${bid}::${pid}`;
    if (map.has(key)) continue;
    const sc = String(it.shortCode ?? "").trim();
    if (sc && sc !== "ERR") map.set(key, sc);
  }
  return map;
}

function construirLinhas(
  boxes: BoxModule[],
  rules: RulesConfig,
  componentTypes: ComponentType[],
  materials: MaterialIndustrial[],
  projectName: string,
  pdfOpts?: Pick<GerarPdfTecnicoOpcoes, "materialId" | "extractedPartsByBoxId" | "precomputedItems">
): LinhaPeca[] {
  const ctById = Object.fromEntries(componentTypes.map((c) => [c.id, c]));
  const shortByPanel = buildShortCodeByBoxPanel(
    boxes,
    rules,
    projectName,
    pdfOpts?.materialId,
    pdfOpts?.extractedPartsByBoxId,
    pdfOpts?.precomputedItems
  );

  const pecasCompletas: Array<{
    box: BoxModule;
    boxIndex: number;
    tipo: string;
    refPeca: string;
    larg: number;
    comp: number;
    esp: number;
    material: string;
    qtd: number;
    panelId: string;
  }> = [];

  for (let boxIdx = 0; boxIdx < boxes.length; boxIdx++) {
    const box = boxes[boxIdx];
    const modelo = gerarModeloIndustrial(box, rules);
    const material = box.material ?? "mdf_branco";
    const boxNum = boxIdx + 1;
    let prateleiraCount = 0;
    let gavetaCount = 0;

    for (const p of modelo.paineis) {
      let nomePeca = TIPO_TO_REF_NAME[p.tipo] ?? p.tipo.toUpperCase().replace(/\s/g, "_");
      if (p.tipo === "prateleira") {
        prateleiraCount++;
        nomePeca = `PRATELEIRA_${String(prateleiraCount).padStart(2, "0")}`;
      } else if (p.tipo === "gaveta_frente") {
        gavetaCount++;
        nomePeca = `GAVETA_FRENTE_${String(gavetaCount).padStart(2, "0")}`;
      }
      pecasCompletas.push({
        box,
        boxIndex: boxNum,
        tipo: p.tipo,
        refPeca: `Caixa ${boxNum} – ${nomePeca}`,
        larg: p.largura_mm,
        comp: p.altura_mm,
        esp: p.espessura_mm,
        material,
        qtd: p.quantidade,
        panelId: p.id,
      });
    }
  }

  pecasCompletas.sort((a, b) => {
    const boxCmp = (a.box.nome || a.box.id).localeCompare(b.box.nome || b.box.id);
    if (boxCmp !== 0) return boxCmp;
    const espCmp = a.esp - b.esp;
    if (espCmp !== 0) return espCmp;
    return a.refPeca.localeCompare(b.refPeca);
  });

  const agrupado = new Map<string, LinhaPeca>();

  for (const p of pecasCompletas) {
    const componentId = TIPO_TO_COMPONENT_ID[p.tipo] ?? p.tipo;
    const ct = ctById[componentId];
    const ladosFuro = ct ? getFurosLados(ct) : new Set<string>();

    const materialStr = formatMaterial(p.material, p.esp, materials);
    const temFurosLateraisPiece = temFurosLaterais(ladosFuro);
    const key = `${p.refPeca}|${p.larg}|${p.comp}|${p.esp}|${materialStr}|${p.box.id}`;
    const panelKey = `${p.box.id}::${p.panelId}`;
    const nQrLabel = shortByPanel.get(panelKey)?.trim() || "—";
    const esp10 = p.esp === 10;
    const o2o5 = esp10 ? "" : "X";

    const exist = agrupado.get(key);
    if (exist) {
      exist.qtd += p.qtd;
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
        observacoes: "",
        nQr: nQrLabel,
        boxNome: p.box.nome || p.box.id,
        boxIndex: p.boxIndex,
        espessura_mm: p.esp,
        tipo: p.tipo,
      });
    }
  }

  const resultado = Array.from(agrupado.values());
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

  let y = MARGIN;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PIMO Studio", MARGIN, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`PROJETO / MÓVEL: ${projectName || "Projeto"}`, MARGIN, y);
  y += 6;

  const acabamentos = getAcabamentosUnicos(boxes, materials);
  doc.text(`Acabamento: ${acabamentos.length > 0 ? acabamentos.join(" | ") : "—"}`, MARGIN, y);
  y += 12;

  const linhas = construirLinhas(boxes, rules, componentTypes, materials, projectName, {
    materialId: opcoes?.materialId,
    extractedPartsByBoxId: opcoes?.extractedPartsByBoxId,
    precomputedItems: opcoes?.precomputedItems,
  });

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
    didParseCell: (data) => {
      if (data.section === "body" && isSeparatorRow(data.row.index)) {
        data.cell.styles.fillColor = [235, 238, 242];
        data.cell.styles.minCellHeight = 6;
      }
    },
    startY: y,
    styles: { fontSize: 7 },
    headStyles: { fillColor: HEADER_COLOR },
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

  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}  |  ${linhas.length} peça(s)`,
    MARGIN,
    200
  );
  doc.setTextColor(0, 0, 0);

  if (opcoes?.incluirPaginaPrecos) {
    gerarPdfPrecos(doc, boxes, rules);
  }

  return doc;
}
