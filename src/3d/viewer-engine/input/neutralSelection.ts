import type { SelectedDivSep, ViewerState } from "../state/ViewerState";

export type NeutralSelectionKind = "remate" | "hemati" | "rodape" | "divSep";

type NeutralSelectionValue = string | SelectedDivSep | null;

export function clearCompetingSelectionsFor(
  viewerState: ViewerState,
  kind: NeutralSelectionKind,
  value: NeutralSelectionValue
): void {
  if (!value) return;

  if (kind !== "hemati") viewerState.setSelectedHemati(null);
  if (kind !== "rodape") viewerState.setSelectedRodape(null);
  if (kind !== "remate") viewerState.setSelectedRemate(null);
  if (kind !== "divSep") viewerState.setSelectedDivSep(null);

  viewerState.setSelectedBox(null);
  viewerState.setSelectedWallIndex(null);
  viewerState.setSelectedRoomElementId(null);
  viewerState.clearGroupTransformMemberIds();
}
