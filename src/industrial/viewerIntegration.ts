/**
 * Boundary viewer ↔ mundo industrial / app.
 *
 * O ViewerCore não importa `industrial/**` directamente.
 * Integrações passam por projectState, hooks e este módulo.
 *
 * @see docs/architecture/industrial-boundaries.md
 */

export type MaterialSyncViewerRefresh = {
  affectedRemateIds: string[];
  affectedRodapeIds: string[];
};

/** Callbacks opcionais expostos em `window.viewerCore` usados após sync de materiais. */
export type ViewerCoreIndustrialSurface = {
  syncRemateVisuals?: () => void;
  syncRodapeVisuals?: () => void;
  syncOrlaVisuals?: () => void;
};

/**
 * Actualiza overlays do viewer após alteração de materiais (remates/rodapés).
 * Extraído de `core/materials/materialSync` para boundary explícito.
 */
export function refreshViewerAfterMaterialSync(result: MaterialSyncViewerRefresh): void {
  if (typeof window === "undefined") return;
  const run = () => {
    const core = (window as Window & { viewerCore?: ViewerCoreIndustrialSurface }).viewerCore;
    if (!core) return;
    if (result.affectedRemateIds.length > 0) {
      core.syncRemateVisuals?.();
    }
    if (result.affectedRodapeIds.length > 0) {
      core.syncRodapeVisuals?.();
    }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(run);
  } else {
    run();
  }
}

/** Pontos de integração documentados (sem lógica — referência para Fase 4). */
export const VIEWER_INDUSTRIAL_INTEGRATION_POINTS = {
  materialSync: "core/materials/materialSync → refreshViewerAfterMaterialSync",
  cutlist: "context/projectState → manufacturing/cutlistFromBoxes (sem import viewer)",
  export: "hooks/useGerarArquivoHandlers → fabrication (independente do viewer loop)",
  pieceQr: "app/industrial/piece → qrcode/qrcodeService",
  workspace: "components/layout/workspace/Workspace → window.viewerCore",
} as const;
