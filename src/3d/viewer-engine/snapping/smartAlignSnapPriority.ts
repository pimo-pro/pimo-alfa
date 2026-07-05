import type { UnifiedSnapCandidate } from "./smartAlignSnapTypes";
import { DEFAULT_UNIFIED_CAPTURE_MM } from "./smartAlignSnapTypes";
import { mmToM } from "../../../utils/units";

import { roomSnapPriorityScore } from "./smartRoomSnapIntegration";

/** Porta sala > Janela > … > Porta módulo > Gaveta > Face > AABB > Continuidade > Rodapé */
export function smartPriorityScore(kind: string): number {
  if (kind.startsWith("align_")) return 0;
  if (kind.startsWith("adjacent_")) return 1;
  if (kind.startsWith("room_")) return roomSnapPriorityScore(kind.replace(/_side$/, ""));
  if (kind === "DOOR_FRONT") return 0;
  if (kind === "DRAWER_FRONT") return 1;
  if (kind.startsWith("BOX_")) return 2;
  if (
    kind === "vertex" ||
    kind === "edge" ||
    kind === "edgeMid" ||
    kind === "face" ||
    kind === "faceCenter" ||
    kind === "boxCenter" ||
    kind === "bboxProjection" ||
    kind === "corner" ||
    kind === "center_align"
  ) {
    return 3;
  }
  if (kind === "visual_continuity" || kind === "continue_line") return 4;
  if (kind.startsWith("rodape") || kind.startsWith("linear_")) return 5;
  if (kind === "autoFlush" || kind === "autoStack" || kind === "autoDepth") return 3;
  return 6;
}

export type RankCandidatesOptions = {
  captureRadiusM?: number;
  ignoreAutomatic?: boolean;
  onlyKinds?: string[];
};

export function rankSnapCandidates(
  candidates: UnifiedSnapCandidate[],
  options: RankCandidatesOptions = {}
): UnifiedSnapCandidate[] {
  const captureM = options.captureRadiusM ?? mmToM(DEFAULT_UNIFIED_CAPTURE_MM);

  return candidates
    .filter((c) => c.distanceM <= captureM)
    .filter((c) => !options.ignoreAutomatic || !isAutomaticKind(c.kind))
    .filter((c) => !options.onlyKinds?.length || options.onlyKinds.includes(c.kind))
    .map((c) => ({
      ...c,
      priority: smartPriorityScore(c.kind) * 100 + c.priority,
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distanceM - b.distanceM;
    });
}

export function pickBestSnapCandidate(
  candidates: UnifiedSnapCandidate[],
  options: RankCandidatesOptions = {}
): UnifiedSnapCandidate | null {
  const ranked = rankSnapCandidates(candidates, options);
  return ranked[0] ?? null;
}

function isAutomaticKind(kind: string): boolean {
  return (
    kind === "autoFlush" ||
    kind === "autoStack" ||
    kind === "autoDepth" ||
    kind === "auto_balance" ||
    kind === "vertex" ||
    kind === "grid"
  );
}

export function overlayModeForKind(kind: string): "magnetic" | "explicit" | "continuity" | "flush" {
  if (kind.startsWith("room_")) return "flush";
  if (kind === "visual_continuity" || kind === "continue_line") return "continuity";
  if (kind === "autoFlush" || kind.startsWith("flush") || kind.includes("lateral")) return "flush";
  if (kind === "DOOR_FRONT" || kind === "DRAWER_FRONT" || kind.startsWith("BOX_")) return "explicit";
  return "magnetic";
}
