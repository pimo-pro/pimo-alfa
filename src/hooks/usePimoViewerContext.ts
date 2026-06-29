import { useContext } from "react";
import { PimoViewerContext } from "../context/PimoViewerContextCore";
import { getPimoViewerStubApi } from "../context/pimoViewerStubApi";

export const usePimoViewerContext = () => {
  const context = useContext(PimoViewerContext);
  if (!context) {
    throw new Error("usePimoViewerContext deve ser usado dentro de PimoViewerProvider.");
  }
  return {
    ...context,
    viewerApi: context.viewerApi ?? getPimoViewerStubApi(),
  };
};
