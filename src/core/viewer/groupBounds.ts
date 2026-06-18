import type { ProjectState } from "../../context/projectTypes";
import { decodeSelectionId } from "./selectionIds";
import type { GroupBoundingBox } from "./groupTypes";

const MM = 0.001;

function expandBounds(
  bounds: GroupBoundingBox | null,
  min: { x: number; y: number; z: number },
  max: { x: number; y: number; z: number }
): GroupBoundingBox {
  if (!bounds) {
    return {
      min: { ...min },
      max: { ...max },
      center: {
        x: (min.x + max.x) / 2,
        y: (min.y + max.y) / 2,
        z: (min.z + max.z) / 2,
      },
      size: { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z },
    };
  }
  const nextMin = {
    x: Math.min(bounds.min.x, min.x),
    y: Math.min(bounds.min.y, min.y),
    z: Math.min(bounds.min.z, min.z),
  };
  const nextMax = {
    x: Math.max(bounds.max.x, max.x),
    y: Math.max(bounds.max.y, max.y),
    z: Math.max(bounds.max.z, max.z),
  };
  return {
    min: nextMin,
    max: nextMax,
    center: {
      x: (nextMin.x + nextMax.x) / 2,
      y: (nextMin.y + nextMax.y) / 2,
      z: (nextMin.z + nextMax.z) / 2,
    },
    size: {
      x: nextMax.x - nextMin.x,
      y: nextMax.y - nextMin.y,
      z: nextMax.z - nextMin.z,
    },
  };
}

/** Bounding box aproximado em metros a partir do estado do projeto. */
export function computeMemberBoundsFromProject(
  project: ProjectState,
  encodedId: string
): { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null {
  const decoded = decodeSelectionId(encodedId);
  if (!decoded) return null;

  if (decoded.kind === "box") {
    const box = project.workspaceBoxes.find((b) => b.id === decoded.id);
    if (!box?.dimensoes) return null;
    const w = box.dimensoes.largura * MM;
    const h = box.dimensoes.altura * MM;
    const d = box.dimensoes.profundidade * MM;
    const cx = (box.posicaoX_mm ?? 0) * MM;
    const cy = (box.posicaoY_mm ?? 0) * MM;
    const cz = (box.posicaoZ_mm ?? 0) * MM;
    return {
      min: { x: cx - w / 2, y: cy - h / 2, z: cz - d / 2 },
      max: { x: cx + w / 2, y: cy + h / 2, z: cz + d / 2 },
    };
  }

  if (decoded.kind === "remate") {
    const remate = (project.remates ?? []).find((r) => r.id === decoded.id);
    if (!remate) return null;
    const w = remate.width * MM;
    const h = remate.height * MM;
    const d = remate.depth * MM;
    const pos = remate.position;
    const cx = pos.xMm * MM;
    const cy = pos.yMm * MM;
    const cz = pos.zMm * MM;
    return {
      min: { x: cx - w / 2, y: cy - h / 2, z: cz - d / 2 },
      max: { x: cx + w / 2, y: cy + h / 2, z: cz + d / 2 },
    };
  }

  if (decoded.kind === "rodape") {
    const rodape = (project.rodapes ?? []).find((r) => r.id === decoded.id);
    if (!rodape) return null;
    const dims = rodape.dimensions;
    const w = dims.widthMm * MM;
    const h = dims.heightMm * MM;
    const d = dims.depthMm * MM;
    const t = rodape.transform ?? {};
    const cx = (t.xMm ?? 0) * MM;
    const cy = (t.yMm ?? 0) * MM;
    const cz = (t.zMm ?? 0) * MM;
    return {
      min: { x: cx - w / 2, y: cy - h / 2, z: cz - d / 2 },
      max: { x: cx + w / 2, y: cy + h / 2, z: cz + d / 2 },
    };
  }

  return null;
}

export function getGroupBoundingBox(
  project: ProjectState,
  memberIds: string[]
): GroupBoundingBox | null {
  let bounds: GroupBoundingBox | null = null;
  for (const id of memberIds) {
    const memberBounds = computeMemberBoundsFromProject(project, id);
    if (!memberBounds) continue;
    bounds = expandBounds(bounds, memberBounds.min, memberBounds.max);
  }
  return bounds;
}
