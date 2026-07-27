/**
 * drawerSystemFlags.ts
 *
 * Feature flags do sistema de gavetas (domínio de design — NÃO industrial / PIMO-TRAK).
 *
 * Modelo A = sistema clássico / Sistema Unificado (src/core/drawers/**).
 * Modelo B = Sistema Europeu (src/core/drawers/european/**) — em restauro: morto em runtime.
 *
 * Regras (restauro Modelo A):
 * - Default: Modelo A ACTIVO; Modelo B DESACTIVADO.
 * - isDrawerModeloAActive() devolve sempre true (único sistema activo).
 * - Nunca tocar em src/industrial/** a partir deste modulo.
 */

export const DRAWER_MODELO_A_STORAGE_KEY = "pimo_drawer_modelo_a_enabled";
export const DRAWER_MODELO_A_CHANGE_EVENT = "pimo:drawer-modelo-a-changed";
/** Legacy key — migração B desactivada no restauro. */
export const DRAWER_MODELO_B_DEFAULT_MIGRATION_KEY = "pimo_drawer_modelo_b_product_default_v1";

/** Default de produto: Modelo A activo (Sistema Unificado). */
export const DRAWER_MODELO_A_DEFAULT_ENABLED = true;

/**
 * Migração B desactivada — Modelo A é o único sistema activo.
 * Mantida como no-op para não quebrar imports/testes existentes.
 */
export function applyModeloBProductDefaultMigration(): void {
  // no-op: restauro Modelo A
}

/** Reset interno para testes unitários da migração. */
export function __resetModeloBProductDefaultMigrationForTests(): void {
  // no-op
}

function readStorage(): boolean | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAWER_MODELO_A_STORAGE_KEY);
    if (raw === null) return null;
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
    return null;
  } catch {
    return null;
  }
}

function writeStorage(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DRAWER_MODELO_A_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Indica se o Sistema Atual de Gavetas (Modelo A) está ativo.
 * Restauro: sempre true — Modelo B morto em runtime.
 */
export function isDrawerModeloAActive(): boolean {
  return true;
}

/**
 * Ativa ou desativa o Modelo A.
 * Restauro: ignora desactivação — Modelo A permanece sempre activo.
 */
export function setDrawerModeloAEnabled(enabled: boolean): void {
  writeStorage(true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DRAWER_MODELO_A_CHANGE_EVENT, {
        detail: { enabled: true },
      })
    );
  }
  void enabled;
  void readStorage;
}

/**
 * Atalho semântico para o toggle Admin.
 * Restauro: nunca pedido — A está sempre activo.
 */
export function isDrawerModeloADeactivationRequested(): boolean {
  return false;
}

export function setDrawerModeloADeactivated(deactivated: boolean): void {
  // Restauro: ignorar pedido de desactivação
  setDrawerModeloAEnabled(true);
  void deactivated;
}

/**
 * Subscreve alterações ao flag (storage + CustomEvent).
 * Devolve função de cleanup.
 */
export function subscribeDrawerModeloAFlags(listener: (_enabled: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
    if (typeof detail?.enabled === "boolean") {
      listener(true);
      return;
    }
    listener(true);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== DRAWER_MODELO_A_STORAGE_KEY) return;
    listener(true);
  };

  window.addEventListener(DRAWER_MODELO_A_CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(DRAWER_MODELO_A_CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
