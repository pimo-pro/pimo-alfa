/**
 * Rota dedicada /nesting_v3 — estação de layout manual com shell industrial PIMO.
 */

import { ProjectProvider } from "../../context/ProjectProvider";
import NestingV3Page from "../../nesting-v3/NestingV3Page";

export default function NestingV3RoutePage() {
  return (
    <ProjectProvider>
      <NestingV3Page layout="station" />
    </ProjectProvider>
  );
}
