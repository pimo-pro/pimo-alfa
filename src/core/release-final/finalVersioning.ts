/**
 * finalVersioning.ts — Versóo oficial PIMO.PRO-V5.0 (Fase 20).
 */

export const PIMO_PRO_V5_VERSION = "PIMO.PRO-V5.0";
export const PIMO_PRO_V5_CODENAME = "Industrial Release Final";

export type ComponentStatus = "OK" | "WARN" | "MISSING" | "SKIP";

export type FinalVersionManifest = {
  version: string;
  codename: string;
  releasedAt: string;
  /** Hash lógico estável (conteúdo do manifesto, sem RNG). */
  logicalHash: string;
  components: Array<{
    id: string;
    label: string;
    phase: number | string;
    status: ComponentStatus;
  }>;
  industrialStatus: ComponentStatus;
  cncStatus: ComponentStatus;
  pricingStatus: ComponentStatus;
  plannerStatus: ComponentStatus;
};

const COMPONENT_CATALOG: FinalVersionManifest["components"] = [
  { id: "modelo-b", label: "Modelo B (gavetas europeias)", phase: "1-11", status: "OK" },
  { id: "dxf", label: "DXF em memória + físico", phase: "12+16", status: "OK" },
  { id: "technical", label: "Vistas técnicas", phase: 12, status: "OK" },
  { id: "overlay", label: "MC Overlay avançado", phase: 13, status: "OK" },
  { id: "docs", label: "Documentação industrial", phase: 11, status: "OK" },
  { id: "release-notes", label: "Release Notes Modelo B", phase: 14, status: "OK" },
  { id: "kitchen-library", label: "Kitchen Library", phase: 15, status: "OK" },
  { id: "cnc", label: "CNC Post-Processor", phase: 17, status: "OK" },
  { id: "pricing", label: "Industrial Pricing Engine", phase: 18, status: "OK" },
  { id: "planner", label: "Kitchen Planner (cliente)", phase: 19, status: "OK" },
  { id: "release-final", label: "Release Final consolidado", phase: 20, status: "OK" },
];

/** Hash lógico determinístico (djb2-like) sobre string canúnica. */
export function computeLogicalHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
    h = h >>> 0;
  }
  return `v5-${h.toString(16).padStart(8, "0")}`;
}

export function buildFinalVersionManifest(options?: {
  releasedAt?: string;
  industrialStatus?: ComponentStatus;
  cncStatus?: ComponentStatus;
  pricingStatus?: ComponentStatus;
  plannerStatus?: ComponentStatus;
  componentOverrides?: Partial<Record<string, ComponentStatus>>;
}): FinalVersionManifest {
  const releasedAt = options?.releasedAt ?? new Date().toISOString();
  const components = COMPONENT_CATALOG.map((c) => ({
    ...c,
    status: options?.componentOverrides?.[c.id] ?? c.status,
  }));

  const industrialStatus = options?.industrialStatus ?? "OK";
  const cncStatus = options?.cncStatus ?? "OK";
  const pricingStatus = options?.pricingStatus ?? "OK";
  const plannerStatus = options?.plannerStatus ?? "OK";

  const canonical = [
    PIMO_PRO_V5_VERSION,
    components.map((c) => `${c.id}:${c.status}`).join("|"),
    `ind=${industrialStatus}`,
    `cnc=${cncStatus}`,
    `price=${pricingStatus}`,
    `plan=${plannerStatus}`,
  ].join("::");

  return {
    version: PIMO_PRO_V5_VERSION,
    codename: PIMO_PRO_V5_CODENAME,
    releasedAt,
    logicalHash: computeLogicalHash(canonical),
    components,
    industrialStatus,
    cncStatus,
    pricingStatus,
    plannerStatus,
  };
}
