import { useEffect, useMemo } from "react";
import type { ProjectState } from "../../context/projectTypes";
import { buildShowroomWorkspaceSceneGroup, disposeShowroomObject3D } from "./showroomBuildWorkspaceScene";

type Props = {
  projectState: ProjectState;
};

/**
 * Pré-visualização 3D alinhada ao motor paramétrico do workspace (buildBoxLegacy), sem ViewerCore.
 */
export function ShowroomParametricBoxes({ projectState }: Props) {
  const sceneGroup = useMemo(() => buildShowroomWorkspaceSceneGroup(projectState), [projectState]);

  useEffect(() => {
    return () => {
      disposeShowroomObject3D(sceneGroup);
    };
  }, [sceneGroup]);

  return <primitive object={sceneGroup} />;
}
