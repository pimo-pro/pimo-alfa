import { useContext } from "react";
import { PimoViewerContext } from "../context/PimoViewerContextCore";
import type { PimoViewerContextHookValue } from "../context/PimoViewerContextCore";
import { getPimoViewerStubApi } from "../context/pimoViewerStubApi";
import { isViewerApiReady } from "../core/viewer/viewerReadiness";

/**
 * Contexto do viewer — viewerApi nunca null (stub NOOP até Workspace registar API real).
 * Preferir `viewerReady` em deps de useEffect em vez de `viewerApi.viewerReady`.
 */
export const usePimoViewerContext = (): PimoViewerContextHookValue => {
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
