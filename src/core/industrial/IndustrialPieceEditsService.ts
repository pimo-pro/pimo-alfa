import type { CutListItemComPreco } from "../types";
import type { ProjectState } from "../../context/projectTypes";
import type { IndustrialPieceDimensionEdit, IndustrialPieceEdit, IndustrialPieceEditsStore } from "./industrialPieceEditsTypes";
import { normalizeObservacoesList } from "../observacoes/ObservacoesService";
import { ferragensFromBoxes } from "../manufacturing/cutlistFromBoxes";

export function validateIndustrialDimensions(dims: IndustrialPieceDimensionEdit): string | null {
  const values = [dims.largura, dims.altura, dims.espessura].filter((v) => v !== undefined);
  for (const v of values) {
    if (!Number.isFinite(v) || (v as number) <= 0) {
      return "Medidas devem ser números positivos (maiores que zero).";
    }
  }
  return null;
}

export function isIndustrialPieceEdited(edit?: IndustrialPieceEdit): boolean {
  if (!edit) return false;
  return Boolean(
    edit.deleted ||
      edit.boxId ||
      edit.largura != null ||
      edit.altura != null ||
      edit.espessura != null
  );
}

export function applyIndustrialPieceEdits(
  items: CutListItemComPreco[],
  edits?: IndustrialPieceEditsStore
): CutListItemComPreco[] {
  if (!edits || Object.keys(edits).length === 0) return items;

  return items
    .filter((item) => !edits[item.id]?.deleted)
    .map((item) => {
      const edit = edits[item.id];
      if (!edit || edit.deleted) return item;
      const largura = edit.largura ?? item.dimensoes.largura;
      const altura = edit.altura ?? item.dimensoes.altura;
      const esp = edit.espessura ?? item.espessura ?? item.dimensoes.profundidade;
      return {
        ...item,
        boxId: edit.boxId ?? item.boxId,
        dimensoes: {
          ...item.dimensoes,
          largura,
          altura,
          profundidade: esp,
        },
        espessura: esp,
      };
    });
}

function removeExtractedPiece(
  extracted: ProjectState["extractedPartsByBoxId"],
  pieceId: string
): ProjectState["extractedPartsByBoxId"] {
  const next: ProjectState["extractedPartsByBoxId"] = {};
  for (const [boxId, byModel] of Object.entries(extracted ?? {})) {
    const modelMap: Record<string, CutListItemComPreco[]> = {};
    for (const [modelId, list] of Object.entries(byModel ?? {})) {
      const filtered = (list ?? []).filter((p) => p.id !== pieceId);
      if (filtered.length > 0) modelMap[modelId] = filtered;
    }
    if (Object.keys(modelMap).length > 0) next[boxId] = modelMap;
  }
  return next;
}

function moveExtractedPiece(
  extracted: ProjectState["extractedPartsByBoxId"],
  pieceId: string,
  targetBoxId: string
): { extracted: ProjectState["extractedPartsByBoxId"]; moved: boolean } {
  let movedPiece: CutListItemComPreco | null = null;
  let sourceModelId: string | null = null;
  const without: ProjectState["extractedPartsByBoxId"] = {};

  for (const [boxId, byModel] of Object.entries(extracted ?? {})) {
    const modelMap: Record<string, CutListItemComPreco[]> = {};
    for (const [modelId, list] of Object.entries(byModel ?? {})) {
      const kept: CutListItemComPreco[] = [];
      for (const p of list ?? []) {
        if (p.id === pieceId) {
          movedPiece = { ...p, boxId: targetBoxId };
          sourceModelId = modelId;
        } else {
          kept.push(p);
        }
      }
      if (kept.length > 0) modelMap[modelId] = kept;
    }
    if (Object.keys(modelMap).length > 0) without[boxId] = modelMap;
  }

  if (!movedPiece || !sourceModelId) {
    return { extracted, moved: false };
  }

  const targetModels = { ...(without[targetBoxId] ?? {}) };
  const targetList = [...(targetModels[sourceModelId] ?? []), movedPiece];
  targetModels[sourceModelId] = targetList;
  return {
    extracted: { ...without, [targetBoxId]: targetModels },
    moved: true,
  };
}

export function patchProjectForIndustrialPieceMove(
  prev: ProjectState,
  pieceId: string,
  targetBoxId: string
): Pick<ProjectState, "industrialPieceEdits" | "extractedPartsByBoxId" | "remates"> {
  const { extracted, moved } = moveExtractedPiece(prev.extractedPartsByBoxId, pieceId, targetBoxId);
  const remates = (prev.remates ?? []).map((r) =>
    r.id === pieceId ? { ...r, parentBoxId: targetBoxId } : r
  );

  return {
    industrialPieceEdits: {
      ...(prev.industrialPieceEdits ?? {}),
      [pieceId]: {
        ...(prev.industrialPieceEdits?.[pieceId] ?? {}),
        boxId: targetBoxId,
        editedAt: new Date().toISOString(),
      },
    },
    extractedPartsByBoxId: moved ? extracted : prev.extractedPartsByBoxId,
    remates,
  };
}

export function patchProjectForIndustrialPieceDelete(
  prev: ProjectState,
  pieceId: string
): Pick<ProjectState, "industrialPieceEdits" | "extractedPartsByBoxId" | "remates" | "rodapes"> {
  const hadExtracted = JSON.stringify(prev.extractedPartsByBoxId).includes(`"${pieceId}"`);
  const extractedPartsByBoxId = hadExtracted
    ? removeExtractedPiece(prev.extractedPartsByBoxId, pieceId)
    : prev.extractedPartsByBoxId;

  const remates = (prev.remates ?? []).filter((r) => r.id !== pieceId);

  return {
    industrialPieceEdits: {
      ...(prev.industrialPieceEdits ?? {}),
      [pieceId]: {
        ...(prev.industrialPieceEdits?.[pieceId] ?? {}),
        deleted: true,
        editedAt: new Date().toISOString(),
      },
    },
    extractedPartsByBoxId,
    remates,
    rodapes: prev.rodapes,
  };
}

export function patchProjectForIndustrialPieceDimensions(
  prev: ProjectState,
  pieceId: string,
  dims: IndustrialPieceDimensionEdit
): IndustrialPieceEditsStore {
  return {
    ...(prev.industrialPieceEdits ?? {}),
    [pieceId]: {
      ...(prev.industrialPieceEdits?.[pieceId] ?? {}),
      ...dims,
      editedAt: new Date().toISOString(),
    },
  };
}

/** Payload preparado para integração futura com PIMO TRAK. */
export type EnviarParaFabricaPayload = {
  projeto: { nome: string; id?: string | null };
  caixas: Array<{ id: string; nome: string }>;
  pecas: Array<{
    id: string;
    caixaId: string;
    tipo: string;
    largura: number;
    comprimento: number;
    espessura: number;
    quantidade: number;
    material: string;
    observacoes: string[];
  }>;
  ferragens: Array<{ id: string; tipo: string; quantidade: number }>;
  medidas: { totalPecas: number; areaMm2: number; pesoKgEstimado: number };
  observacoes: Record<string, string[]>;
};

export function buildEnviarParaFabricaPayload(
  project: Pick<
    ProjectState,
    | "projectName"
    | "currentProjectId"
    | "boxes"
    | "rules"
    | "pieceObservacoes"
    | "industrialPieceEdits"
    | "materialId"
    | "remates"
    | "rodapes"
    | "extractedPartsByBoxId"
  >,
  items: CutListItemComPreco[]
): EnviarParaFabricaPayload {
  const boxes = project.boxes ?? [];
  const boxNome = Object.fromEntries(boxes.map((b) => [b.id, b.nome?.trim() || b.id]));

  let areaMm2 = 0;
  const pecas = items.map((item) => {
    const largura = item.dimensoes.largura;
    const comprimento = item.dimensoes.altura;
    const espessura = item.espessura ?? item.dimensoes.profundidade ?? 0;
    areaMm2 += largura * comprimento * (item.quantidade ?? 1);
    const obs = normalizeObservacoesList(project.pieceObservacoes?.[item.id]);
    return {
      id: item.id,
      caixaId: item.boxId ?? "",
      tipo: item.tipo,
      largura,
      comprimento,
      espessura,
      quantidade: item.quantidade ?? 1,
      material: item.material ?? "—",
      observacoes: obs,
    };
  });

  const ferragensList = ferragensFromBoxes(boxes, project.rules);
  const ferragens: EnviarParaFabricaPayload["ferragens"] = ferragensList.map((f) => ({
    id: f.id,
    tipo: f.tipo ?? f.nome,
    quantidade: f.quantidade,
  }));

  return {
    projeto: { nome: project.projectName?.trim() || "Projeto", id: project.currentProjectId },
    caixas: boxes.map((b) => ({ id: b.id, nome: boxNome[b.id] ?? b.id })),
    pecas,
    ferragens,
    medidas: {
      totalPecas: pecas.reduce((s, p) => s + p.quantidade, 0),
      areaMm2,
      pesoKgEstimado: areaMm2 * 0.00075 * 18,
    },
    observacoes: project.pieceObservacoes ?? {},
  };
}
