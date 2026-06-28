import { applyResultados } from "@/context/projectState";
import { reviveState } from "@/context/projectPersistence";
import type { SavedProjectRecord } from "@/core/projects/types";
import type { CutListItem } from "@/core/types";
import { buildBoxNomeByIdFromBoxes } from "@/core/cutlayout/cutLayoutProPieceNaming";
import { buildCutlistItemsForIndustrialExport } from "@/core/fabrication/buildCutlistItemsForIndustrialExport";

import { mapCutlistToIndustrialPieces, type CutlistPieceInput } from "../integration/cutlist/cutlistToPieces";
import type { IndustrialPiece } from "../core/pieces/types";

export interface ProjectCutlistContext {
  projectId: string;
  projectName: string;
  cutlist: CutlistPieceInput[];
  pieces: IndustrialPiece[];
  /** Cutlist bruta para nomenclatura industrial (etiqueta v5). */
  cutListItems: CutListItem[];
  /** Mapa boxId → nome de caixa para códigos industriais. */
  boxNameById: Record<string, string>;
}

function toCutlistInput(item: CutListItem): CutlistPieceInput {
  return {
    id: item.id,
    nome: item.nome,
    boxId: item.boxId,
    material: item.material,
    materialId: item.materialId,
    quantidade: item.quantidade,
    dimensoes: item.dimensoes,
    espessura: item.espessura,
    metadata: { tipo: item.tipo, panelId: item.id },
  };
}

/** Cutlist industrial a partir do snapshot PROJETOS (remoto ou offline). */
export function resolveProjectCutlistFromRecord(
  record: SavedProjectRecord
): ProjectCutlistContext | null {
  const revived = reviveState(record.snapshot?.projectState);
  if (!revived) return null;

  const state = applyResultados(revived);
  const projectId = record.id?.trim() || "";
  if (!projectId) return null;

  const projectName = record.name?.trim() || state.projectName?.trim() || "Projeto";

  const fromState = Array.isArray(state.cutList) ? (state.cutList as CutListItem[]) : [];
  const exported =
    fromState.length > 0
      ? fromState
      : buildCutlistItemsForIndustrialExport({
          boxes: state.boxes ?? [],
          rules: state.rules,
          materialId: state.materialId,
          projectName,
          remates: state.remates ?? [],
          rodapes: state.rodapes ?? [],
          extractedPartsByBoxId: state.extractedPartsByBoxId,
        });

  const cutlist = exported.map(toCutlistInput);
  const pieces = mapCutlistToIndustrialPieces(cutlist, { projectId });
  const boxNameById = buildBoxNomeByIdFromBoxes(state.boxes ?? []);

  return {
    projectId,
    projectName,
    cutlist,
    pieces,
    cutListItems: exported,
    boxNameById,
  };
}
