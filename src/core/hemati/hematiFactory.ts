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
import type { CreateHematiInput, HematiKind, ProjectHemati } from "./hematiTypes";

function normalizeBoxCode(box: WorkspaceBox): string {
  return (box.nome || box.id).trim().replace(/\s+/g, "_").toUpperCase();
}

function baseDims(
  box: WorkspaceBox,
  kind: HematiKind,
  thicknessMm: number,
  cimaHeightMm?: number
) {
  const largura = Math.max(1, box.dimensoes?.largura ?? 1);
  const altura = Math.max(1, box.dimensoes?.altura ?? 1);
  switch (kind) {
    case "DIR":
    case "ESQ":
      return { widthMm: thicknessMm, heightMm: altura, depthMm: HEMATI_AVISTA_DEPTH_MM };
    case "CIMA":
      return {
        widthMm: largura,
        heightMm: Math.max(10, cimaHeightMm ?? thicknessMm),
        depthMm: HEMATI_AVISTA_DEPTH_MM,
      };
    case "BAIXO":
      return { widthMm: largura, heightMm: thicknessMm, depthMm: HEMATI_AVISTA_DEPTH_MM };
    case "FULL":
      return { widthMm: largura, heightMm: thicknessMm, depthMm: HEMATI_AVISTA_DEPTH_MM };
    default:
      return { widthMm: thicknessMm, heightMm: altura, depthMm: HEMATI_AVISTA_DEPTH_MM };
  }
}

export function createHematisForBox(params: {
  box: WorkspaceBox;
  allBoxes: WorkspaceBox[];
  room: ProjectRoomConfig | null;
  roomBoundsM: KitchenFinishRoomBoundsM | null;
  input: CreateHematiInput;
  materialId: string;
  thicknessMm: number;
  existingCount: number;
}): ProjectHemati[] {
  const { box, allBoxes, room, roomBoundsM, input, materialId, thicknessMm, existingCount } = params;
  const code = normalizeBoxCode(box);
  const roomCtx = buildKitchenFinishRoomContext(room, roomBoundsM);
  const groupBase = `${box.id}-hemati-${input.kind}-group-${existingCount + 1}`;

  const makePiece = (
    part: 1 | 2 | 3 | undefined,
    dims: { widthMm: number; heightMm: number; depthMm: number },
    suffix: string,
    autoLengthMm?: number
  ): ProjectHemati => ({
    id: `${box.id}-hemati-${input.kind}${part ?? ""}-${existingCount + (part ?? 1)}`,
    parentBoxId: box.id,
    kind: input.kind,
    materialId,
    thicknessMm,
    dimensions: dims,
    name: `${code}_HEM_${suffix}`,
    parentGroupId: part != null ? groupBase : undefined,
    partIndex: part,
    parentWallId: input.parentWallId,
    placementFree: false,
    visible: true,
    autoLengthMm,
  });

  if (input.kind === "L") {
    const largura = Math.max(1, box.dimensoes?.largura ?? 1);
    const altura = Math.max(1, box.dimensoes?.altura ?? 1);
    return [
      makePiece(1, { widthMm: thicknessMm, heightMm: altura, depthMm: HEMATI_AVISTA_DEPTH_MM }, "L1"),
      makePiece(2, { widthMm: largura, heightMm: thicknessMm, depthMm: HEMATI_AVISTA_DEPTH_MM }, "L2"),
    ];
  }

  if (input.kind === "U") {
    const largura = Math.max(1, box.dimensoes?.largura ?? 1);
    const altura = Math.max(1, box.dimensoes?.altura ?? 1);
    const spanX = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "x",
      positiveDirection: true,
      maxMm: RODAPE_MAX_LENGTH_MM,
    });
    return [
      makePiece(1, { widthMm: thicknessMm, heightMm: altura, depthMm: HEMATI_AVISTA_DEPTH_MM }, "U1"),
      makePiece(
        2,
        applyAutoWidth({ widthMm: largura, heightMm: thicknessMm, depthMm: HEMATI_AVISTA_DEPTH_MM }, spanX, "width"),
        "U2",
        spanX
      ),
      makePiece(3, { widthMm: thicknessMm, heightMm: altura, depthMm: HEMATI_AVISTA_DEPTH_MM }, "U3"),
    ];
  }

  let dimensions = baseDims(box, input.kind, thicknessMm, input.cimaHeightMm);
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
  } else if (input.kind === "DIR") {
    const span = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "z",
      positiveDirection: true,
    });
    dimensions = applyAutoWidth(dimensions, span, "depth");
    autoLengthMm = span;
  } else if (input.kind === "ESQ") {
    const span = computeAutoExtendSpanMm({
      parentBox: box,
      allBoxes,
      room: roomCtx,
      axis: "z",
      positiveDirection: false,
    });
    dimensions = applyAutoWidth(dimensions, span, "depth");
    autoLengthMm = span;
  } else if (input.kind === "CIMA" || input.kind === "BAIXO") {
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

  return [makePiece(undefined, dimensions, input.kind, autoLengthMm)];
}
