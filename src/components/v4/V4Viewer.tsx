import { useMemo } from "react";
import type { CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { CatalogItem } from "../../catalog/catalogTypes";
import { buildBoxLegacy, type BoxOptions } from "../../3d/objects/BoxBuilder";

export interface SceneItem {
  id: string;
  catalogItem: CatalogItem;
  position: [number, number, number];
}

export interface V4ViewerProps {
  style?: CSSProperties;
  sceneItems: SceneItem[];
  selectedId: string | null;
}

export default function V4Viewer({ style, sceneItems, selectedId }: V4ViewerProps) {
  const sceneGroups = useMemo(() => {
    return sceneItems
      .map((item) => {
        const options: BoxOptions = {
          width: item.catalogItem.dimensoesDefault.largura_mm / 1000,
          height: item.catalogItem.dimensoesDefault.altura_mm / 1000,
          depth: item.catalogItem.dimensoesDefault.profundidade_mm / 1000,
        };

        const group = buildBoxLegacy(options);
        if (!group) return null;

        const box = new THREE.Box3().setFromObject(group);
        const minY = box.min.y;

        const edgeColor = item.id === selectedId ? 0x000000 : 0x999999;
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 1 })
            );
            mesh.add(line);
          }
        });

        group.position.set(item.position[0], item.position[1] - minY, item.position[2]);

        return { id: item.id, group };
      })
      .filter((entry): entry is { id: string; group: THREE.Group } => Boolean(entry));
  }, [sceneItems, selectedId]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 280,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border, #ccc)",
        background: "#d8dce3",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        position: "relative",
        ...style,
      }}
    >
      <Canvas gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#d8dce3"]} />
        <PerspectiveCamera makeDefault position={[1.5, 1.5, 2.5]} fov={45} near={0.1} far={500} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[12, 18, 8]} intensity={1.05} />
        <OrbitControls enableDamping />

        {sceneGroups.map((entry) => (
          <primitive key={entry.id} object={entry.group} />
        ))}

        <gridHelper args={[20, 20, "#b0b4bc", "#c8ccd4"]} position={[0, 0, 0]} />
      </Canvas>

    </div>
  );
}
