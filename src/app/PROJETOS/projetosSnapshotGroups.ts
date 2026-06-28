import { applyResultados } from "../../context/projectState";
import { reviveState } from "../../context/projectPersistence";
import type { ProjectState } from "../../context/projectTypes";
import type { SavedProjectRecord } from "../../core/projects/types";
import {
  buildProjetosFocusCatalog,
  type ProjetosFocusCatalog,
} from "./projetosFocusSlug";

export type ProjetosElementRow = {
  id: string;
  label: string;
  subtitle?: string;
  boxId?: string;
  pieceId?: string;
  /** Slug industrial da caixa na URL (ex.: caixa_1, c2). */
  boxSlug?: string;
  /** Slug industrial da peça na URL (ex.: top, remate_cima). */
  pieceSlug?: string;
  /** Nome industrial curto — alinhado com etiqueta. */
  industrialName?: string;
  /** Agrupamento interno para sidebar. */
  group?: "box" | "remate" | "rodape" | "industrial" | "ready" | "standalone";
};

export type ProjetosElementGroups = {
  projectName: string;
  boxes: ProjetosElementRow[];
  remates: ProjetosElementRow[];
  rodapes: ProjetosElementRow[];
  industrialPieces: ProjetosElementRow[];
  readyPieces: ProjetosElementRow[];
  standalonePieces: ProjetosElementRow[];
  catalog: ProjetosFocusCatalog;
};

function reviveProjectStateFromRecord(snapshot: SavedProjectRecord | null): ProjectState | null {
  if (!snapshot) return null;
  const revived = reviveState(snapshot.snapshot?.projectState);
  if (!revived) return null;
  return applyResultados(revived);
}

export function buildProjetosElementGroups(snapshot: SavedProjectRecord | null): ProjetosElementGroups | null {
  const catalog = buildProjetosFocusCatalog(snapshot);
  if (!catalog) return null;

  const state = reviveProjectStateFromRecord(snapshot);
  if (!state) return null;

  const remateIds = new Set((state.remates ?? []).map((r) => r.id));
  const rodapeIds = new Set((state.rodapes ?? []).map((r) => r.id));
  const boxIds = new Set((state.workspaceBoxes ?? []).map((b) => b.id));

  const boxes: ProjetosElementRow[] = [];
  const remates: ProjetosElementRow[] = [];
  const rodapes: ProjetosElementRow[] = [];
  const industrialPieces: ProjetosElementRow[] = [];
  const readyPieces: ProjetosElementRow[] = [];
  const standalonePieces: ProjetosElementRow[] = [];

  for (const row of catalog.rows) {
    if (boxIds.has(row.id) && !row.pieceId) {
      boxes.push({ ...row, group: "box" });
      continue;
    }
    if (remateIds.has(row.id)) {
      if (row.boxId) remates.push({ ...row, group: "remate" });
      else standalonePieces.push({ ...row, group: "standalone" });
      continue;
    }
    if (rodapeIds.has(row.id)) {
      rodapes.push({ ...row, group: "rodape" });
      continue;
    }
    if (row.group === "ready") {
      readyPieces.push(row);
      continue;
    }
    if (row.pieceId) {
      industrialPieces.push({ ...row, group: "industrial" });
    }
  }

  return {
    projectName: catalog.projectName,
    boxes,
    remates,
    rodapes,
    industrialPieces,
    readyPieces,
    standalonePieces,
    catalog,
  };
}
