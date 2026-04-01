import { useEffect, useRef } from "react";
import { tryConsumePendingWorkspaceMergeIds } from "../core/projects/projectMergeWorkspace";
import { useToast } from "./ToastContext";
import { useProject } from "./useProject";

/**
 * Consome `sessionStorage` de merge pendente (definido no showroom) e aplica no workspace.
 * Vive dentro de ToastProvider para poder mostrar erros; exige ProjectProvider ancestral.
 */
export function PendingWorkspaceMergeEffect() {
  const { actions } = useProject();
  const { showToast } = useToast();
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) return;
    const ids = tryConsumePendingWorkspaceMergeIds();
    if (!ids?.length) return;
    consumedRef.current = true;
    void actions
      .mergeSnapshots(ids)
      .then(() => {
        showToast(`Merge concluído: ${ids.length} projeto(s) no workspace.`, "info");
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(msg, "error");
      });
  }, [actions, showToast]);

  return null;
}
