import type { ProjectRodape } from "./rodapeTypes";
import type { StructuralBoundsM } from "../remate/rematePlacement";
import { getStructuralBoundsM } from "../remate/rematePlacement";

export type RodapePlacementLocal = {
  position: [number, number, number];
  rotation: [number, number, number];
};

export { getStructuralBoundsM };

export function computeRodapePlacementLocal(
  rodape: ProjectRodape,
  bounds: StructuralBoundsM
): RodapePlacementLocal {
  const w = rodape.dimensions.widthMm / 1000;
  const h = (rodape.dimensions.heightMm ?? rodape.heightMm) / 1000;
  const d = rodape.dimensions.depthMm / 1000;
  const cx = bounds.centerX;

  if (rodape.kind === "L" && rodape.partIndex === 1) {
    return {
      position: [bounds.maxX + w / 2, bounds.minY - h / 2 - 0.002, bounds.maxZ - d / 2],
      rotation: [0, 0, 0],
    };
  }
  if (rodape.kind === "L" && rodape.partIndex === 2) {
    return {
      position: [bounds.maxX - w / 2, bounds.minY - h / 2 - 0.002, bounds.maxZ + d / 2],
      rotation: [0, 0, 0],
    };
  }

  if (rodape.kind === "U" && rodape.partIndex === 1) {
    return {
      position: [bounds.maxX + w / 2, bounds.minY - h / 2 - 0.002, bounds.maxZ - d / 2],
      rotation: [0, 0, 0],
    };
  }
  if (rodape.kind === "U" && rodape.partIndex === 2) {
    return {
      position: [cx, bounds.minY - h / 2 - 0.002, bounds.maxZ + d / 2],
      rotation: [0, 0, 0],
    };
  }
  if (rodape.kind === "U" && rodape.partIndex === 3) {
    return {
      position: [bounds.minX - w / 2, bounds.minY - h / 2 - 0.002, bounds.maxZ - d / 2],
      rotation: [0, 0, 0],
    };
  }

  return {
    position: [cx, bounds.minY - h / 2 - 0.002, bounds.maxZ + d / 2],
    rotation: [0, 0, 0],
  };
}
