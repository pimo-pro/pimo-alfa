/**
 * Leitor do Excel SSOT de materiais (public/config/materiais-ssot.xlsx).
 * Apenas leitura/parse — não altera CNC, nesting, TCN, cutlist ou PI.
 */

import ExcelJS from "exceljs";
import {
  MATERIAIS_SSOT_PUBLIC_PATH,
  MATERIAIS_SSOT_SHEET_CHAPAS,
  MATERIAIS_SSOT_SHEET_FREEAGENS,
  MATERIAIS_SSOT_SHEET_ORLA,
  type MateriaisSsotCatalog,
  type MateriaisSsotChapaRow,
  type MateriaisSsotFreeagemRow,
  type MateriaisSsotOrlaRow,
} from "./materiaisSsotTypes";

function cellText(value: ExcelJS.CellValue | undefined | null): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") {
      return String((value as { text: string }).text).trim();
    }
    if ("result" in value && (value as { result?: unknown }).result != null) {
      return String((value as { result: unknown }).result).trim();
    }
    if ("richText" in value && Array.isArray((value as { richText?: unknown }).richText)) {
      return ((value as { richText: Array<{ text?: string }> }).richText ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
    }
  }
  return String(value).trim();
}

function cellNumber(value: ExcelJS.CellValue | undefined | null): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = cellText(value).replace(",", ".").replace(/\s/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function headerIndexMap(sheet: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>();
  const row = sheet.getRow(1);
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = normalizeHeader(cellText(cell.value));
    if (key) map.set(key, col);
  });
  return map;
}

function col(map: Map<string, number>, ...aliases: string[]): number | null {
  for (const a of aliases) {
    const idx = map.get(normalizeHeader(a));
    if (idx != null) return idx;
  }
  return null;
}

function readChapas(sheet: ExcelJS.Worksheet): MateriaisSsotChapaRow[] {
  const map = headerIndexMap(sheet);
  const iNome = col(map, "Nome atual", "nome atual");
  const iNovo = col(map, "Nome novo padronizado", "nome novo padronizado");
  const iRef = col(map, "REF", "ref");
  const iEsp = col(map, "Espessura (mm)", "Espessura", "espessura (mm)");
  const iMedida = col(map, "Medida da chapa", "medida da chapa");
  const iChapa = col(map, "Preço da chapa completa (€)", "Preco da chapa completa (€)", "preço da chapa completa");
  const iM2 = col(map, "Preço por m² (€)", "Preco por m2 (€)", "preço por m²");
  const iVenda = col(map, "Preço de venda por m² (€)", "Preco de venda por m2 (€)", "preço de venda por m²");
  if (iNome == null || iRef == null) return [];

  const rows: MateriaisSsotChapaRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const nomeAtual = cellText(row.getCell(iNome).value);
    const ref = cellText(row.getCell(iRef).value);
    if (!nomeAtual && !ref) return;
    rows.push({
      nomeAtual,
      nomeNovoPadronizado: iNovo != null ? cellText(row.getCell(iNovo).value) : "",
      ref,
      espessuraMm: iEsp != null ? cellNumber(row.getCell(iEsp).value) : null,
      medidaChapa: iMedida != null ? cellText(row.getCell(iMedida).value) : "",
      precoChapaCompletaEur: iChapa != null ? cellNumber(row.getCell(iChapa).value) : null,
      precoPorM2Eur: iM2 != null ? cellNumber(row.getCell(iM2).value) : null,
      precoVendaPorM2Eur: iVenda != null ? cellNumber(row.getCell(iVenda).value) : null,
    });
  });
  return rows;
}

function readFreeagens(sheet: ExcelJS.Worksheet): MateriaisSsotFreeagemRow[] {
  const map = headerIndexMap(sheet);
  const iNome = col(map, "Nome");
  const iRef = col(map, "REF", "ref");
  const iEsp = col(map, "Espessura / medida", "Espessura", "espessura / medida");
  const iUn = col(map, "Preço por unidade (€)", "Preco por unidade (€)", "preço por unidade");
  const iM = col(map, "Preço por metro (€)", "Preco por metro (€)", "preço por metro");
  if (iNome == null || iRef == null) return [];

  const rows: MateriaisSsotFreeagemRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const nome = cellText(row.getCell(iNome).value);
    const ref = cellText(row.getCell(iRef).value);
    if (!nome && !ref) return;
    rows.push({
      nome,
      ref,
      espessuraOuMedida: iEsp != null ? cellText(row.getCell(iEsp).value) : "",
      precoPorUnidadeEur: iUn != null ? cellNumber(row.getCell(iUn).value) : null,
      precoPorMetroEur: iM != null ? cellNumber(row.getCell(iM).value) : null,
    });
  });
  return rows;
}

function readOrla(sheet: ExcelJS.Worksheet): MateriaisSsotOrlaRow[] {
  const map = headerIndexMap(sheet);
  const iNome = col(map, "Nome");
  const iRef = col(map, "REF", "ref");
  const iEsp = col(map, "Espessura (mm)", "Espessura", "espessura (mm)");
  const iM = col(map, "Preço por metro (€)", "Preco por metro (€)", "preço por metro");
  const iRolo = col(map, "Preço por rolo (€)", "Preco por rolo (€)", "preço por rolo");
  if (iNome == null || iRef == null) return [];

  const rows: MateriaisSsotOrlaRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const nome = cellText(row.getCell(iNome).value);
    const ref = cellText(row.getCell(iRef).value);
    if (!nome && !ref) return;
    rows.push({
      nome,
      ref,
      espessuraMm: iEsp != null ? cellNumber(row.getCell(iEsp).value) : null,
      precoPorMetroEur: iM != null ? cellNumber(row.getCell(iM).value) : null,
      precoPorRoloEur: iRolo != null ? cellNumber(row.getCell(iRolo).value) : null,
    });
  });
  return rows;
}

function findSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  const exact = wb.getWorksheet(name);
  if (exact) return exact;
  const lower = name.toLowerCase();
  return wb.worksheets.find((s) => String(s.name ?? "").trim().toLowerCase() === lower);
}

/** Parse de um buffer/ArrayBuffer do ficheiro Excel SSOT. */
export async function parseMateriaisSsotWorkbook(
  data: ArrayBuffer | Buffer | Uint8Array,
  sourceLabel?: string
): Promise<MateriaisSsotCatalog> {
  const workbook = new ExcelJS.Workbook();
  // exceljs aceita Buffer / ArrayBuffer / Uint8Array conforme runtime
  await workbook.xlsx.load(data as never);
  const chapasSheet = findSheet(workbook, MATERIAIS_SSOT_SHEET_CHAPAS);
  const freeagensSheet = findSheet(workbook, MATERIAIS_SSOT_SHEET_FREEAGENS);
  const orlaSheet = findSheet(workbook, MATERIAIS_SSOT_SHEET_ORLA);
  return {
    chapas: chapasSheet ? readChapas(chapasSheet) : [],
    freeagens: freeagensSheet ? readFreeagens(freeagensSheet) : [],
    orla: orlaSheet ? readOrla(orlaSheet) : [],
    sourceLabel,
  };
}

/** Carrega o SSOT a partir de um URL (browser ou Node com fetch). */
export async function loadMateriaisSsotFromUrl(
  url: string = MATERIAIS_SSOT_PUBLIC_PATH
): Promise<MateriaisSsotCatalog> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Não foi possível carregar o SSOT de materiais (${res.status}): ${url}`);
  }
  const buffer = await res.arrayBuffer();
  return parseMateriaisSsotWorkbook(buffer, url);
}

/**
 * Nome de agrupamento efectivo: «Nome novo padronizado» se preenchido, senão «Nome atual».
 * (Não altera REF / IDs industriais.)
 */
export function resolveChapaNomePadronizado(row: MateriaisSsotChapaRow): string {
  const novo = row.nomeNovoPadronizado.trim();
  if (novo) return novo;
  // Fallback: nome atual sem sufixo de espessura (não usar nome antigo com mm na família).
  return row.nomeAtual
    .trim()
    .replace(/\s+\d+(?:[.,]\d+)?\s*mm?\s*$/i, "")
    .trim();
}
