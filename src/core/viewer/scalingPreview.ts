import type { ProjectState, ScalingMode } from "../../context/projectTypes";
import { resolveScalableTargets } from "./selectionTransformService";
import { maxLengthAcross, scaleDimensionValues } from "./scalingModes";
import { decodeSelectionId } from "./selectionIds";
import { resolveRematePieceNomeForRemate } from "../remate/labels";
import { resolveRodapePieceNomeForRodape } from "../rodape/labels";
import { resolveDoorLabel } from "../doors/doorLabels";

export type ScalingPreviewRow = {
  encodedId: string;
  label: string;
  before: number[];
  after: number[];
};

export type ScalingPreviewData = {
  mode: ScalingMode;
  oldMax: number;
  newMax: number;
  delta: number;
  ratio: number;
  rows: ScalingPreviewRow[];
};

function labelForEncoded(project: ProjectState, encoded: string): string {
  const decoded = decodeSelectionId(encoded);
  if (!decoded) return encoded;
  const boxNameById: Record<string, string> = {};
  for (const box of project.workspaceBoxes) {
    if (box?.id) boxNameById[box.id] = typeof box.nome === "string" ? box.nome : box.id;
  }
  if (decoded.kind === "box") {
    const box = project.workspaceBoxes.find((b) => b.id === decoded.id);
    return box?.nome ? `Caixa: ${box.nome}` : `Caixa ${decoded.id}`;
  }
  if (decoded.kind === "door") {
    for (const box of project.workspaceBoxes) {
      const doors = box.doorsLayer ?? [];
      const doorIndex = doors.findIndex((d) => d.id === decoded.id);
      if (doorIndex >= 0) {
        return resolveDoorLabel(doors[doorIndex], doorIndex, doors);
      }
    }
    return `Porta ${decoded.id}`;
  }
  if (decoded.kind === "drawer") return `Gaveta ${decoded.id}`;
  if (decoded.kind === "remate") {
    const remate = (project.remates ?? []).find((r) => r.id === decoded.id);
    if (!remate) return `Remate ${decoded.id}`;
    return `Remate: ${resolveRematePieceNomeForRemate(remate, boxNameById)}`;
  }
  if (decoded.kind === "rodape") {
    const rodape = (project.rodapes ?? []).find((r) => r.id === decoded.id);
    if (!rodape) return `Rodapé ${decoded.id}`;
    return `Rodapé: ${resolveRodapePieceNomeForRodape(rodape, boxNameById)}`;
  }
  return encoded;
}

export function buildScalingPreviewData(
  project: ProjectState,
  selectedObjectIds: string[],
  newMaxLength: number,
  mode: ScalingMode
): ScalingPreviewData | null {
  const targets = resolveScalableTargets(project, selectedObjectIds);
  if (!targets.length || !Number.isFinite(newMaxLength) || newMaxLength <= 0) return null;

  const oldMax = maxLengthAcross(...targets.map((t) => t.dimensions));
  if (oldMax <= 0) return null;

  const rows: ScalingPreviewRow[] = [];
  for (const encoded of selectedObjectIds) {
    const target = resolveScalableTargets(project, [encoded])[0];
    if (!target) continue;
    rows.push({
      encodedId: encoded,
      label: labelForEncoded(project, encoded),
      before: [...target.dimensions],
      after: scaleDimensionValues(target.dimensions, newMaxLength, mode),
    });
  }

  return {
    mode,
    oldMax,
    newMax: newMaxLength,
    delta: newMaxLength - oldMax,
    ratio: newMaxLength / oldMax,
    rows,
  };
}

export function formatDimensionList(values: number[]): string {
  return values.map((v) => `${Math.round(v)}`).join(" × ");
}
