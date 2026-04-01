import { useEffect, useRef } from "react";
import { loadProjectRecord } from "../core/projects/projectsClient";
import { reviveState } from "../context/projectPersistence";
import { useToast } from "../context/ToastContext";
import { useProject } from "../context/useProject";
import { tryConsumePendingSingleLoadId } from "./pendingSingleLoadUtils";

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
