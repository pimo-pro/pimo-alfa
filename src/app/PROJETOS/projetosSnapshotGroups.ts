import { applyResultados } from "../../context/projectState";
import { reviveState } from "../../context/projectPersistence";
import type { ProjectState } from "../../context/projectTypes";
import type { CutListItem, CutListItemComPreco } from "../../core/types";
import { buildCutlistItemsForIndustrialExport } from "../../core/fabrication/buildCutlistItemsForIndustrialExport";
import { resolveRematePieceDisplayName } from "../../core/remate/labels";
import { REMATE_PIECE_TIPO_LABELS, type RematePiece } from "../../core/remate/rematePieceTypes";
import { rodapeKindLabel, type ProjectRodape } from "../../core/rodape/rodapeTypes";
import type { SavedProjectRecord } from "../../core/projects/types";

export type ProjetosElementRow = {
  id: string;
  label: string;
  subtitle?: string;
  boxId?: string;
  pieceId?: string;
};

export type ProjetosElementGroups = {
  projectName: string;
  boxes: ProjetosElementRow[];
  remates: ProjetosElementRow[];
  rodapes: ProjetosElementRow[];
  industrialPieces: ProjetosElementRow[];
  readyPieces: ProjetosElementRow[];
  standalonePieces: ProjetosElementRow[];
};

function reviveProjectStateFromRecord(snapshot: SavedProjectRecord | null): ProjectState | null {
  if (!snapshot) return null;
  const revived = reviveState(snapshot.snapshot?.projectState);
  if (!revived) return null;
  return applyResultados(revived);
}

function boxLabel(state: ProjectState, boxId: string | undefined): string | undefined {
  if (!boxId) return undefined;
  const ws = state.workspaceBoxes?.find((b) => b.id === boxId);
  if (ws?.nome?.trim()) return ws.nome.trim();
  const mod = state.boxes.find((b) => b.id === boxId);
  return mod?.nome?.trim() || boxId;
}

function remateRow(remate: RematePiece, state: ProjectState): ProjetosElementRow {
  const tipoLabel = REMATE_PIECE_TIPO_LABELS[remate.tipo] ?? remate.tipo;
  const label = resolveRematePieceDisplayName(remate, remate.name);
  const parent = boxLabel(state, remate.parentBoxId);
  return {
    id: remate.id,
    label,
    subtitle: parent ? `${tipoLabel} · ${parent}` : tipoLabel,
    boxId: remate.parentBoxId,
    pieceId: remate.id,
  };
}

function rodapeRow(rodape: ProjectRodape, state: ProjectState): ProjetosElementRow {
  const label = rodape.nomePersonalizado?.trim() || rodape.name?.trim() || rodapeKindLabel(rodape.kind, rodape.partIndex);
  const parent = boxLabel(state, rodape.parentBoxId);
  const dims = `${Math.round(rodape.dimensions.widthMm)}×${Math.round(rodape.dimensions.heightMm)} mm`;
  return {
    id: rodape.id,
    label,
    subtitle: parent ? `${rodapeKindLabel(rodape.kind, rodape.partIndex)} · ${parent} · ${dims}` : `${rodapeKindLabel(rodape.kind, rodape.partIndex)} · ${dims}`,
    boxId: rodape.parentBoxId,
    pieceId: rodape.id,
  };
}

function cutListRow(item: CutListItem | CutListItemComPreco, state: ProjectState): ProjetosElementRow {
  const parent = boxLabel(state, item.boxId);
  const tipo = item.tipo?.trim() || "peça";
  return {
    id: item.id,
    label: item.nome?.trim() || item.id,
    subtitle: parent ? `${tipo} · ${parent}` : tipo,
    boxId: item.boxId || undefined,
    pieceId: item.id,
  };
}

export function buildProjetosElementGroups(snapshot: SavedProjectRecord | null): ProjetosElementGroups | null {
  const state = reviveProjectStateFromRecord(snapshot);
  if (!state) return null;

  const projectName = snapshot?.name?.trim() || state.projectName?.trim() || "Projeto";
  const workspaceBoxes = state.workspaceBoxes ?? [];

  const boxes: ProjetosElementRow[] = workspaceBoxes.map((box) => ({
    id: box.id,
    label: box.nome?.trim() || box.id,
    subtitle: `${Math.round(box.dimensoes.largura)}×${Math.round(box.dimensoes.altura)}×${Math.round(box.dimensoes.profundidade)} mm`,
    boxId: box.id,
  }));

  const remates = (state.remates ?? [])
    .filter((r) => Boolean(r.parentBoxId))
    .map((r) => remateRow(r, state));

  const standalonePieces = (state.remates ?? [])
    .filter((r) => !r.parentBoxId)
    .map((r) => remateRow(r, state));

  const rodapes = (state.rodapes ?? []).map((r) => rodapeRow(r, state));

  const exportItems = buildCutlistItemsForIndustrialExport({
    rules: state.rules,
    materialId: state.materialId,
    projectName: state.projectName,
    boxes: state.boxes,
    remates: state.remates,
    rodapes: state.rodapes,
    extractedPartsByBoxId: state.extractedPartsByBoxId,
  });

  const industrialPieces = exportItems
    .filter(
      (item) =>
        item.sourceType !== "glb_importado" &&
        item.tipo !== "remate" &&
        item.tipo !== "rodape"
    )
    .map((item) => cutListRow(item, state));

  const readyPieces = exportItems
    .filter((item) => item.sourceType === "glb_importado")
    .map((item) => cutListRow(item, state));

  return {
    projectName,
    boxes,
    remates,
    rodapes,
    industrialPieces,
    readyPieces,
    standalonePieces,
  };
}
