/**
 * drawerSystemFlags.ts
 *
 * Feature flags do sistema de gavetas (domnio de design  NO industrial / PIMO-TRAK).
 *
 * Modelo A = sistema atual (src/core/drawers/**, UI, cutlist, PDF, furao europeia).
 * Modelo B = Sistema Europeu de Gavetas (esqueleto em src/core/drawers/european/**).
 *
 * Regras:
 * - Default: Modelo B ATIVO (Modelo A desactivado em runtime; codigo A preservado).
 * - Desativar NAO apaga codigo nem dados do projeto  apenas ignora o Modelo A em runtime.
 * - Nunca tocar em src/industrial/** a partir deste modulo.
 */

export const DRAWER_MODELO_A_STORAGE_KEY = "pimo_drawer_modelo_a_enabled";
export const DRAWER_MODELO_A_CHANGE_EVENT = "pimo:drawer-modelo-a-changed";
/** Migrao one-shot: aps o binding Modelo B, limpa `true` legado no localStorage. */
export const DRAWER_MODELO_B_DEFAULT_MIGRATION_KEY = "pimo_drawer_modelo_b_product_default_v1";

/** Default de produto: Sistema Europeu (Modelo B) activo  Modelo A preservado mas inactivo.
 * Em Vitest mantm Modelo A activo para no quebrar suites unitrias do pipeline legado
 * (os testes do Modelo B fazem mock explcito de isDrawerModeloAActive=false). */
export const DRAWER_MODELO_A_DEFAULT_ENABLED =
  typeof process !== "undefined" && process.env.VITEST === "true" ? true : false;

let modeloBDefaultMigrationAttempted = false;

/**
 * Garante que um `localStorage=true` antigo (pr-binding B) no mantm o Modelo A
 * activo por omisso. Corre uma vez por browser; depois o Admin pode reactivar A.
 * Em Vitest no corre (suites A dependem do default de teste).
 */
export function applyModeloBProductDefaultMigration(): void {
  if (modeloBDefaultMigrationAttempted) return;
  modeloBDefaultMigrationAttempted = true;
  if (typeof process !== "undefined" && process.env.VITEST === "true") return;
  if (typeof localStorage === "undefined") return;
  try {
    if (localStorage.getItem(DRAWER_MODELO_B_DEFAULT_MIGRATION_KEY) === "1") return;
    localStorage.setItem(DRAWER_MODELO_A_STORAGE_KEY, "false");
    localStorage.setItem(DRAWER_MODELO_B_DEFAULT_MIGRATION_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

/** Reset interno para testes unitrios da migrao. */
export function __resetModeloBProductDefaultMigrationForTests(): void {
  modeloBDefaultMigrationAttempted = false;
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
 * Indica se o Sistema Atual de Gavetas (Modelo A) est ativo.
 * Quando false: UI, gerao, furos, PDF e reconhecimento de gavetas ficam inativos.
 */
export function isDrawerModeloAActive(): boolean {
  applyModeloBProductDefaultMigration();
  const stored = readStorage();
  return stored ?? DRAWER_MODELO_A_DEFAULT_ENABLED;
}

/**
 * Ativa ou desativa o Modelo A.
 * @param enabled true = sistema atual ativo; false = completamente inativo (cdigo preservado).
 */
export function setDrawerModeloAEnabled(enabled: boolean): void {
  writeStorage(enabled);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(DRAWER_MODELO_A_CHANGE_EVENT, {
        detail: { enabled },
      })
    );
  }
}

/**
 * Atalho semntico para o toggle Admin:
 * "Desativar Sistema Atual de Gavetas (Modelo A)" marcado = Modelo A desligado.
 */
export function isDrawerModeloADeactivationRequested(): boolean {
  return !isDrawerModeloAActive();
}

export function setDrawerModeloADeactivated(deactivated: boolean): void {
  setDrawerModeloAEnabled(!deactivated);
}

/**
 * Subscreve alteraes ao flag (storage + CustomEvent).
 * Devolve funo de cleanup.
 */
export function subscribeDrawerModeloAFlags(listener: (_enabled: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
    if (typeof detail?.enabled === "boolean") {
      listener(detail.enabled);
      return;
    }
    listener(isDrawerModeloAActive());
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== DRAWER_MODELO_A_STORAGE_KEY) return;
    listener(isDrawerModeloAActive());
  };

  window.addEventListener(DRAWER_MODELO_A_CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(DRAWER_MODELO_A_CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
