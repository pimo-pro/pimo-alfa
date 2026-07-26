/**
 * Contagem local de projetos em `api/projects/data/*.json`.
 * Leitura em disco (fs) — sem rotas novas.
 *
 * Em browser o Vite nao pode usar fs; `loadProjectCount()` devolve 0
 * e o Hub hidrata com `loadProjectCountAsync()` / `useHubProjectCount`
 * (mesma lista que /PROJETOS via listProjetosPageProjects).
 */

export type ProjectCountSnapshot = {
  totalProjects: number;
};

const LEGACY_PREFIX = /^project-/i;

function isNamedProjectJson(fileName: string): boolean {
  if (!fileName.toLowerCase().endsWith(".json")) return false;
  return !LEGACY_PREFIX.test(fileName);
}

function tryCountViaNodeFs(): number | null {
  try {
    if (typeof process === "undefined" || !process.versions?.node) return null;
    // Evita import estatico de fs (quebra o bundle Vite do browser).
    const req = Function(
      "return typeof require !== 'undefined' ? require : null"
    )() as NodeRequire | null;
    if (!req) return null;
    const fs = req("node:fs") as typeof import("node:fs");
    const path = req("node:path") as typeof import("node:path");
    const cwd = process.cwd();
    const candidates = [
      path.resolve(cwd, "api", "projects", "data"),
      path.resolve(cwd, "hostinger", "api", "projects", "data"),
    ];
    for (const dir of candidates) {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      const files = fs.readdirSync(dir);
      return files.filter((f) => isNamedProjectJson(f)).length;
    }
    return 0;
  } catch {
    return null;
  }
}

/** Leitura local sincrona (Node/fs). No browser devolve 0 ate hidratacao async. */
export function loadProjectCount(): ProjectCountSnapshot {
  const fromFs = tryCountViaNodeFs();
  if (fromFs !== null) return { totalProjects: fromFs };
  return { totalProjects: 0 };
}

/**
 * Contagem live alinhada a `/PROJETOS`
 * (listProjetosPageProjects / action=projetos — sem rotas novas).
 */
export async function loadProjectCountAsync(): Promise<ProjectCountSnapshot> {
  try {
    const { listProjetosPageProjects } = await import(
      "@/app/PROJETOS/projetosPagesClient"
    );
    const list = await listProjetosPageProjects("all");
    return { totalProjects: Array.isArray(list) ? list.length : 0 };
  } catch {
    return loadProjectCount();
  }
}
