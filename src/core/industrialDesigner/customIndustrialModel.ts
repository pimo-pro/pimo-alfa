/**
 * Modelos industriais personalizados criados na Workspace de Design.
 * Registo em runtime + localStorage; merge com BOX_MODELS_REGISTRY via getMergedBoxModelsRegistry().
 */

import type { BaseCabinetModel } from "../baseCabinets/types";
import type { CutListItem, CutListItemComPreco } from "../types";
import type { RulesConfig } from "../rules/rulesConfig";
import { ensureBuiltinIndustrialModelsRegistered } from "./builtinIndustrialBootstrap";
import {
  buildCutListComPrecoFromDesignBox,
  buildDrillFilesFromDesignBox,
  type DesignDrillExportProjectContext,
} from "./designToCutlist";
import { buildViewerDrillMarkersFromDesign } from "./designToViewer";
import { getBlockingIssues, validateIndustrialDesignBox } from "./geometryValidation";
import type { CustomIndustrialModelRecord } from "./industrialCatalogTypes";
import type { IndustrialDesignBox } from "./types";
import {
  getBuiltinIndustrialModel,
  isIndustrialCatalogModelId,
  listBuiltinIndustrialModelsAsBaseCabinet,
} from "./staticIndustrialRegistry";
import { listBuiltinIndustrialCatalogStubs } from "./builtinIndustrialCatalogStubs";

export type { CustomIndustrialModelMetadata, CustomIndustrialModelRecord } from "./industrialCatalogTypes";

export const CUSTOM_INDUSTRIAL_MODEL_PREFIX = "custom-model-";

const STORAGE_KEY = "pimo-custom-industrial-models-v1";

const runtimeRegistry = new Map<string, CustomIndustrialModelRecord>();
let idFactory: () => string = () => `${CUSTOM_INDUSTRIAL_MODEL_PREFIX}${crypto.randomUUID()}`;
let storageLoaded = false;

export function isCustomIndustrialModelId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(CUSTOM_INDUSTRIAL_MODEL_PREFIX);
}

export { isBuiltinIndustrialModelId, isIndustrialCatalogModelId } from "./staticIndustrialRegistry";
export { ensureBuiltinIndustrialModelsRegistered } from "./builtinIndustrialBootstrap";

export function getIndustrialCatalogModel(id: string): CustomIndustrialModelRecord | undefined {
  ensureBuiltinIndustrialModelsRegistered();
  return getBuiltinIndustrialModel(id) ?? getCustomIndustrialModel(id);
}

/** Listagem de catálogo — stubs leves; bootstrap pesado só em getIndustrialCatalogModel. */
export function listIndustrialCatalogModelsAsBaseCabinet(): BaseCabinetModel[] {
  const registered = listBuiltinIndustrialModelsAsBaseCabinet();
  const builtins =
    registered.length > 0 ? registered : listBuiltinIndustrialCatalogStubs();
  return [...builtins, ...listCustomIndustrialModelsAsBaseCabinet()];
}

/** Apenas testes — IDs determinísticos. */
export function __setCustomIndustrialModelIdFactory(factory: (() => string) | null): void {
  idFactory = factory ?? (() => `${CUSTOM_INDUSTRIAL_MODEL_PREFIX}${crypto.randomUUID()}`);
}

export function __resetCustomIndustrialModelsForTests(): void {
  runtimeRegistry.clear();
  storageLoaded = false;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

function loadFromStorage(): void {
  if (storageLoaded || typeof localStorage === "undefined") {
    storageLoaded = true;
    return;
  }
  storageLoaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as CustomIndustrialModelRecord[];
    if (!Array.isArray(parsed)) return;
    for (const record of parsed) {
      if (record?.id && isCustomIndustrialModelId(record.id)) {
        runtimeRegistry.set(record.id, record);
      }
    }
  } catch {
    // ignore corrupt storage
  }
}

function persistToStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...runtimeRegistry.values()]));
  } catch {
    // quota / private mode
  }
}

export function listCustomIndustrialModels(): CustomIndustrialModelRecord[] {
  loadFromStorage();
  return [...runtimeRegistry.values()];
}

export function getCustomIndustrialModel(id: string): CustomIndustrialModelRecord | undefined {
  loadFromStorage();
  return runtimeRegistry.get(id);
}

export function registerCustomIndustrialModel(record: CustomIndustrialModelRecord): void {
  loadFromStorage();
  runtimeRegistry.set(record.id, record);
  persistToStorage();
}

export function customIndustrialModelToBaseCabinet(record: CustomIndustrialModelRecord): BaseCabinetModel {
  return {
    id: record.id,
    nome: record.nome,
    widthMm: record.widthMm,
    heightMm: record.heightMm,
    depthMm: record.depthMm,
    doors: record.designBox.panels.filter((p) => p.tipo === "frente").length,
    shelves: record.designBox.panels.filter((p) => p.tipo === "prateleira").length,
    drawers: 0,
    categoria: record.metadata.categoriaCatalogo ?? "base",
    tipo: "industrial-designer",
    designWorkspace: record.designWorkspace,
    subcategoriaCatalogo: record.designWorkspace
      ? "modelos-industriais-personalizados"
      : "modulos-industriais",
  };
}

export function listCustomIndustrialModelsAsBaseCabinet(): BaseCabinetModel[] {
  return listCustomIndustrialModels().map(customIndustrialModelToBaseCabinet);
}

/** Clona designBox para uma nova instância de caixa no workspace. */
export function remapDesignBoxForWorkspaceBox(
  designBox: IndustrialDesignBox,
  newBoxId: string,
  newNome?: string
): IndustrialDesignBox {
  const idMap = new Map<string, string>();

  const panels = designBox.panels.map((panel) => {
    const suffix = panel.id.includes(":") ? panel.id.split(":").slice(1).join(":") : panel.tipo;
    const newPanelId = `${newBoxId}:${suffix}`;
    idMap.set(panel.id, newPanelId);
    return {
      ...panel,
      id: newPanelId,
      drillHoles: panel.drillHoles.map((hole) => ({ ...hole })),
    };
  });

  const constraints = designBox.constraints.map((constraint) => ({
    ...constraint,
    panelAId: idMap.get(constraint.panelAId) ?? constraint.panelAId,
    panelBId: idMap.get(constraint.panelBId) ?? constraint.panelBId,
  }));

  return {
    ...designBox,
    id: newBoxId,
    nome: newNome ?? designBox.nome,
    panels,
    constraints,
  };
}

export function remapCutlistComPrecoForWorkspaceBox(
  cutlist: CutListItemComPreco[],
  idMap: Map<string, string>,
  newBoxId: string
): CutListItemComPreco[] {
  return cutlist.map((item) => ({
    ...item,
    id: idMap.get(item.id) ?? item.id,
    boxId: newBoxId,
    drillHoles: item.drillHoles?.map((h) => ({ ...h })),
  }));
}

function buildPanelIdMap(
  templateDesignBox: IndustrialDesignBox,
  targetDesignBox: IndustrialDesignBox
): Map<string, string> {
  const map = new Map<string, string>();
  templateDesignBox.panels.forEach((panel, index) => {
    const target = targetDesignBox.panels[index];
    if (target) map.set(panel.id, target.id);
  });
  return map;
}

/** Cutlist do modelo personalizado remapeada para uma instância de caixa. */
export function resolveCustomIndustrialCutlistForBox(box: {
  id: string;
  baseCabinetId?: string;
  customIndustrialModelId?: string;
}): CutListItemComPreco[] | null {
  const modelId = box.customIndustrialModelId ?? box.baseCabinetId;
  if (!modelId || !isIndustrialCatalogModelId(modelId)) return null;

  const record = getIndustrialCatalogModel(modelId);
  if (!record) return null;

  const remappedDesign = remapDesignBoxForWorkspaceBox(record.designBox, box.id);
  const idMap = buildPanelIdMap(record.designBox, remappedDesign);
  return remapCutlistComPrecoForWorkspaceBox(record.cutlistComPreco, idMap, box.id);
}

export type CreateCustomIndustrialModelInput = {
  designBox: IndustrialDesignBox;
  nome?: string;
  project?: DesignDrillExportProjectContext;
  rules?: RulesConfig;
};

export type CreateCustomIndustrialModelResult = {
  record: CustomIndustrialModelRecord;
  baseCabinet: BaseCabinetModel;
};

/**
 * Converte designBox actual em modelo industrial registado no catálogo.
 * Gera cutlist, TXML e marcadores viewer (SSOT).
 */
export function createCustomIndustrialModelFromDesignBox(
  input: CreateCustomIndustrialModelInput
): CreateCustomIndustrialModelResult {
  const { designBox } = input;
  const blocking = getBlockingIssues(validateIndustrialDesignBox(designBox));
  if (blocking.length > 0) {
    throw new Error(blocking.map((i) => i.message).join("; "));
  }

  const project: DesignDrillExportProjectContext = input.project ?? {
    projectName: "MODELO_INDUSTRIAL",
    boxes: [],
    rules: input.rules ?? ({} as RulesConfig),
  };

  const cutlistComPreco = buildCutListComPrecoFromDesignBox(designBox);
  const cutlist: CutListItem[] = cutlistComPreco.map(({ precoUnitario: _pu, precoTotal: _pt, ...item }) => item);
  const viewerMarkers = buildViewerDrillMarkersFromDesign(designBox);
  const drillExportFiles = buildDrillFilesFromDesignBox(designBox, project);

  const holeCount = designBox.panels.reduce((sum, p) => sum + p.drillHoles.length, 0);
  const id = idFactory();
  const nome = input.nome?.trim() || "Modelo Industrial Personalizado";

  const record: CustomIndustrialModelRecord = {
    id,
    nome,
    tipo: "industrial-designer",
    designWorkspace: true,
    widthMm: designBox.outerWidthMm,
    heightMm: designBox.outerHeightMm,
    depthMm: designBox.outerDepthMm,
    designBox: structuredClone(designBox),
    cutlist,
    cutlistComPreco,
    drillExportFiles,
    viewerMarkers,
    metadata: {
      designWorkspace: true,
      tipo: "industrial-designer",
      sourceBoxId: designBox.id,
      panelCount: designBox.panels.length,
      holeCount,
      espessuraMm: designBox.espessuraMm,
      materialId: designBox.materialId,
      createdAt: new Date().toISOString(),
      cutlistItemCount: cutlist.length,
      txmlFileCount: drillExportFiles.length,
    },
  };

  registerCustomIndustrialModel(record);
  return {
    record,
    baseCabinet: customIndustrialModelToBaseCabinet(record),
  };
}

/** Instancia dados de design para uma nova caixa do workspace. */
export function instantiateCustomIndustrialModelForWorkspaceBox(
  modelId: string,
  workspaceBoxId: string,
  workspaceBoxNome: string
): {
  designBox: IndustrialDesignBox;
  cutlistComPreco: CutListItemComPreco[];
} | null {
  const record = getIndustrialCatalogModel(modelId);
  if (!record) return null;

  const designBox = remapDesignBoxForWorkspaceBox(record.designBox, workspaceBoxId, workspaceBoxNome);
  const idMap = buildPanelIdMap(record.designBox, designBox);
  const cutlistComPreco = remapCutlistComPrecoForWorkspaceBox(
    record.cutlistComPreco,
    idMap,
    workspaceBoxId
  );

  return { designBox, cutlistComPreco };
}
