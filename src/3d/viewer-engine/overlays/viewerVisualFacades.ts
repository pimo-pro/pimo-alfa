export type ViewerVisualFacade = {
  syncAll: () => void;
};

export type ViewerVisualFacadeSet = {
  orlaVisual: ViewerVisualFacade;
  remateVisual: ViewerVisualFacade;
  hematiVisual: ViewerVisualFacade;
  rodapeVisual: ViewerVisualFacade;
};

export function createViewerVisualFacades(sync: {
  syncOrlaVisuals: () => void;
  syncRemateVisuals: () => void;
  syncHematiVisuals: () => void;
  syncRodapeVisuals: () => void;
}): ViewerVisualFacadeSet {
  return {
    orlaVisual: {
      syncAll: () => sync.syncOrlaVisuals(),
    },
    remateVisual: {
      syncAll: () => sync.syncRemateVisuals(),
    },
    hematiVisual: {
      syncAll: () => sync.syncHematiVisuals(),
    },
    rodapeVisual: {
      syncAll: () => sync.syncRodapeVisuals(),
    },
  };
}
