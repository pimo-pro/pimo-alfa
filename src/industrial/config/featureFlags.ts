/**
 * SSOT de feature flags industriais (Fase 4).
 * Admin UI re-exporta daqui — `industrial/**` não importa de `app/**`.
 *
 * @see docs/architecture/industrial-feature-flags.md
 */
export const industrialFeatureFlags = {
  operationsUi: false,
  realtimeTracking: false,
  qualityGate: false,
  reworkFlow: false,
  adminRulesEditor: false,
} as const;

export type IndustrialFeatureFlagKey = keyof typeof industrialFeatureFlags;

/** @deprecated Use `industrialFeatureFlags` */
export const industrialAdminFeatureFlags = industrialFeatureFlags;
