import { useContext } from "react";
import { PimoViewerContext } from "../context/PimoViewerContextCore";
import { getPimoViewerStubApi } from "../context/pimoViewerStubApi";
import { isViewerApiReady } from "../core/viewer/viewerReadiness";

export const usePimoViewerContext = () => {
  const context = useContext(PimoViewerContext);
  if (!context) {
    throw new Error("usePimoViewerContext deve ser usado dentro de PimoViewerProvider.");
  }
  const viewerApi = context.viewerApi ?? getPimoViewerStubApi();
  return {
    ...context,
    viewerApi,
    viewerReady: isViewerApiReady(viewerApi),
  };
};
