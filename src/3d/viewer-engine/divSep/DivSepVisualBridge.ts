import type { DivSepBoxLike, DivisorItem, SeparadorItem } from "../../../core/divSep/types";
import type { DivSepDragKind } from "../../../core/divSep/dragCoords";

export type DivSepDragContext = {
  box: DivSepBoxLike;
  item: DivisorItem | SeparadorItem;
};

export type DivSepVisualBridge = {
  getDivSepDragContext: (
    boxId: string,
    kind: DivSepDragKind,
    itemId: string
  ) => DivSepDragContext | null;
};
