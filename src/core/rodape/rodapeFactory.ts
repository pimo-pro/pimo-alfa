import type { WorkspaceBox } from "../types";
import { applyAutoWidth, computeAutoExtendSpanMm } from "../kitchenFinish/autoExtend";
import {
  HEMATI_AVISTA_DEPTH_MM,
  RODAPE_MAX_LENGTH_MM,
} from "../kitchenFinish/finishTypes";
import {
  availableWallSpanMm,
  buildKitchenFinishRoomContext,
  pickNearestWall,
  type KitchenFinishRoomBoundsM,
} from "../kitchenFinish/roomContext";
import type { ProjectRoomConfig } from "../../3d/viewer-engine/room/roomEngineTypes";
import type { CreateRodapeInput, ProjectRodape } from "./rodapeTypes";

function normalizeBoxCode(box: WorkspaceBox): string {
  return (box.nome || box.id).trim().replace(/\s+/g, "_").toUpperCase();
}

export function createRodapesForBox(params: {
  box: WorkspaceBox;
  allBoxes: WorkspaceBox[];
  room: ProjectRoomConfig | null;
  roomBoundsM: KitchenFinishRoomBoundsM | null;
  input: CreateRodapeInput;
  materialId: string;
  thicknessMm: number;
  heightMm: number;
  existingCount: number;
}): ProjectRodape[] {
  const { box, allBoxes, room, roomBoundsM, input, materialId, thicknessMm, heightMm, existingCount } =
    params;
  const code = normalizeBoxCode(box);
  const largura = Math.max(1, box.dimensoes?.largura ?? 1);
  const roomCtx = buildKitchenFinishRoomContext(room, roomBoundsM);
  const groupBase = `${box.id}-rodape-${input.kind}-group-${existingCount + 1}`;

  const makePiece = (
    part: 1 | 2 | 3 | undefined,
    dims: { widthMm: number; heightMm: number; depthMm: number },
    suffix: string,
    autoLengthMm?: number
  ): ProjectRodape => ({
    id: `${box.id}-rodape-${input.kind}${part ?? ""}-${existingCount + (part ?? 1)}`,
    parentBoxId: box.id,
    kind: input.kind,
    materialId,
    thicknessMm,
    heightMm,
    dimensions: dims,
    name: `${code}_RODAPE_${suffix}`,
    parentGroupId: part != null ? groupBase : undefined,
    partIndex: part,
    parentWallId: input.parentWallId,
    placementFree: false,
    visible: true,
    autoLengthMm,
  });

  const baseSimple = (): { widthMm: number; heightMm: number; depthMm: number } => ({
    widthMm: Math.min(RODAPE_MAX_LENGTH_MM, largura),
    heightMm,
    depthMm: thicknessMm,
  });

  if (input.kind === "L") {
    const spanZ = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "z",
      positiveDirection: true,
    });
    return [
      makePiece(
        1,
        { widthMm: thicknessMm, heightMm, depthMm: Math.min(spanZ, HEMATI_AVISTA_DEPTH_MM) },
        "L1"
      ),
      makePiece(
        2,
        applyAutoWidth({ widthMm: largura, heightMm, depthMm: thicknessMm }, spanZ, "width"),
        "L2",
        spanZ
      ),
    ];
  }

  if (input.kind === "U") {
    const spanX = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "x",
      positiveDirection: true,
      maxMm: RODAPE_MAX_LENGTH_MM,
    });
    const spanZ = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "z",
      positiveDirection: true,
    });
    return [
      makePiece(1, { widthMm: thicknessMm, heightMm, depthMm: Math.min(spanZ, 800) }, "U1"),
      makePiece(
        2,
        applyAutoWidth({ widthMm: largura, heightMm, depthMm: thicknessMm }, spanX, "width"),
        "U2",
        spanX
      ),
      makePiece(3, { widthMm: thicknessMm, heightMm, depthMm: Math.min(spanZ, 800) }, "U3"),
    ];
  }

  let dimensions = baseSimple();
  let autoLengthMm: number | undefined;

  if (input.kind === "FULL") {
    const wall =
      (input.parentWallId && room?.walls.find((w) => w.id === input.parentWallId)) ||
      pickNearestWall({ x: box.posicaoX_mm ?? 0, z: box.posicaoZ_mm ?? 0 }, room);
    const span = wall
      ? availableWallSpanMm(wall, roomCtx.openings, RODAPE_MAX_LENGTH_MM)
      : Math.min(RODAPE_MAX_LENGTH_MM, roomCtx.roomWidthMm);
    dimensions = { ...dimensions, widthMm: span };
    autoLengthMm = span;
  } else {
    const span = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "x",
      positiveDirection: true,
    });
    dimensions = applyAutoWidth(dimensions, span, "width");
    autoLengthMm = span;
  }

  return [makePiece(undefined, dimensions, input.kind === "SIMPLE" ? "SIMPLE" : input.kind, autoLengthMm)];
}
