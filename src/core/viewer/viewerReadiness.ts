import type { PimoViewerApi } from "../../context/PimoViewerContextCore";

/** ViewerCore montado e com `viewerReady === true`. Aceita null/undefined. */
export function isViewerCoreReady(viewerCore: unknown): boolean {
  if (viewerCore == null || typeof viewerCore !== "object") return false;
  return (viewerCore as { viewerReady?: boolean }).viewerReady === true;
}

/** API React do viewer pronta para chamadas industriais / sync. */
export function isViewerApiReady(
  viewerApi: PimoViewerApi | null | undefined
): boolean {
  if (viewerApi == null) return false;
  return viewerApi.viewerReady === true;
}
