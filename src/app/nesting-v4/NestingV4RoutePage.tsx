/**
 * Rota dedicada /nesting_v4 — estação de layout manual com shell industrial PIMO.
 */

import { ProjectProvider } from "../../context/ProjectProvider";
import NestingV4Page from "../../nesting-v4/NestingV4Page";

export default function NestingV4RoutePage() {
  return (
    <ProjectProvider>
      <NestingV4Page layout="station" />
    </ProjectProvider>
  );
}
