/** Prefixos estáveis para selectedObjects (estado global). */
export type SelectionKind = "box" | "door" | "drawer" | "remate" | "rodape" | "piece";

export function encodeSelectionId(kind: SelectionKind, id: string, secondaryId?: string): string {
  if (secondaryId) return `${kind}:${id}:${secondaryId}`;
  return `${kind}:${id}`;
}

export function decodeSelectionId(encoded: string): { kind: SelectionKind; id: string; secondaryId?: string } | null {
  const parts = encoded.split(":");
  if (parts.length < 2) return null;
  const kind = parts[0] as SelectionKind;
  if (
    kind !== "box" &&
    kind !== "door" &&
    kind !== "drawer" &&
    kind !== "remate" &&
    kind !== "rodape" &&
    kind !== "piece"
  ) {
    return null;
  }
  if (parts.length >= 3) {
    return { kind, id: parts[1]!, secondaryId: parts.slice(2).join(":") };
  }
  return { kind, id: parts.slice(1).join(":") };
}

export function boxSelectionId(boxId: string): string {
  return encodeSelectionId("box", boxId);
}

export function doorSelectionId(doorLayerId: string): string {
  return encodeSelectionId("door", doorLayerId);
}

export function drawerSelectionId(drawerLayerId: string): string {
  return encodeSelectionId("drawer", drawerLayerId);
}

export function remateSelectionId(remateId: string): string {
  return encodeSelectionId("remate", remateId);
}

export function rodapeSelectionId(rodapeId: string): string {
  return encodeSelectionId("rodape", rodapeId);
}

export function pieceSelectionId(boxId: string, panelId: string): string {
  return encodeSelectionId("piece", boxId, panelId);
}
