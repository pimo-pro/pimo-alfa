import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { buildBoxLegacy, type BoxOptions } from "../../3d/objects/BoxBuilder";
import type { SceneItem } from "../../components/v4/V4Viewer";

interface V4BoxObjectProps {
  item: SceneItem;
  selected: boolean;
}

const EDGE_COLOR_NORMAL   = new THREE.Color("#1e2535");
const EDGE_COLOR_SELECTED = new THREE.Color("#3b82f6");

/**
 * Renders a single cabinet box using the full industrial builder.
 * Casts and receives shadows. Shows selection highlight via edge color.
 *
 * Read-only dependency on: src/3d/objects/BoxBuilder (buildBoxLegacy)
 */
export function V4BoxObject({ item, selected }: V4BoxObjectProps) {
  const groupRef = useRef<THREE.Group>(null);

  const boxGroup = useMemo(() => {
    const options: BoxOptions = {
      width:  item.catalogItem.dimensoesDefault.largura_mm  / 1000,
      height: item.catalogItem.dimensoesDefault.altura_mm   / 1000,
      depth:  item.catalogItem.dimensoesDefault.profundidade_mm / 1000,
      castShadow:    true,
      receiveShadow: true,
    };
    const group = buildBoxLegacy(options);
    if (!group) return null;

    // Lift to floor level
    const bbox = new THREE.Box3().setFromObject(group);
    group.position.y -= bbox.min.y;

    // Enable shadow casting on all meshes
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }, [item.catalogItem]);

  // Apply/update edge highlight when selection changes
  useEffect(() => {
    if (!boxGroup) return;
    const edgeColor = selected ? EDGE_COLOR_SELECTED : EDGE_COLOR_NORMAL;

    boxGroup.traverse((child) => {
      if ((child as THREE.LineSegments).isLineSegments) {
        const line = child as THREE.LineSegments;
        if (line.material instanceof THREE.LineBasicMaterial) {
          line.material.color.copy(edgeColor);
          line.material.needsUpdate = true;
        }
      }
    });
  }, [boxGroup, selected]);

  // Add fresh edge geometry if not already present
  useEffect(() => {
    if (!boxGroup) return;

    boxGroup.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      // Skip if edges already added
      const alreadyHasEdges = mesh.children.some(
        (c) => (c as THREE.LineSegments).isLineSegments
      );
      if (alreadyHasEdges) return;

      const edges = new THREE.EdgesGeometry(mesh.geometry, 18); // 18° threshold = clean edges
      const line  = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: selected ? EDGE_COLOR_SELECTED : EDGE_COLOR_NORMAL,
          linewidth: 1,
          transparent: true,
          opacity: 0.65,
        })
      );
      mesh.add(line);
    });
  }, [boxGroup, selected]);

  if (!boxGroup) return null;

  return (
    <primitive
      ref={groupRef}
      object={boxGroup}
      position={item.position}
    />
  );
}
