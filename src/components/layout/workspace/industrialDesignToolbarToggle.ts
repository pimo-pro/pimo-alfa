import type { PimoViewerApi } from "@/context/PimoViewerContextCore";

export type IndustrialDesignToolbarDeps = {
  getIndustrialDesignWorkspaceEnabled?: () => boolean;
  setIndustrialDesignWorkspaceEnabled?: (enabled: boolean) => void;
  setIndustrialDesignPanelOpen: (open: boolean) => void;
  setPanelRenderingEnabled?: (enabled: boolean) => void;
  setPanelEdgesVisible?: (enabled: boolean) => void;
};

/** Estado activo do botão — painel aberto e modo viewer ligado. */
export function isIndustrialDesignToolbarActive(
  panelOpen: boolean,
  getEnabled?: () => boolean
): boolean {
  return panelOpen && (getEnabled?.() ?? false);
}

/** Próximo estado após clique no toggle da toolbar. */
export function nextIndustrialDesignToolbarEnabled(currentActive: boolean): boolean {
  return !currentActive;
}

/** Aplica toggle do modo Design Industrial (viewer + painel lateral). */
export function applyIndustrialDesignToolbarToggle(
  deps: IndustrialDesignToolbarDeps,
  enabled: boolean,
  options?: { viewerReady?: boolean }
): void {
  if (enabled && options?.viewerReady === false) return;
  deps.setIndustrialDesignWorkspaceEnabled?.(enabled);
  deps.setIndustrialDesignPanelOpen(enabled);
  if (enabled) {
    deps.setPanelRenderingEnabled?.(true);
    deps.setPanelEdgesVisible?.(true);
  }
}

export type IndustrialDesignToolbarViewerApi = Pick<
  PimoViewerApi,
  | "getIndustrialDesignWorkspaceEnabled"
  | "setIndustrialDesignWorkspaceEnabled"
  | "setPanelRenderingEnabled"
  | "setPanelEdgesVisible"
>;

export function buildIndustrialDesignToolbarDeps(
  viewerApi: IndustrialDesignToolbarViewerApi,
  setIndustrialDesignPanelOpen: (open: boolean) => void
): IndustrialDesignToolbarDeps {
  return {
    getIndustrialDesignWorkspaceEnabled: viewerApi.getIndustrialDesignWorkspaceEnabled?.bind(viewerApi),
    setIndustrialDesignWorkspaceEnabled: viewerApi.setIndustrialDesignWorkspaceEnabled?.bind(viewerApi),
    setIndustrialDesignPanelOpen,
    setPanelRenderingEnabled: viewerApi.setPanelRenderingEnabled?.bind(viewerApi),
    setPanelEdgesVisible: viewerApi.setPanelEdgesVisible?.bind(viewerApi),
  };
}
