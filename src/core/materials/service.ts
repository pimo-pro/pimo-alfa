/**
 * FASE 3 — Materials System
 * CRUD real com localStorage (armazenamento temporário até existir backend).
 */

import type {
  MaterialAssignment,
  MaterialPreset,
  MaterialRecord,
  MaterialsSystemState,
  CreateMaterialData,
  UpdateMaterialData,
  MaterialValidationResult,
  MaterialDisplayInfo,
  MaterialResult,
} from "./types";
import type { ApplyMaterialOptions } from "./types";
import type { BoxModule } from "../types";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  getMaterial as getIndustrialByName,
  CHAPA_PADRAO_LARGURA,
  CHAPA_PADRAO_ALTURA,
} from "../manufacturing/materials";
import {
  getDefaultOfficialMaterial,
  listOfficialMaterials,
  listIndustrialWoodMaterials,
  resolveMaterial,
} from "./materials.api";

const STORAGE_KEY = "pimo_materials_crud_v1";
const DEFAULT_SHEET_WIDTH_MM = 2800;
const DEFAULT_SHEET_HEIGHT_MM = 2070;
const DEFAULT_SHEET_THICKNESS_MM = 19;

/** Categoria usada para materiais migrados da lista industrial. */
const MIGRATED_CATEGORY_ID = "industrial";

type MaterialSeed = Omit<MaterialRecord, "id">;

const REQUIRED_MATERIAL_LABELS = new Set([
  "MDF Branco",
  "MDF Cinza",
  "MDF Preto",
  "Carvalho",
  "Nogueira",
  "Pinho",
  "Faia",
  "Contraplacado",
  "Melamina",
  "Lacado",
  "MDF Clarus",
  "MDF Noce",
]);

function categoryFromLabel(label: string): string {
  const lower = label.trim().toLowerCase();
  if (lower.includes("mdf")) return "mdf";
  if (lower.includes("carvalho")) return "carvalho";
  if (lower.includes("lacado")) return "lacado";
  if (lower.includes("melamina")) return "melamina";
  if (lower.includes("contraplacado")) return "contraplacado";
  if (lower.includes("nogueira")) return "carvalho";
  if (lower.includes("pinho")) return "carvalho";
  if (lower.includes("faia")) return "carvalho";
  if (lower.includes("costa")) return MIGRATED_CATEGORY_ID;
  return "outros";
}

function buildRequiredMaterialSeeds(): MaterialSeed[] {
  const official = listOfficialMaterials();
  const fromOfficial = official
    .filter((m) => REQUIRED_MATERIAL_LABELS.has(m.label))
    .map<MaterialSeed>((m) => ({
      label: m.label,
      categoryId: categoryFromLabel(m.label),
      color: undefined,
      textureUrl: undefined,
      espessura: Number(m.industrialDefaults?.espessuraPadrao) || DEFAULT_SHEET_THICKNESS_MM,
      precoPorM2: Number(m.industrialDefaults?.custo_m2 ?? 0),
      sheetWidthMm: Number(m.industrialDefaults?.larguraChapa) || DEFAULT_SHEET_WIDTH_MM,
      sheetHeightMm: Number(m.industrialDefaults?.alturaChapa) || DEFAULT_SHEET_HEIGHT_MM,
      sheetThicknessMm: Number(m.industrialDefaults?.espessuraPadrao) || DEFAULT_SHEET_THICKNESS_MM,
      sheetWeightKg: undefined,
      sheetDensity: Number.isFinite(Number(m.industrialDefaults?.densidade))
        ? Number(m.industrialDefaults?.densidade)
        : undefined,
      industrialMaterialId: m.canonicalId,
      visualPresetId: m.viewerMaterialId ?? undefined,
    }));

  // Chapa técnica típica para costas/fundos de 10 mm usada no CNC.
  const costaSeed: MaterialSeed = {
    label: "COSTA 10mm",
    categoryId: MIGRATED_CATEGORY_ID,
    color: "#f3f3f3",
    textureUrl: undefined,
    espessura: 10,
    precoPorM2: 0,
    sheetWidthMm: DEFAULT_SHEET_WIDTH_MM,
    sheetHeightMm: DEFAULT_SHEET_HEIGHT_MM,
    sheetThicknessMm: 10,
    sheetWeightKg: undefined,
    sheetDensity: undefined,
    industrialMaterialId: "costa_10mm",
    visualPresetId: undefined,
  };

  return [...fromOfficial, costaSeed];
}

function validPositive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ensureRequiredMaterialsCatalog(): { created: number; updated: number } {
  const list = loadFromStorage();
  const seeds = buildRequiredMaterialSeeds();
  let created = 0;
  let updated = 0;

  for (const seed of seeds) {
    const idx = list.findIndex((m) => (m.label ?? "").trim().toLowerCase() === seed.label.trim().toLowerCase());
    if (idx === -1) {
      const record: MaterialRecord = { id: generateId(), ...seed };
      list.push(record);
      created++;
      continue;
    }
    const current = list[idx];
    const next: MaterialRecord = {
      ...current,
      categoryId: current.categoryId || seed.categoryId,
      color: current.color ?? seed.color,
      textureUrl: current.textureUrl ?? seed.textureUrl,
      espessura: validPositive(current.espessura) ?? seed.espessura,
      precoPorM2: Number.isFinite(Number(current.precoPorM2)) ? Number(current.precoPorM2) : seed.precoPorM2,
      sheetWidthMm: validPositive(current.sheetWidthMm) ?? seed.sheetWidthMm,
      sheetHeightMm: validPositive(current.sheetHeightMm) ?? seed.sheetHeightMm,
      sheetThicknessMm: validPositive(current.sheetThicknessMm) ?? seed.sheetThicknessMm,
      sheetWeightKg: Number.isFinite(Number(current.sheetWeightKg)) ? Number(current.sheetWeightKg) : seed.sheetWeightKg,
      sheetDensity: Number.isFinite(Number(current.sheetDensity)) ? Number(current.sheetDensity) : seed.sheetDensity,
      industrialMaterialId: current.industrialMaterialId || seed.industrialMaterialId,
      visualPresetId: current.visualPresetId || seed.visualPresetId,
    };
    const changed = JSON.stringify(current) !== JSON.stringify(next);
    if (changed) {
      list[idx] = next;
      updated++;
    }
  }

  if (created > 0 || updated > 0) {
    saveToStorage(list);
  }
  return { created, updated };
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `mat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function loadFromStorage(): MaterialRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MaterialRecord =>
        item != null &&
        typeof item === "object" &&
        typeof (item as MaterialRecord).id === "string" &&
        typeof (item as MaterialRecord).label === "string"
    ).map((item) => ({
      ...item,
      sheetWidthMm: Number(item.sheetWidthMm) > 0 ? Number(item.sheetWidthMm) : DEFAULT_SHEET_WIDTH_MM,
      sheetHeightMm: Number(item.sheetHeightMm) > 0 ? Number(item.sheetHeightMm) : DEFAULT_SHEET_HEIGHT_MM,
      sheetThicknessMm: Number(item.sheetThicknessMm) > 0 ? Number(item.sheetThicknessMm) : DEFAULT_SHEET_THICKNESS_MM,
      sheetWeightKg: Number.isFinite(Number(item.sheetWeightKg)) ? Number(item.sheetWeightKg) : undefined,
      sheetDensity: Number.isFinite(Number(item.sheetDensity)) ? Number(item.sheetDensity) : undefined,
    }));
  } catch {
    return [];
  }
}

function saveToStorage(data: MaterialRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota or other error
  }
}

/**
 * Migra materiais antigos (MATERIAIS_INDUSTRIAIS) para o CRUD.
 * Insere apenas os que ainda não existem (por label, case-insensitive).
 * Não remove nem altera materiais industriais originais; não altera MaterialLibrary nem Viewer.
 */
export function migrateMaterialsFromLegacy(): { migrated: number; skipped: number } {
  const restored = ensureRequiredMaterialsCatalog();
  let migrated = 0;
  let skipped = 0;
  const legacyIndustrial = listIndustrialWoodMaterials();
  const official = listOfficialMaterials();
  const source = official.length > 0 ? official : legacyIndustrial;
  for (const mat of source) {
    const existing = getMaterialByIdOrLabel(mat.label);
    if (existing) {
      skipped++;
      continue;
    }
    const result = createMaterial({
      label: mat.label,
      categoryId: mat.industrial ? MIGRATED_CATEGORY_ID : "outros",
      espessura: mat.industrialDefaults?.espessuraPadrao ?? DEFAULT_SHEET_THICKNESS_MM,
      precoPorM2: mat.industrialDefaults?.custo_m2 ?? 0,
      sheetWidthMm: Number(mat.industrialDefaults?.larguraChapa) || DEFAULT_SHEET_WIDTH_MM,
      sheetHeightMm: Number(mat.industrialDefaults?.alturaChapa) || DEFAULT_SHEET_HEIGHT_MM,
      sheetThicknessMm: Number(mat.industrialDefaults?.espessuraPadrao) || DEFAULT_SHEET_THICKNESS_MM,
      industrialMaterialId: mat.canonicalId,
      visualPresetId: mat.viewerMaterialId ?? undefined,
    });
    if (result.success) migrated++;
  }
  return { migrated: migrated + restored.created + restored.updated, skipped };
}

/**
 * Valida campos obrigatórios: nome/label, categoria, espessura, preço.
 * Presets visuais e materiais industriais são referências (id/label), não validadas como objetos.
 */
export function validateMaterialData(
  data: Partial<CreateMaterialData> | Partial<MaterialRecord>
): MaterialValidationResult {
  const label = typeof data.label === "string" ? data.label.trim() : "";
  if (!label) {
    return { valid: false, error: "Nome / Label é obrigatório." };
  }
  const categoryId = data.categoryId;
  if (categoryId === undefined || categoryId === null || String(categoryId).trim() === "") {
    return { valid: false, error: "Categoria é obrigatória." };
  }
  const espessura = data.espessura;
  if (espessura === undefined || espessura === null || Number(espessura) <= 0) {
    return { valid: false, error: "Espessura deve ser um número positivo." };
  }
  const preco = data.precoPorM2;
  if (preco === undefined || preco === null || Number(preco) < 0) {
    return { valid: false, error: "Preço por m² deve ser zero ou positivo." };
  }
  const sheetWidth = Number(data.sheetWidthMm ?? DEFAULT_SHEET_WIDTH_MM);
  const sheetHeight = Number(data.sheetHeightMm ?? DEFAULT_SHEET_HEIGHT_MM);
  const sheetThickness = Number(data.sheetThicknessMm ?? DEFAULT_SHEET_THICKNESS_MM);
  if (!Number.isFinite(sheetWidth) || sheetWidth <= 0) {
    return { valid: false, error: "Largura da chapa deve ser um número positivo." };
  }
  if (!Number.isFinite(sheetHeight) || sheetHeight <= 0) {
    return { valid: false, error: "Altura da chapa deve ser um número positivo." };
  }
  if (!Number.isFinite(sheetThickness) || sheetThickness <= 0) {
    return { valid: false, error: "Espessura da chapa deve ser um número positivo." };
  }
  if (data.sheetWeightKg !== undefined && (!Number.isFinite(Number(data.sheetWeightKg)) || Number(data.sheetWeightKg) < 0)) {
    return { valid: false, error: "Peso da chapa deve ser zero ou positivo." };
  }
  if (data.sheetDensity !== undefined && (!Number.isFinite(Number(data.sheetDensity)) || Number(data.sheetDensity) < 0)) {
    return { valid: false, error: "Densidade deve ser zero ou positiva." };
  }
  return { valid: true };
}

/**
 * Lista todos os materiais guardados (localStorage).
 */
export function listMaterials(): MaterialRecord[] {
  ensureRequiredMaterialsCatalog();
  return loadFromStorage();
}

/**
 * Obtém um material por id ou label (case-insensitive).
 */
export function getMaterialByIdOrLabel(idOuLabel: string): MaterialRecord | null {
  if (!idOuLabel || typeof idOuLabel !== "string") return null;
  const list = loadFromStorage();
  const lower = idOuLabel.trim().toLowerCase();
  const fromStorage = (
    list.find(
      (m) => m.id.toLowerCase() === lower || (m.label && m.label.trim().toLowerCase() === lower)
    ) ?? null
  );
  if (fromStorage) return fromStorage;

  const official = resolveMaterial(idOuLabel);
  if (!official) return null;
  return {
    id: official.canonicalId,
    label: official.label,
    categoryId: "industrial",
    espessura: official.industrialDefaults?.espessuraPadrao ?? DEFAULT_SHEET_THICKNESS_MM,
    precoPorM2: official.industrialDefaults?.custo_m2 ?? 0,
    sheetWidthMm: official.industrialDefaults?.larguraChapa ?? DEFAULT_SHEET_WIDTH_MM,
    sheetHeightMm: official.industrialDefaults?.alturaChapa ?? DEFAULT_SHEET_HEIGHT_MM,
    sheetThicknessMm: official.industrialDefaults?.espessuraPadrao ?? DEFAULT_SHEET_THICKNESS_MM,
    industrialMaterialId: official.canonicalId,
    visualPresetId: official.viewerMaterialId,
  };
}

/**
 * Resolve o materialId efetivo de uma caixa: box.material ?? project.materialId.
 * Para uso em PDF, Cutlist e CNC.
 */
export function getMaterialForBox(
  box: BoxModule,
  projectMaterialId?: string
): string {
  const fromBox = box.material;
  if (fromBox !== undefined && fromBox !== null && String(fromBox).trim() !== "") {
    return String(fromBox).trim();
  }
  return projectMaterialId ?? "";
}

const FALLBACK_LABEL = getDefaultOfficialMaterial().label;
const FALLBACK_ESPESSURA = 18;
const FALLBACK_PRECO = 0;

/**
 * Informação de material para PDF/Cutlist: label, espessura, preço, categoria.
 * Fallback seguro para projetos antigos (id/label não encontrado no CRUD).
 */
export function getMaterialDisplayInfo(materialIdOrLabel: string): MaterialDisplayInfo {
  if (!materialIdOrLabel || typeof materialIdOrLabel !== "string") {
    return {
      label: FALLBACK_LABEL,
      espessura: FALLBACK_ESPESSURA,
      precoPorM2: FALLBACK_PRECO,
    };
  }
  const m = getMaterialByIdOrLabel(materialIdOrLabel);
  if (m) {
    return {
      label: m.label,
      espessura: Number(m.espessura) || FALLBACK_ESPESSURA,
      precoPorM2: Number(m.precoPorM2 ?? FALLBACK_PRECO),
      categoryId: m.categoryId,
      materialId: m.id,
    };
  }
  return {
    label: materialIdOrLabel.trim(),
    espessura: FALLBACK_ESPESSURA,
    precoPorM2: FALLBACK_PRECO,
  };
}

/**
 * Material industrial para CNC/boxManufacturing: nome, espessura, custo, chapa.
 * Usa CRUD quando existe; senão resolve por nome na lista industrial (legado).
 */
export function getIndustrialMaterial(materialIdOrLabel: string): MaterialIndustrial {
  if (!materialIdOrLabel || typeof materialIdOrLabel !== "string") {
    const fallback = getIndustrialByName(FALLBACK_LABEL);
    return {
      ...fallback,
      larguraChapa: fallback.larguraChapa || CHAPA_PADRAO_LARGURA,
      alturaChapa: fallback.alturaChapa || CHAPA_PADRAO_ALTURA,
    };
  }
  const m = getMaterialByIdOrLabel(materialIdOrLabel);
  if (m) {
    const fromList = getIndustrialByName(m.industrialMaterialId ?? m.label);
    if (fromList && (fromList.nome === m.label || fromList.nome === m.industrialMaterialId)) {
      return fromList;
    }
    return {
      nome: m.label,
      espessuraPadrao: Number(m.espessura) || FALLBACK_ESPESSURA,
      custo_m2: Number(m.precoPorM2 ?? FALLBACK_PRECO),
      larguraChapa: Number(m.sheetWidthMm) || CHAPA_PADRAO_LARGURA,
      alturaChapa: Number(m.sheetHeightMm) || CHAPA_PADRAO_ALTURA,
    };
  }
  const official = resolveMaterial(materialIdOrLabel);
  if (official?.industrial) {
    return {
      nome: official.label,
      espessuraPadrao: official.industrialDefaults?.espessuraPadrao ?? FALLBACK_ESPESSURA,
      custo_m2: official.industrialDefaults?.custo_m2 ?? FALLBACK_PRECO,
      larguraChapa: official.industrialDefaults?.larguraChapa ?? CHAPA_PADRAO_LARGURA,
      alturaChapa: official.industrialDefaults?.alturaChapa ?? CHAPA_PADRAO_ALTURA,
      densidade: official.industrialDefaults?.densidade,
      materialPbrId: official.viewerMaterialId as MaterialIndustrial["materialPbrId"],
    };
  }
  const legacy = getIndustrialByName(materialIdOrLabel);
  return {
    ...legacy,
    larguraChapa: legacy.larguraChapa || CHAPA_PADRAO_LARGURA,
    alturaChapa: legacy.alturaChapa || CHAPA_PADRAO_ALTURA,
  };
}

/**
 * Converte id/label do CRUD (ou string legada) no materialName aceite pelo Viewer (MaterialLibrary).
 * Não altera MaterialLibrary nem WoodMaterial; apenas devolve a string a passar em updateBox(..., { materialName }).
 */
export function getViewerMaterialId(materialIdOrLabel: string): string {
  const official = resolveMaterial(materialIdOrLabel);
  if (official?.viewerMaterialId) return official.viewerMaterialId;
  const m = getMaterialByIdOrLabel(materialIdOrLabel);
  if (m?.visualPresetId) return m.visualPresetId;
  return "mdf_branco";
}

/**
 * Cria um novo material. Gera id único. Valida campos obrigatórios.
 * Presets visuais e materiais industriais são guardados como referências (string id/label).
 */
export function createMaterial(data: CreateMaterialData): MaterialResult {
  const validation = validateMaterialData(data);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Dados inválidos." };
  }
  const list = loadFromStorage();
  const id = generateId();
  const record: MaterialRecord = {
    id,
    label: String(data.label).trim(),
    categoryId: data.categoryId,
    color: data.color,
    textureUrl: data.textureUrl,
    espessura: Number(data.espessura),
    precoPorM2: Number(data.precoPorM2),
    sheetWidthMm: Number(data.sheetWidthMm) > 0 ? Number(data.sheetWidthMm) : DEFAULT_SHEET_WIDTH_MM,
    sheetHeightMm: Number(data.sheetHeightMm) > 0 ? Number(data.sheetHeightMm) : DEFAULT_SHEET_HEIGHT_MM,
    sheetThicknessMm: Number(data.sheetThicknessMm) > 0 ? Number(data.sheetThicknessMm) : DEFAULT_SHEET_THICKNESS_MM,
    sheetWeightKg: Number.isFinite(Number(data.sheetWeightKg)) ? Number(data.sheetWeightKg) : undefined,
    sheetDensity: Number.isFinite(Number(data.sheetDensity)) ? Number(data.sheetDensity) : undefined,
    industrialMaterialId: data.industrialMaterialId,
    visualPresetId: data.visualPresetId,
  };
  list.push(record);
  saveToStorage(list);
  return { success: true, data: record };
}

/**
 * Atualiza um material existente por id. Valida campos obrigatórios se fornecidos.
 */
export function updateMaterial(
  id: string,
  data: UpdateMaterialData
): MaterialResult {
  const list = loadFromStorage();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) {
    return { success: false, error: "Material não encontrado." };
  }
  const existing = list[index];
  const merged: MaterialRecord = {
    ...existing,
    ...data,
    id: existing.id,
  };
  const validation = validateMaterialData(merged);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Dados inválidos." };
  }
  list[index] = merged;
  saveToStorage(list);
  return { success: true, data: merged };
}

/**
 * Elimina um material por id.
 */
export function deleteMaterial(id: string): boolean {
  const list = loadFromStorage();
  const filtered = list.filter((m) => m.id !== id);
  if (filtered.length === list.length) return false;
  saveToStorage(filtered);
  return true;
}

/**
 * Duplica um material: cria novo registo com os mesmos dados e id gerado.
 */
export function duplicateMaterial(id: string): MaterialResult {
  const list = loadFromStorage();
  const source = list.find((m) => m.id === id);
  if (!source) return { success: false, error: "Material não encontrado." };
  return createMaterial({
    label: `${source.label} (cópia)`,
    categoryId: source.categoryId,
    color: source.color,
    textureUrl: source.textureUrl,
    espessura: source.espessura,
    precoPorM2: source.precoPorM2,
    sheetWidthMm: source.sheetWidthMm,
    sheetHeightMm: source.sheetHeightMm,
    sheetThicknessMm: source.sheetThicknessMm,
    sheetWeightKg: source.sheetWeightKg,
    sheetDensity: source.sheetDensity,
    industrialMaterialId: source.industrialMaterialId,
    visualPresetId: source.visualPresetId,
  });
}

/**
 * Exporta todos os materiais como JSON (string).
 */
export function exportMaterialsAsJson(): string {
  const list = loadFromStorage();
  return JSON.stringify(list, null, 2);
}

/**
 * Importa materiais a partir de JSON. merge: adiciona apenas os que não existem (por label).
 */
export function importMaterialsFromJson(
  json: string,
  options?: { merge?: boolean }
): { imported: number; errors: string[] } {
  const merge = options?.merge !== false;
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { imported: 0, errors: ["JSON inválido."] };
  }
  if (!Array.isArray(parsed)) {
    return { imported: 0, errors: ["Esperado um array de materiais."] };
  }
  const list = loadFromStorage();
  const existingLabels = new Set(list.map((m) => (m.label ?? "").trim().toLowerCase()));
  let imported = 0;
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>;
    if (!item || typeof item.label !== "string" || !String(item.label).trim()) {
      errors.push(`Item ${i + 1}: label obrigatório.`);
      continue;
    }
    const label = String(item.label).trim();
    if (merge && existingLabels.has(label.toLowerCase())) continue;
    const data: CreateMaterialData = {
      label,
      categoryId: typeof item.categoryId === "string" ? item.categoryId : MIGRATED_CATEGORY_ID,
      color: typeof item.color === "string" ? item.color : undefined,
      textureUrl: typeof item.textureUrl === "string" ? item.textureUrl : undefined,
      espessura: typeof item.espessura === "number" ? item.espessura : Number(item.espessura) || 18,
      precoPorM2: typeof item.precoPorM2 === "number" ? item.precoPorM2 : Number(item.precoPorM2 ?? 0),
      sheetWidthMm: typeof item.sheetWidthMm === "number" ? item.sheetWidthMm : Number(item.sheetWidthMm) || DEFAULT_SHEET_WIDTH_MM,
      sheetHeightMm: typeof item.sheetHeightMm === "number" ? item.sheetHeightMm : Number(item.sheetHeightMm) || DEFAULT_SHEET_HEIGHT_MM,
      sheetThicknessMm:
        typeof item.sheetThicknessMm === "number" ? item.sheetThicknessMm : Number(item.sheetThicknessMm) || DEFAULT_SHEET_THICKNESS_MM,
      sheetWeightKg: typeof item.sheetWeightKg === "number" ? item.sheetWeightKg : Number(item.sheetWeightKg) || undefined,
      sheetDensity: typeof item.sheetDensity === "number" ? item.sheetDensity : Number(item.sheetDensity) || undefined,
      industrialMaterialId: typeof item.industrialMaterialId === "string" ? item.industrialMaterialId || undefined : undefined,
      visualPresetId: typeof item.visualPresetId === "string" ? item.visualPresetId || undefined : undefined,
    };
    if (!data.categoryId) data.categoryId = MIGRATED_CATEGORY_ID;
    const espessura = Number(data.espessura) || 18;
    const precoPorM2 = Number(data.precoPorM2) >= 0 ? Number(data.precoPorM2) : 0;
    const result = createMaterial({ ...data, espessura, precoPorM2 });
    if (result.success) {
      imported++;
      if (result.data?.label) existingLabels.add(result.data.label.trim().toLowerCase());
    } else {
      const errorMessage = result.error ?? "Erro ao importar material.";
      errors.push(`Item ${i + 1} (${label}): ${errorMessage}`);
    }
  }
  return { imported, errors };
}

/**
 * Obtém presets por categoria.
 * @placeholder Sem lógica real (presets visuais como referência).
 */
export function getPresetsByCategory(_categoryId: string): MaterialPreset[] {
  return [];
}

/**
 * Aplica material a uma parte/caixa.
 * @placeholder Sem lógica real.
 */
export function applyMaterial(
  _assignment: MaterialAssignment,
  _options?: ApplyMaterialOptions
): void {
  // FASE 3: implementar
}

/**
 * Obtém o estado atual do sistema de materiais.
 * @placeholder Sem lógica real.
 */
export function getMaterialsState(): MaterialsSystemState {
  return {
    assignments: [],
    activeCategoryId: null,
  };
}

/**
 * Reseta overrides de categoria.
 * @placeholder Sem lógica real.
 */
export function resetCategoryOverrides(): void {
  // FASE 3: implementar
}
