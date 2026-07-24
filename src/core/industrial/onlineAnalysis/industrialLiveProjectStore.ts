/**
 * SSOT em memória do ProjectState industrial partilhado entre o editor (ZIP)
 * e as páginas `/PROJETOS/.../analise` (fora do ProjectProvider).
 *
 * Sobrevive — desmontagem do LegacyApp ao navegar para /analise.
 */
import type { ProjectState } from "@/context/projectTypes";
import {
  decodeProjetosPageSlug,
  toProjetosPageSlug,
} from "@/app/PROJETOS/projetosPageSlug";

export type IndustrialLiveProjectEntry = {
  projectName: string;
  currentProjectId: string | null;
  state: ProjectState;
  revision: number;
  updatedAt: number;
};

let entry: IndustrialLiveProjectEntry | null = null;
let revisionSeq = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

export function subscribeIndustrialLiveProject(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getIndustrialLiveProject(): IndustrialLiveProjectEntry | null {
  return entry;
}

export function liveProjectMatchesPageSlug(
  pageSlug: string | undefined,
  projectName: string | undefined
): boolean {
  if (!pageSlug || !projectName) return false;
  return toProjetosPageSlug(projectName) === decodeProjetosPageSlug(pageSlug);
}

export function getIndustrialLiveProjectMatchingSlug(
  pageSlug: string | undefined
): ProjectState | null {
  if (!entry || !pageSlug) return null;
  if (!liveProjectMatchesPageSlug(pageSlug, entry.projectName)) return null;
  return entry.state;
}

/** Publica o estado live (editor ou /analise). */
export function publishIndustrialLiveProject(state: ProjectState): IndustrialLiveProjectEntry {
  const projectName = state.projectName?.trim() || "Projeto";
  revisionSeq += 1;
  entry = {
    projectName,
    currentProjectId: state.currentProjectId ?? null,
    state,
    revision: revisionSeq,
    updatedAt: Date.now(),
  };
  notify();
  return entry;
}

export function patchIndustrialLiveProject(
  fn: (_prev: ProjectState) => ProjectState
): ProjectState | null {
  if (!entry) return null;
  const next = fn(entry.state);
  publishIndustrialLiveProject(next);
  return next;
}

export function clearIndustrialLiveProject(): void {
  entry = null;
  notify();
}
