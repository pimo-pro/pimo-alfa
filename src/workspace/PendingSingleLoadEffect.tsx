import { useEffect, useRef } from "react";
import { loadProjectRecord } from "../core/projects/projectsClient";
import { reviveState } from "../context/projectPersistence";
import { useToast } from "../context/ToastContext";
import { useProject } from "../context/useProject";

/** Chave alinhada ao showroom: `{ id: string }` em JSON. */
export const PIMO_PENDING_SINGLE_LOAD = "pimo_pending_single_load";

/** Lê e remove a chave; devolve o id ou null se inválida/ausente. */
export function tryConsumePendingSingleLoadId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PIMO_PENDING_SINGLE_LOAD);
    if (!raw?.trim()) return null;
    sessionStorage.removeItem(PIMO_PENDING_SINGLE_LOAD);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("id" in parsed)) return null;
    const id = (parsed as { id: unknown }).id;
    if (typeof id !== "string") return null;
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Abre um snapshot único no workspace após navegação desde o showroom.
 * Não altera merge nem `loadProjectSnapshot`; corre depois do efeito de merge no DOM.
 */
export function PendingSingleLoadEffect() {
  const { actions } = useProject();
  const { showToast } = useToast();
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) return;
    const id = tryConsumePendingSingleLoadId();
    if (!id) return;
    consumedRef.current = true;

    void (async () => {
      try {
        const entry = await loadProjectRecord(id);
        if (!entry) {
          showToast(`Não foi possível abrir o projeto (id não encontrado).`, "error");
          return;
        }
        const restored = reviveState(entry.snapshot.projectState);
        if (!restored) {
          showToast("Snapshot inválido ou incompatível.", "error");
          return;
        }
        await actions.loadProjectSnapshot(id);
        const name = restored.projectName?.trim() || id;
        showToast(`Projeto aberto no workspace: ${name}.`, "info");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`Erro ao abrir projeto: ${msg}`, "error");
      }
    })();
  }, [actions, showToast]);

  return null;
}
