import type { ProjectHemati } from "./hematiTypes";
import type { StructuralBoundsM } from "../remate/rematePlacement";
import { getStructuralBoundsM } from "../remate/rematePlacement";

export type HematiPlacementLocal = {
  position: [number, number, number];
  rotation: [number, number, number];
};

export { getStructuralBoundsM };

export function computeHematiPlacementLocal(
  hemati: ProjectHemati,
  bounds: StructuralBoundsM
): HematiPlacementLocal {
  const w = hemati.dimensions.widthMm / 1000;
  const h = hemati.dimensions.heightMm / 1000;
  const d = hemati.dimensions.depthMm / 1000;
  const cx = bounds.centerX;
  const cy = bounds.centerY;
  const cz = bounds.centerZ;

  if (hemati.kind === "L" && hemati.partIndex === 1) {
    return { position: [bounds.maxX + w / 2, cy, bounds.maxZ - d / 2], rotation: [0, 0, 0] };
  }
  if (hemati.kind === "L" && hemati.partIndex === 2) {
    return { position: [bounds.maxX - w / 2, bounds.minY + h / 2, bounds.maxZ + d / 2], rotation: [0, 0, 0] };
  }

  if (hemati.kind === "U" && hemati.partIndex === 1) {
    return { position: [bounds.maxX + w / 2, cy, bounds.maxZ - d / 2], rotation: [0, 0, 0] };
  }
  if (hemati.kind === "U" && hemati.partIndex === 2) {
    return { position: [cx, bounds.maxY + h / 2, bounds.maxZ + d / 2], rotation: [0, 0, 0] };
  }
  if (hemati.kind === "U" && hemati.partIndex === 3) {
    return { position: [bounds.minX - w / 2, cy, bounds.maxZ - d / 2], rotation: [0, 0, 0] };
  }

  if (hemati.kind === "DIR") {
    return { position: [bounds.maxX + w / 2, cy, cz], rotation: [0, 0, 0] };
  }
  if (hemati.kind === "ESQ") {
    return { position: [bounds.minX - w / 2, cy, cz], rotation: [0, 0, 0] };
  }
  if (hemati.kind === "CIMA") {
    return { position: [cx, bounds.maxY + h / 2, cz], rotation: [0, 0, 0] };
  }
  if (hemati.kind === "BAIXO") {
    return { position: [cx, bounds.minY - h / 2, cz], rotation: [0, 0, 0] };
  }

  if (hemati.kind === "FULL") {
    return { position: [cx, bounds.maxY + h / 2, bounds.maxZ + d / 2], rotation: [0, 0, 0] };
  }

  return { position: [cx, cy, bounds.maxZ + d / 2], rotation: [0, 0, 0] };
}
