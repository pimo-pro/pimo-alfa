import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

import type { CatalogItem } from "../../catalog/catalogTypes";
import { buildBoxLegacy, type BoxOptions } from "../../3d/objects/BoxBuilder";

interface V4ItemPreviewProps {
  item: CatalogItem;
  onAdd: (item: CatalogItem) => void;
  onClose: () => void;
}

export default function V4ItemPreview({ item, onAdd, onClose }: V4ItemPreviewProps) {
  const boxGroup = useMemo(() => {
    const options: BoxOptions = {
      width: item.dimensoesDefault.largura_mm / 1000,
      height: item.dimensoesDefault.altura_mm / 1000,
      depth: item.dimensoesDefault.profundidade_mm / 1000,
    };

    const group = buildBoxLegacy(options);
    if (!group) return null;

    const box = new THREE.Box3().setFromObject(group);
    const minY = box.min.y;
    group.position.y -= minY;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 1 })
        );
        mesh.add(line);
      }
    });

    return group;
  }, [item]);

  const larguraCm = (item.dimensoesDefault.largura_mm / 10).toFixed(1);
  const alturaCm = (item.dimensoesDefault.altura_mm / 10).toFixed(1);
  const profundidadeCm = (item.dimensoesDefault.profundidade_mm / 10).toFixed(1);

  return (
    <aside
      style={{
        height: "100%",
        border: "none",
        borderRadius: 0,
        background: "transparent",
        color: "var(--color-text-primary, #f0f0f0)",
        padding: 12,
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar preview"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          borderRadius: 6,
          border: "1px solid var(--color-border, #333)",
          background: "transparent",
          color: "var(--color-text-primary, #f0f0f0)",
          cursor: "pointer",
        }}
      >
        ×
      </button>

      <p style={{ margin: "0 28px 8px 0", fontSize: 16, fontWeight: 700 }}>{item.nome}</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary, #aaa)" }}>
        Largura: {larguraCm} cm
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary, #aaa)" }}>
        Altura: {alturaCm} cm
      </p>
      <p style={{ margin: "2px 0 10px", fontSize: 12, color: "var(--color-text-secondary, #aaa)" }}>
        Profundidade: {profundidadeCm} cm
      </p>

      <div
        style={{
          width: 220,
          height: 180,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid var(--color-border, #333)",
          margin: "0 auto 12px",
          background: "#d8dce3",
        }}
      >
        <Canvas gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={["#d8dce3"]} />
          <PerspectiveCamera makeDefault position={[1.5, 1.5, 2.5]} fov={45} near={0.1} far={500} />
          <ambientLight intensity={0.72} />
          <directionalLight position={[12, 18, 8]} intensity={1.05} />
          <OrbitControls enableDamping />
          {boxGroup ? <primitive object={boxGroup} /> : null}
          <gridHelper args={[20, 20, "#b0b4bc", "#c8ccd4"]} position={[0, 0, 0]} />
        </Canvas>
      </div>

      <button
        type="button"
        onClick={() => {
          onAdd(item);
          onClose();
        }}
        style={{
          width: "100%",
          borderRadius: 8,
          border: "1px solid var(--color-accent, #f59e0b)",
          background: "var(--color-accent, #f59e0b)",
          color: "#111",
          fontWeight: 700,
          padding: "10px 12px",
          cursor: "pointer",
        }}
      >
        Adicionar ao projeto
      </button>
    </aside>
  );
}
