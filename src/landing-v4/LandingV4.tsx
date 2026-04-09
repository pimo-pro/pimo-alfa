/**
 * Componente principal da landing page v4.
 * Responsável pelo layout geral, integração do canvas 3D e orquestração dos subcomponentes.
 */

import React from "react";
import styles from "./LandingV4.module.css";
import { Landing3DCanvas } from "./Landing3DCanvas";

// TODO: Adicionar lógica e layout após aprovação do esqueleto.

export const LandingV4: React.FC = () => {
  return (
    <div className={styles.root}>
      {/* Canvas 3D e outros elementos da landing */}
      <Landing3DCanvas />
    </div>
  );
};
