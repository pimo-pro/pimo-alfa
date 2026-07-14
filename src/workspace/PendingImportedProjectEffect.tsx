import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useProject } from "../context/useProject";
import { isReservedImportedProjectRouteSlug } from "../industrial/import/importedProjectRouteSlug";
import { tryConsumePendingImportedProject } from "./pendingImportedProjectUtils";

/**
 * Abre um projeto PIMO importado de ficheiro após navegação para /{slug}.
 */
export function PendingImportedProjectEffect() {
  const { actions } = useProject();
  const { showToast } = useToast();
  const location = useLocation();
  const consumedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, "");
    const slug = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    if (!slug || slug.includes("/") || isReservedImportedProjectRouteSlug(slug)) return;
    if (consumedSlugRef.current === slug) return;

    const pending = tryConsumePendingImportedProject(slug);
    if (!pending) return;
    consumedSlugRef.current = slug;

    void (async () => {
      try {
        await actions.loadImportedPimoProject(pending.snapshot, pending.slug);
        showToast(`Projeto importado: ${pending.projectName}.`, "info");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`Erro ao abrir projeto importado: ${msg}`, "error");
      }
    })();
  }, [actions, location.pathname, showToast]);

  return null;
}
