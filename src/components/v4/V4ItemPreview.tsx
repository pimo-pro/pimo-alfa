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
      width:  item.dimensoesDefault.largura_mm / 1000,
      height: item.dimensoesDefault.altura_mm  / 1000,
      depth:  item.dimensoesDefault.profundidade_mm / 1000,
    };
    const group = buildBoxLegacy(options);
    if (!group) return null;

    const box = new THREE.Box3().setFromObject(group);
    group.position.y -= box.min.y;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x30363d })));
      }
    });
    return group;
  }, [item]);

  const { largura_mm: w, altura_mm: h, profundidade_mm: d } = item.dimensoesDefault;

  return (
    <div className="v4-item-preview">
      <div className="v4-item-preview__header">
        <p className="v4-item-preview__name">{item.nome}</p>
        <button type="button" className="v4-item-preview__close" onClick={onClose}>×</button>
      </div>

      <div className="v4-item-preview__dims">
        <div className="v4-item-preview__dim-row">
          <span className="v4-item-preview__dim-label">Largura</span>
          <span className="v4-item-preview__dim-val">{(w / 10).toFixed(0)} cm</span>
        </div>
        <div className="v4-item-preview__dim-row">
          <span className="v4-item-preview__dim-label">Altura</span>
          <span className="v4-item-preview__dim-val">{(h / 10).toFixed(0)} cm</span>
        </div>
        <div className="v4-item-preview__dim-row">
          <span className="v4-item-preview__dim-label">Profundidade</span>
          <span className="v4-item-preview__dim-val">{(d / 10).toFixed(0)} cm</span>
        </div>
      </div>

      <div className="v4-item-preview__canvas">
        <Canvas gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={["#1c2128"]} />
          <PerspectiveCamera makeDefault position={[1.5, 1.5, 2.5]} fov={45} near={0.1} far={500} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 16, 8]} intensity={1.1} />
          <OrbitControls enableDamping />
          {boxGroup && <primitive object={boxGroup} />}
          <gridHelper args={[10, 10, "#30363d", "#21262d"]} position={[0, 0, 0]} />
        </Canvas>
      </div>

      <button
        type="button"
        className="v4-item-preview__add-btn"
        onClick={() => { onAdd(item); onClose(); }}
      >
        + Adicionar ao projeto
      </button>
    </div>
  );
}
