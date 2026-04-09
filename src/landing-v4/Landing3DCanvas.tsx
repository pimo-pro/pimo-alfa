/**
 * Canvas 3D da landing page v4.
 * Responsável por renderizar a cena Three.js, iluminação, fundo gradiente,
 * material do móvel, animação de câmara e pós-processamento.
 */

import React, { useRef } from "react";
import styles from "./LandingV4.module.css";
import { useLanding3D } from "./useLanding3D";

export const Landing3DCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useLanding3D(canvasRef);

  return (
    <div
      ref={canvasRef}
      className={styles.canvas}
      style={{ width: "100%", height: "100vh" }}
    >
      {/* Canvas Three.js será renderizado aqui */}
    </div>
  );
};
