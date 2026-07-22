/**
 * SSOT de feature flags industriais (Fase 4).
 * Admin UI re-exporta daqui — `industrial/**` não importa de `app/**`.
 *
 * @see docs/architecture/industrial-feature-flags.md
 */
export const industrialFeatureFlags = {
  operationsUi: true,
  realtimeTracking: true,
  qualityGate: true,
  reworkFlow: true,
  adminRulesEditor: true,
  /** Páginas online de análise de PDFs industriais (Fase 1+). Default off em produção. */
  industrialOnlineAnalysis: true,
} as const;

export type IndustrialFeatureFlagKey = keyof typeof industrialFeatureFlags;

/** @deprecated Use `industrialFeatureFlags` */
export const industrialAdminFeatureFlags = industrialFeatureFlags;
