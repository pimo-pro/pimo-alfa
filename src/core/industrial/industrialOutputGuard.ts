/**
 * Proteção de saídas industriais — TCN, TXML, PDF Layout PRO e Cutlist.
 *
 * Geradores industriais permanecem imutáveis; apenas consumidores autorizados
 * (comandos explícitos do utilizador) podem invocar exportação.
 */

export type IndustrialOutputKind =
  | "tcn"
  | "txml"
  | "pdf-layout-pro"
  | "pdf-cutlist"
  | "pdf-etiquetas";

export class IndustrialOutputBlockedError extends Error {
  readonly kind: IndustrialOutputKind;

  constructor(kind: IndustrialOutputKind) {
    super(
      `Saída industrial bloqueada (${kind}): requer autorização explícita do utilizador via withIndustrialOutputAuthorization.`
    );
    this.name = "IndustrialOutputBlockedError";
    this.kind = kind;
  }
}

/** Módulos geradores protegidos — não alterar sem comando explícito do utilizador. */
export const INDUSTRIAL_LOCKED_GENERATOR_PATHS = [
  "src/core/cnc/tcnGenerator.ts",
  "src/core/cnc/tcnGeneratorV2New.ts",
  "src/core/cnc/tcnGeneratorV3New.ts",
  "src/core/cnc/tcnGeneratorNestingMo.ts",
  "src/core/cnc/cncExport.ts",
  "src/core/drill/drillExport.ts",
  "src/core/cutlayout/cutLayoutPdf.ts",
  "src/core/pdf/pdfCutlist.ts",
  "src/core/pdf/pdfEtiquetas.ts",
] as const;

let authorizationDepth = 0;
const authorizedKinds = new Set<IndustrialOutputKind>();
let sessionDepth = 0;

let testBypassDisabled = false;

/** Apenas testes — força o guard mesmo em ambiente Vitest. */
export function __disableIndustrialOutputTestBypass(disable: boolean): void {
  testBypassDisabled = disable;
}

function isTestEnvironment(): boolean {
  if (testBypassDisabled) return false;
  return typeof import.meta !== "undefined" && import.meta.env?.MODE === "test";
}

/** Inicia sessão autorizada (chamado por beginIndustrialFileGeneration). */
export function beginIndustrialOutputSession(): void {
  sessionDepth += 1;
  authorizationDepth += 1;
}

/** Termina sessão autorizada (chamado por endIndustrialFileGeneration). */
export function endIndustrialOutputSession(): void {
  sessionDepth = Math.max(0, sessionDepth - 1);
  authorizationDepth = Math.max(0, authorizationDepth - 1);
}

export function isIndustrialOutputSessionActive(): boolean {
  return sessionDepth > 0;
}

export function isIndustrialOutputAuthorized(kind: IndustrialOutputKind): boolean {
  if (isTestEnvironment()) return true;
  if (authorizationDepth <= 0) return false;
  if (authorizedKinds.size === 0) return true;
  return authorizedKinds.has(kind);
}

export function assertIndustrialOutputAuthorized(kind: IndustrialOutputKind): void {
  if (!isIndustrialOutputAuthorized(kind)) {
    throw new IndustrialOutputBlockedError(kind);
  }
}

export type IndustrialOutputAuthorizationScope = IndustrialOutputKind | IndustrialOutputKind[] | "all";

/**
 * Autoriza exportações industriais durante a execução de um handler explícito do utilizador.
 */
export function withIndustrialOutputAuthorization<T>(
  scope: IndustrialOutputAuthorizationScope,
  fn: () => T
): T {
  authorizationDepth += 1;
  const kindsToAdd =
    scope === "all"
      ? (["tcn", "txml", "pdf-layout-pro", "pdf-cutlist", "pdf-etiquetas"] as IndustrialOutputKind[])
      : Array.isArray(scope)
        ? scope
        : [scope];

  for (const kind of kindsToAdd) {
    authorizedKinds.add(kind);
  }

  try {
    return fn();
  } finally {
    for (const kind of kindsToAdd) {
      authorizedKinds.delete(kind);
    }
    authorizationDepth = Math.max(0, authorizationDepth - 1);
  }
}

export async function withIndustrialOutputAuthorizationAsync<T>(
  scope: IndustrialOutputAuthorizationScope,
  fn: () => Promise<T>
): Promise<T> {
  authorizationDepth += 1;
  const kindsToAdd =
    scope === "all"
      ? (["tcn", "txml", "pdf-layout-pro", "pdf-cutlist", "pdf-etiquetas"] as IndustrialOutputKind[])
      : Array.isArray(scope)
        ? scope
        : [scope];

  for (const kind of kindsToAdd) {
    authorizedKinds.add(kind);
  }

  try {
    return await fn();
  } finally {
    for (const kind of kindsToAdd) {
      authorizedKinds.delete(kind);
    }
    authorizationDepth = Math.max(0, authorizationDepth - 1);
  }
}
