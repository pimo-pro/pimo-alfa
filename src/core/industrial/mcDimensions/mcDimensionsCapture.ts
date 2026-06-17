import type { PrintReadyDimensions } from "../../../3d/viewer-engine/overlays/boxDimensionsLayout";

export type McDimensionsViewerSource = {
  getPrintReadyDimensions: () => PrintReadyDimensions;
  setDimensionsOverlayVisible: (visible: boolean) => void;
  getDimensionsOverlayVisible: () => boolean;
  renderScene?: (options: { quality?: string }) => Promise<unknown>;
};

function waitFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/**
 * Garante overlay MC ativo, força atualização do layout e recolhe dados print-ready.
 */
export async function captureMcDimensionsFromViewer(
  viewer: McDimensionsViewerSource
): Promise<PrintReadyDimensions> {
  const wasVisible = viewer.getDimensionsOverlayVisible();
  if (!wasVisible) {
    viewer.setDimensionsOverlayVisible(true);
  }

  if (viewer.renderScene) {
    await viewer.renderScene({ quality: "preview" });
  } else {
    await waitFrames(2);
  }

  const data = viewer.getPrintReadyDimensions();

  if (!wasVisible) {
    viewer.setDimensionsOverlayVisible(false);
  }

  return data;
}
