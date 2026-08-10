/**
 * Rota dedicada /layout_de_corte_alfa — simulação CNC visual.
 */
import { ProjectProvider } from "../../context/ProjectProvider";
import LayoutCorteAlfaPage from "../../layout-de-corte-alfa/LayoutCorteAlfaPage";

export default function LayoutCorteAlfaRoutePage() {
  return (
    <ProjectProvider>
      <LayoutCorteAlfaPage />
    </ProjectProvider>
  );
}
