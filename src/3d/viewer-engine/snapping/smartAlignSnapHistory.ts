import type { ExplicitAlignMode } from "./smartAlignSnapTypes";
import { overlayModeForKind } from "./smartAlignSnapPriority";

export type SnapHistoryEntry = {
  mode: ExplicitAlignMode | "magnetic" | "repeat";
  kind: string;
  face?: string;
  targetId?: string;
  recordedAt: number;
};

const INVERSE_MAP: Partial<Record<ExplicitAlignMode, ExplicitAlignMode>> = {
  front: "back",
  back: "front",
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
  flushFront: "flushBack",
  flushBack: "flushFront",
  flushLeft: "flushRight",
  flushRight: "flushLeft",
};

export class SmartAlignSnapHistory {
  private last: SnapHistoryEntry | null = null;

  record(params: {
    mode?: ExplicitAlignMode | "magnetic";
    kind: string;
    targetId?: string;
  }): void {
    const face = kindToFace(params.kind);
    this.last = {
      mode: params.mode ?? "magnetic",
      kind: params.kind,
      face,
      targetId: params.targetId,
      recordedAt: Date.now(),
    };
  }

  getLast(): SnapHistoryEntry | null {
    return this.last;
  }

  getRepeatMode(): ExplicitAlignMode | "magnetic" | null {
    if (!this.last) return null;
    if (this.last.mode !== "magnetic" && this.last.mode !== "repeat") return this.last.mode;
    return inferModeFromKind(this.last.kind);
  }

  getInverseMode(): ExplicitAlignMode | null {
    const base = this.getRepeatMode();
    if (!base || base === "magnetic") return null;
    return INVERSE_MAP[base] ?? null;
  }

  clear(): void {
    this.last = null;
  }
}

function kindToFace(kind: string): string | undefined {
  if (kind === "DOOR_FRONT") return "door";
  if (kind === "DRAWER_FRONT") return "drawer";
  if (kind.startsWith("BOX_")) return kind.replace("BOX_", "").toLowerCase();
  void overlayModeForKind(kind);
  return undefined;
}

function inferModeFromKind(kind: string): ExplicitAlignMode | "magnetic" {
  switch (kind) {
    case "DOOR_FRONT":
      return "alignDoor";
    case "DRAWER_FRONT":
      return "alignDrawer";
    case "BOX_FRENTE":
      return "flushFront";
    case "BOX_TRAS":
      return "flushBack";
    case "BOX_ESQ":
      return "flushLeft";
    case "BOX_DIR":
      return "flushRight";
    case "BOX_CIMA":
      return "top";
    case "BOX_FUNDO":
      return "bottom";
    case "visual_continuity":
      return "continueLine";
    default:
      return "magnetic";
  }
}
