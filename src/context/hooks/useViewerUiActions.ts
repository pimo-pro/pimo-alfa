import { useMemo } from "react";
import type { ProjectActions, ViewerToolMode } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type ViewerUiActions = Pick<
  ProjectActions,
  "setActiveTool" | "setViewerSettings" | "toggleHighlight" | "toggleRuler" | "setLayoutWarnings"
>;

export function useViewerUiActions(ctx: ProjectActionsExecutionContext): ViewerUiActions {
  const { updateProject, viewerSync } = ctx;

  return useMemo(() => {
    const a = {} as ViewerUiActions;

    a.setActiveTool = (mode: ViewerToolMode) => {
      updateProject((prev) => ({ ...prev, activeViewerTool: mode }), false);
      viewerSync.setActiveTool(mode);
    };

    a.setViewerSettings = (partial) => {
      updateProject(
        (prev) => ({
          ...prev,
          viewerSettings: {
            ...prev.viewerSettings,
            ...partial,
          },
        }),
        false
      );
    };

    a.toggleHighlight = () => {
      updateProject(
        (prev) => ({
          ...prev,
          viewerSettings: {
            ...prev.viewerSettings,
            highlightEnabled: !prev.viewerSettings.highlightEnabled,
          },
        }),
        false
      );
    };

    a.toggleRuler = () => {
      updateProject(
        (prev) => ({
          ...prev,
          viewerSettings: {
            ...prev.viewerSettings,
            rulerEnabled: !prev.viewerSettings.rulerEnabled,
          },
        }),
        false
      );
    };

    a.setLayoutWarnings = (warnings) => {
      updateProject((prev) => ({ ...prev, layoutWarnings: warnings }));
    };

    return a;
  }, [updateProject, viewerSync]);
}
