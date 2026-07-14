/** Rotas reservadas do pimo.pro — não usar como slug de projeto importado. */
const RESERVED_ROUTE_SLUGS = new Set([
  "",
  "admin",
  "ajuda",
  "apresentacao",
  "dashboard",
  "definicoes",
  "dev-test",
  "documentacao",
  "forgot-password",
  "industrial",
  "landing",
  "login",
  "me",
  "meus-projetos",
  "nesting_v3",
  "painel-referencia",
  "pieces",
  "project-progress",
  "projects",
  "projetos",
  "register",
  "studio",
  "v4",
]);

/**
 * Gera slug de rota a partir do nome do projeto.
 * Ex.: "khaled 1 cozinha branca" → "khaled_1_cozinha_branca"
 */
export function buildImportedProjectRouteSlug(projectName: string): string {
  const normalized = String(projectName ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s/\\]+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const slug = normalized || "projeto";
  if (RESERVED_ROUTE_SLUGS.has(slug)) {
    return `${slug}_importado`;
  }
  return slug;
}

export function isReservedImportedProjectRouteSlug(slug: string): boolean {
  return RESERVED_ROUTE_SLUGS.has(String(slug ?? "").trim().toLowerCase());
}
