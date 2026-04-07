/**
 * Motor de fabricação multiprojeto (Fase 1).
 * Agrega vários projetos num único ZIP sem alterar snapshots, estado em memória nem o motor industrial existente.
 */

import JSZip from "jszip";
import type { BoxModule, CutListItemComPreco } from "../types";
import type { ProjectState } from "../../context/projectTypes";
import { applyResultados } from "../../context/projectState";
import { reviveState } from "../../context/projectPersistence";
import { loadProjectRecord } from "../projects/projectsClient";
import { cutlistComPrecoFromBoxes } from "../manufacturing/cutlistFromBoxes";
import { gerarPdfTecnicoCompleto } from "../pdf/gerarPdfTecnico";
import { buildCutlistPdf, type ProjectForPdf } from "../pdf/pdfCutlist";
import { buildUnifiedPdf } from "../pdf/pdfUnified";
import { buildEtiquetasPdf } from "../pdf/pdfEtiquetas";
import { runCutLayout, cutlistToPieces, type CutlistItemForPieces } from "../cutlayout/cutLayoutEngine";
import {
  buildCncFromCutlistItems,
  getDefaultCncLayoutOptions,
  getFastCncLayoutOptions,
  getSheetDefinitionFromSettings,
} from "../cnc/cncPipeline";
import { buildDrillFilesForProject } from "../drill/drillExport";
import { getSettings } from "../settings/settingsService";
import { sanitizeZipPath } from "../../utils/sanitization";
import { devLogger } from "../../utils/devLogger";

export interface GeneratedFabricationPackage {
  zipBlob: Blob;
  summary: {
    totalPieces: number;
    projects: string[];
  };
}

export type GenerationStep = {
  step: number;
  total: number;
  label: string;
  detail?: string;
  elapsed: number;
};

export type MultiProjectFabricationOptions = {
  nesting?: "auto" | "none";
  signal?: AbortSignal;
  onProgress?: (_step: GenerationStep) => void;
};

function pdfToBlob(doc: { output: (_type: string) => ArrayBuffer | Uint8Array }): Blob {
  const arr = doc.output("arraybuffer");
  const buffer = arr instanceof ArrayBuffer ? arr : new Uint8Array(arr).buffer;
  return new Blob([buffer], { type: "application/pdf" });
}

function formatThicknessBucket(thicknessMm: number): string {
  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) return "0mm";
  const rounded = Math.round(thicknessMm * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", "_");
  return `${label}mm`;
}

function tcnMethodSuffix(tcnMetodo: string | undefined): "mo" | "v1" | "v2" | "v2n" | "v3" | "v3n" | "v4" | "v5" | "v6" {
  switch (tcnMetodo) {
    case "nesting_mo":
      return "mo";
    case "v2_new":
      return "v2n";
    case "v2_ramp":
      return "v2";
    case "v3_new":
      return "v3n";
    case "v3_ramp_noflip":
      return "v3";
    case "v4_corner_noflip":
      return "v4";
    case "v5_ramp_noanchor":
      return "v5";
    case "v6_ramp":
      return "v6";
    case "v1_corner":
    default:
      return "v1";
  }
}

function projectSlug(name: string): string {
  return (
    (name || "projeto")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "_") || "projeto"
  );
}

function buildItemsForCncExportFromState(state: ProjectState): CutListItemComPreco[] {
  const boxes = state.boxes ?? [];
  const cutlist = cutlistComPrecoFromBoxes(boxes, state.rules, state.materialId, state.projectName);
  const extracted = boxes.flatMap((b) => Object.values(state.extractedPartsByBoxId?.[b.id] ?? {}).flat());
  return [...cutlist, ...extracted].map((p) => ({
    ...p,
    boxId: p.boxId ?? "",
  })) as CutListItemComPreco[];
}

function prefixCutlistItem(item: CutListItemComPreco, prefix: string): CutListItemComPreco {
  const o = { ...item } as Record<string, unknown>;
  if (typeof o.id === "string") o.id = `${prefix}${o.id}`;
  if (typeof o.boxId === "string" && o.boxId) o.boxId = `${prefix}${o.boxId}`;
  if (typeof o.nome === "string") o.nome = `${prefix}${o.nome}`;
  if (typeof o.shortCode === "string" && o.shortCode) o.shortCode = `${prefix}${o.shortCode}`;
  if (typeof o.modelInstanceId === "string" && o.modelInstanceId) o.modelInstanceId = `${prefix}${o.modelInstanceId}`;
  if (typeof o.partName === "string" && o.partName) o.partName = `${prefix}${o.partName}`;
  return o as unknown as CutListItemComPreco;
}

function prefixBoxModule(box: BoxModule, prefix: string): BoxModule {
  return {
    ...box,
    id: `${prefix}${box.id}`,
    nome: `${prefix}${box.nome}`,
  };
}

function stateToProjectForPdf(state: ProjectState): ProjectForPdf {
  return {
    projectName: state.projectName ?? "Projeto",
    boxes: state.boxes ?? [],
    rules: state.rules,
    materialId: state.materialId,
    extractedPartsByBoxId: state.extractedPartsByBoxId ?? {},
  };
}

function safeAddPdf(
  zip: JSZip,
  zipPath: string,
  doc: { output: (_type: string) => ArrayBuffer | Uint8Array } | null | undefined
): boolean {
  if (!doc || typeof doc.output !== "function") return false;
  const safePath = sanitizeZipPath(zipPath);
  if (!safePath) return false;
  try {
    const blob = pdfToBlob(doc);
    if (!blob || blob.size === 0) return false;
    zip.file(safePath, blob);
    return true;
  } catch {
    return false;
  }
}

function uniqueFolderSegment(base: string, used: Set<string>): string {
  const sanitized = sanitizeZipPath(base) || "projeto";
  if (!used.has(sanitized)) {
    used.add(sanitized);
    return sanitized;
  }
  let n = 2;
  let candidate = `${sanitized}_${n}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${sanitized}_${n}`;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Carrega snapshots, recalcula com `applyResultados` e gera ZIP com PDFs por projeto e ficheiros industriais globais.
 * Peças agregadas usam prefixo `P1_`, `P2_`, … por ordem em `projectIds`.
 */
export async function generateMultiProjectFabrication(
  projectIds: string[],
  options?: MultiProjectFabricationOptions
): Promise<GeneratedFabricationPackage> {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    throw new Error("multiProjectFabrication: indique pelo menos um projectId.");
  }

  const nestingMode = options?.nesting ?? "auto";
  const signal = options?.signal;
  const onProgress = options?.onProgress;
  const totalSteps = 6;
  const t0 = Date.now();

  const emit = (step: number, label: string, detail?: string) => {
    onProgress?.({ step, total: totalSteps, label, detail, elapsed: Date.now() - t0 });
  };

  const checkAbort = () => {
    if (signal?.aborted) {
      const err = new Error("AbortError");
      err.name = "AbortError";
      throw err;
    }
  };

  const layoutOpts =
    nestingMode === "none"
      ? { ...getFastCncLayoutOptions(), originTopRight: true }
      : { ...getDefaultCncLayoutOptions(), originTopRight: true };

  const cncPipelineOpts = nestingMode === "none" ? getFastCncLayoutOptions() : getDefaultCncLayoutOptions();

  const tcnSuffix = tcnMethodSuffix(getSettings()?.cnc?.tcnMetodo);

  type LoadedEntry = {
    state: ProjectState;
    recordId: string;
    prefix: string;
  };

  const loaded: LoadedEntry[] = [];

  emit(1, "Carregando projetos…");
  for (let i = 0; i < projectIds.length; i += 1) {
    checkAbort();
    const recordId = projectIds[i];
    emit(1, "Carregando projetos…", `Projeto ${i + 1} de ${projectIds.length}`);
    const record = await loadProjectRecord(recordId);
    if (!record?.snapshot?.projectState) {
      throw new Error(`multiProjectFabrication: projeto não encontrado ou sem snapshot (${recordId}).`);
    }
    const revived = reviveState(record.snapshot.projectState);
    if (!revived) {
      throw new Error(`multiProjectFabrication: falha ao reviver estado (${recordId}).`);
    }
    const state = applyResultados(revived);
    loaded.push({
      state,
      recordId,
      prefix: `P${i + 1}_`,
    });
  }

  checkAbort();
  emit(2, "Gerando cutlist e PDFs por projeto…");

  const projectNames: string[] = [];
  const allPrefixedItems: CutListItemComPreco[] = [];
  const allPrefixedBoxes: BoxModule[] = [];
  const rulesForGlobal = loaded[0]!.state.rules;

  for (const entry of loaded) {
    const { state, prefix } = entry;
    projectNames.push(state.projectName || entry.recordId);

    const items = buildItemsForCncExportFromState(state).map((it) => prefixCutlistItem(it, prefix));
    allPrefixedItems.push(...items);

    for (const b of state.boxes ?? []) {
      allPrefixedBoxes.push(prefixBoxModule(b, prefix));
    }
  }

  const globalProjectStub = {
    projectName: "Fabricacao_Multi",
    rules: rulesForGlobal,
  };

  const zip = new JSZip();
  const folderNamesUsed = new Set<string>();

  for (const entry of loaded) {
    checkAbort();
    const proj = stateToProjectForPdf(entry.state);
    emit(2, "Gerando cutlist e PDFs por projeto…", proj.projectName || entry.recordId);
    const folder = uniqueFolderSegment(projectSlug(proj.projectName), folderNamesUsed);
    const basePath = `projetos/${folder}`;

    try {
      const docCutlist = await buildCutlistPdf(proj);
      safeAddPdf(zip, `${basePath}/cutlist.pdf`, docCutlist);
    } catch (err) {
      devLogger.error("multiProjectFabrication: cutlist PDF", err);
    }

    try {
      const docTecnico = gerarPdfTecnicoCompleto(proj.boxes, proj.rules, proj.projectName, {
        materialId: proj.materialId,
      });
      safeAddPdf(zip, `${basePath}/tecnico.pdf`, docTecnico);
    } catch (err) {
      devLogger.error("multiProjectFabrication: técnico PDF", err);
    }

    try {
      const docUnificado = await buildUnifiedPdf(proj);
      safeAddPdf(zip, `${basePath}/unificado.pdf`, docUnificado);
    } catch (err) {
      devLogger.error("multiProjectFabrication: unificado PDF", err);
    }

    try {
      const docEtiquetas = await buildEtiquetasPdf({ ...proj, settings: getSettings() });
      safeAddPdf(zip, `${basePath}/etiquetas.pdf`, docEtiquetas);
    } catch (err) {
      devLogger.error("multiProjectFabrication: etiquetas PDF", err);
    }
  }

  checkAbort();
  emit(3, "Otimizando layout de chapas…");

  const allItemsForLayout = allPrefixedItems as CutlistItemForPieces[];
  const layoutTitle = projectNames.join(" + ");

  try {
    const pieces = cutlistToPieces(allItemsForLayout);
    if (pieces.length > 0) {
      emit(4, "Aplicando meta-heurística de nesting…");
      const result = runCutLayout(pieces, getSheetDefinitionFromSettings(), layoutOpts);
      const { buildCutLayoutPdf } = await import("../cutlayout/cutLayoutPdf");
      const docLayout = await buildCutLayoutPdf(result, {
        projectName: layoutTitle || "Multi-projeto",
        nestingTopRightOrigin: true,
      });
      safeAddPdf(zip, "layout/layout_corte_pro.pdf", docLayout);
    }
  } catch (err) {
    devLogger.error("multiProjectFabrication: layout corte PRO", err);
  }

  checkAbort();
  emit(5, "Gerando ficheiros TCN/CNC…");

  try {
    const byMaterial = new Map<string, CutListItemComPreco[]>();
    for (const item of allPrefixedItems) {
      const key = ((item as { material?: string }).material ?? "Módulo").trim() || "Módulo";
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key)!.push(item);
    }
    const usedTcnNamesByPath = new Set<string>();

    for (const [materialName, itemsForMaterial] of byMaterial) {
      checkAbort();
      emit(5, "Gerando ficheiros TCN/CNC…", materialName);
      const cncBundle = buildCncFromCutlistItems(
        globalProjectStub,
        itemsForMaterial as CutlistItemForPieces[],
        undefined,
        cncPipelineOpts
      );
      if (!cncBundle?.cnc?.files?.length) continue;
      const safeMaterialName = materialName.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Sheet";
      for (const file of cncBundle.cnc.files) {
        if (!file || file.tcn == null) continue;
        const thicknessBucket = formatThicknessBucket(file.thicknessMm);
        const base =
          cncBundle.cnc.files.length === 1 ? safeMaterialName : `${safeMaterialName}_${file.panelIndex}`;
        let finalBase = base;
        let dedupeIndex = 2;
        while (usedTcnNamesByPath.has(`cnc/${thicknessBucket}/${finalBase}`)) {
          finalBase = `${base}_${dedupeIndex}`;
          dedupeIndex += 1;
        }
        usedTcnNamesByPath.add(`cnc/${thicknessBucket}/${finalBase}`);
        const tcnPathFinal = sanitizeZipPath(`cnc/${thicknessBucket}/${finalBase}_cnc_${tcnSuffix}.tcn`);
        if (tcnPathFinal && typeof file.tcn === "string") {
          zip.file(tcnPathFinal, file.tcn);
        }
      }
    }
  } catch (err) {
    devLogger.error("multiProjectFabrication: CNC", err);
  }

  checkAbort();
  emit(5, "Gerando ficheiros de furação (drill)…");

  try {
    const drillFiles = buildDrillFilesForProject(allPrefixedItems, {
      projectName: globalProjectStub.projectName,
      boxes: allPrefixedBoxes,
      rules: rulesForGlobal,
    });
    const usedDrill = new Set<string>();
    for (const f of drillFiles) {
      const base = sanitizeZipPath(f.filenameBase) || "peca";
      let n = 2;
      let name = base;
      while (usedDrill.has(name)) {
        name = `${base}_${n}`;
        n += 1;
      }
      usedDrill.add(name);
      zip.file(sanitizeZipPath(`drill/${name}.xml`), f.xml);
    }
  } catch (err) {
    devLogger.error("multiProjectFabrication: drill XML", err);
  }

  checkAbort();
  emit(6, "Compactando pacote industrial…");

  const zipBlob = await zip.generateAsync({ type: "blob" });
  if (!zipBlob || zipBlob.size === 0) {
    throw new Error("multiProjectFabrication: ZIP gerado inválido ou vazio.");
  }

  return {
    zipBlob,
    summary: {
      totalPieces: allPrefixedItems.length,
      projects: projectNames,
    },
  };
}
