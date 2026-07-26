/**
 * drawerSystemFlags.ts
 *
 * Feature flags do sistema de gavetas (domínio de design — NÃO industrial / PIMO-TRAK).
 *
 * Modelo A = sistema atual (src/core/drawers/**, UI, cutlist, PDF, furação europeia).
 * Modelo B = Sistema Europeu de Gavetas (esqueleto em src/core/drawers/european/**).
 *
 * Regras:
 * - Default: Modelo A ATIVO (zero regressão).
 * - Desativar NÃO apaga código nem dados do projeto — apenas ignora o Modelo A em runtime.
 * - Nunca tocar em src/industrial/** a partir deste módulo.
 */

export const DRAWER_MODELO_A_STORAGE_KEY = "pimo_drawer_modelo_a_enabled";
export const DRAWER_MODELO_A_CHANGE_EVENT = "pimo:drawer-modelo-a-changed";

/** Default seguro: sistema atual ligado. */
export const DRAWER_MODELO_A_DEFAULT_ENABLED = true;

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
 * Quando false: UI, geração, furos, PDF e reconhecimento de gavetas ficam inativos.
 */
export function isDrawerModeloAActive(): boolean {
  const stored = readStorage();
  return stored ?? DRAWER_MODELO_A_DEFAULT_ENABLED;
}

/**
 * Ativa ou desativa o Modelo A.
 * @param enabled true = sistema atual ativo; false = completamente inativo (código preservado).
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
 * Atalho semântico para o toggle Admin:
 * "Desativar Sistema Atual de Gavetas (Modelo A)" marcado = Modelo A desligado.
 */
export function isDrawerModeloADeactivationRequested(): boolean {
  return !isDrawerModeloAActive();
}

export function setDrawerModeloADeactivated(deactivated: boolean): void {
  setDrawerModeloAEnabled(!deactivated);
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
