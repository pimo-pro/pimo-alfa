/**
 * Página de desenvolvimento para testes do viewer (usePimoViewer).
 * Movida para src/__dev__/ para separar código de dev do fluxo principal.
 */
import { useEffect, useRef } from "react";
import { usePimoViewer } from "../hooks/usePimoViewer";

export default function DevPimoTest() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    addBox,
    removeBox,
    updateBox,
    setBoxIndex,
    setBoxGap,
    addModelToBox,
    removeModelFromBox,
    listModels,
  } = usePimoViewer();

  useEffect(() => {
    addBox("modulo-1", { width: 60, height: 80, depth: 50 });
    addBox("modulo-2", { width: 40, height: 60, depth: 50 });
    updateBox("modulo-1", { width: 70 });
    setBoxIndex("modulo-2", 0);
    addModelToBox("modulo-1", "/models/prateleira.glb");
    setBoxGap(5);
    console.log("Models modulo-1:", listModels("modulo-1"));
    const models = listModels("modulo-1");
    if (models?.length) {
      removeModelFromBox("modulo-1", models[0].id);
    }
    removeBox("modulo-2");
  }, [
    addBox,
    removeBox,
    updateBox,
    setBoxIndex,
    setBoxGap,
    addModelToBox,
    removeModelFromBox,
    listModels,
  ]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
