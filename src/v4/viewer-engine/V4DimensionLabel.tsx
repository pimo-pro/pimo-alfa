import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { SceneItem } from "../../components/v4/V4Viewer";

interface V4DimensionLabelProps {
  item: SceneItem;
}

/**
 * Shows W × H × D labels around a selected box.
 * Uses R3F Html for crisp text at any zoom level.
 * Dimensions read from catalogItem (mm) and displayed in cm.
 */
export function V4DimensionLabel({ item }: V4DimensionLabelProps) {
  const { largura_mm: w, altura_mm: h, profundidade_mm: d } = item.catalogItem.dimensoesDefault;

  const wM = w / 1000;
  const hM = h / 1000;
  const dM = d / 1000;

  // Positions: center of each face edge
  const [px, py, pz] = item.position;

  const topCenter    = new THREE.Vector3(px + wM / 2, py + hM + 0.06, pz + dM / 2);
  const frontBottom  = new THREE.Vector3(px + wM / 2, py + 0.04,     pz + dM + 0.04);
  const rightMiddle  = new THREE.Vector3(px + wM + 0.04, py + hM / 2, pz + dM / 2);

  return (
    <>
      {/* Width label — top */}
      <Html position={topCenter.toArray()} center zIndexRange={[10, 20]}>
        <DimTag value={w} axis="L" color="#3b82f6" />
      </Html>

      {/* Depth label — front */}
      <Html position={frontBottom.toArray()} center zIndexRange={[10, 20]}>
        <DimTag value={d} axis="P" color="#a78bfa" />
      </Html>

      {/* Height label — right */}
      <Html position={rightMiddle.toArray()} center zIndexRange={[10, 20]}>
        <DimTag value={h} axis="A" color="#34d399" />
      </Html>
    </>
  );
}

function DimTag({ value, axis, color }: { value: number; axis: string; color: string }) {
  const cm = (value / 10).toFixed(0);
  return (
    <div style={{
      background: "rgba(13,17,23,0.88)",
      border: `1px solid ${color}44`,
      borderRadius: 5,
      padding: "2px 7px",
      fontSize: 11,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontWeight: 600,
      color,
      whiteSpace: "nowrap",
      userSelect: "none",
      pointerEvents: "none",
      letterSpacing: "0.03em",
      lineHeight: 1.5,
    }}>
      {axis} {cm} cm
    </div>
  );
}
