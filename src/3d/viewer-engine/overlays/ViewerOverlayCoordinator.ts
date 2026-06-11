/**
 * Coordenador unificado de overlays 2D do viewer (régua, medição interna, snapping).
 * Lifecycle: bind no construtor do ViewerCore, refreshFrame no tick, clearAll no dispose/seleção.
 */

export const VIEWER_OVERLAY_Z_INDEX = {
  movementRuler: 14,
  smartSnapping: 16,
  internalRuler: 17,
  internalRulerOverlay: 18,
} as const;

export type ViewerOverlayRefreshHooks = {
  syncRulerWithExternalSelectionMovement: () => void;
  clearRulerOverlayIfMovementIdle: (_nowMs: number) => void;
  refreshInternalRuler: () => void;
  refreshInternalRulerOverlay: () => void;
  refreshSnapping: () => void;
  refreshSmartAlignSnap?: () => void;
  clearMovementRuler?: () => void;
  clearSmartAlignSnap?: () => void;
};

export class ViewerOverlayCoordinator {
  private hooks: ViewerOverlayRefreshHooks | null = null;

  bind(hooks: ViewerOverlayRefreshHooks | null): void {
    this.hooks = hooks;
  }

  /** Chamado uma vez por frame antes do render (ordem: overlays após física/snapping). */
  refreshFrame(nowMs: number): void {
    const h = this.hooks;
    if (!h) return;
    h.syncRulerWithExternalSelectionMovement();
    h.clearRulerOverlayIfMovementIdle(nowMs);
    h.refreshInternalRuler();
    h.refreshInternalRulerOverlay();
    h.refreshSnapping();
    h.refreshSmartAlignSnap?.();
  }

  /** Limpa overlays voláteis (fim de drag, mudança de seleção). */
  clearTransientOverlays(): void {
    this.hooks?.clearMovementRuler?.();
    this.hooks?.clearSmartAlignSnap?.();
  }

  dispose(): void {
    this.hooks = null;
  }
}
