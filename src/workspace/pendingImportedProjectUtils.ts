import type { ProjectSnapshot } from "../context/projectTypes";

export const PIMO_PENDING_IMPORTED_PROJECT = "pimo_pending_imported_project";

export type PendingImportedProject = {
  slug: string;
  snapshot: ProjectSnapshot;
  projectName: string;
};

export function storePendingImportedProject(payload: PendingImportedProject): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PIMO_PENDING_IMPORTED_PROJECT, JSON.stringify(payload));
}

/** Lê e remove o import pendente se o slug coincidir com a rota actual. */
export function tryConsumePendingImportedProject(routeSlug: string): PendingImportedProject | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PIMO_PENDING_IMPORTED_PROJECT);
    if (!raw?.trim()) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const payload = parsed as Partial<PendingImportedProject>;
    if (typeof payload.slug !== "string" || !payload.snapshot) return null;
    const slug = payload.slug.trim();
    if (!slug || slug !== routeSlug.trim()) return null;
    sessionStorage.removeItem(PIMO_PENDING_IMPORTED_PROJECT);
    return {
      slug,
      snapshot: payload.snapshot,
      projectName: typeof payload.projectName === "string" ? payload.projectName : "Projeto",
    };
  } catch {
    return null;
  }
}
