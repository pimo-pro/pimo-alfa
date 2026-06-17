/**
 * Loader automático de documentação de sistema (READ-ONLY).
 * Importa fontes .md (?raw) e exports de módulos .ts de referência.
 * Atualiza-se automaticamente quando os ficheiros fonte mudam (build Vite).
 */

import drawerCertificationReportMd from "../core/drawers/DrawerIndustrialCertificationReport.md?raw";
import {
  DOCUMENTATION_EXPORT,
  DRAWER_GEOMETRY_PHASE6,
  DRAWER_LEGACY_PIPELINE,
  DRAWER_OFFICIAL_PIPELINE,
  DRAWER_PHASE_PROPOSALS,
  DRAWER_UI_PHASE4,
  DRAWER_VIEWER_PHASE5,
  buildDrawerSystemReferenceReport,
  countDrawerReferenceStats,
} from "../core/drawers/DrawerSystemReference";

export type SystemDocFormat = "markdown" | "reference";

export type SystemDocCategoryId =
  | "drawers"
  | "doors"
  | "cnc"
  | "pi"
  | "pdf"
  | "viewer"
  | "ui"
  | "settings";

export type LoadedSystemDoc = {
  id: string;
  title: string;
  format: SystemDocFormat;
  sourcePath: string;
  version: string;
  lastUpdated: string;
  raw: string;
};

export type SystemDocCategoryMeta = {
  id: SystemDocCategoryId;
  label: string;
  description: string;
  available: boolean;
  sourceFiles: string[];
};

export const SYSTEM_DOC_CATEGORIES: SystemDocCategoryMeta[] = [
  {
    id: "drawers",
    label: "Drawers System",
    description: "Master Plan FASE 1–FINAL, pipeline, overrides e certificação industrial.",
    available: true,
    sourceFiles: [
      "src/core/drawers/DrawerSystemReference.ts",
      "src/core/drawers/DrawerIndustrialCertificationReport.md",
    ],
  },
  {
    id: "doors",
    label: "Doors System",
    description: "Documentação do sistema de portas (em preparação).",
    available: false,
    sourceFiles: [],
  },
  {
    id: "cnc",
    label: "CNC Pipeline",
    description: "Nesting, TCN e export industrial (em preparação).",
    available: false,
    sourceFiles: [],
  },
  {
    id: "pi",
    label: "PI System",
    description: "Móveis unificados PI (em preparação).",
    available: false,
    sourceFiles: [],
  },
  {
    id: "pdf",
    label: "PDF Engine",
    description: "PDF técnico e etiquetas v5 (em preparação).",
    available: false,
    sourceFiles: [],
  },
  {
    id: "viewer",
    label: "Viewer Architecture",
    description: "Viewer 3D, raycast e motion (em preparação).",
    available: false,
    sourceFiles: [],
  },
  {
    id: "ui",
    label: "UI Architecture",
    description: "Painéis, workspace e fluxos UI (em preparação).",
    available: false,
    sourceFiles: [],
  },
  {
    id: "settings",
    label: "Settings & Rules",
    description: "settingsSchema e regras industriais globais (em preparação).",
    available: false,
    sourceFiles: [],
  },
];

const MARKDOWN_REGISTRY: Record<string, { title: string; sourcePath: string; raw: string }> = {
  "drawer-certification": {
    title: "Certificação Industrial — Gavetas",
    sourcePath: "src/core/drawers/DrawerIndustrialCertificationReport.md",
    raw: drawerCertificationReportMd,
  },
};

/** Carrega um ficheiro Markdown registado por id. */
export function loadSystemMarkdown(docId: keyof typeof MARKDOWN_REGISTRY): LoadedSystemDoc {
  const entry = MARKDOWN_REGISTRY[docId];
  return {
    id: docId,
    title: entry.title,
    format: "markdown",
    sourcePath: entry.sourcePath,
    version: DOCUMENTATION_EXPORT.version,
    lastUpdated: DOCUMENTATION_EXPORT.lastUpdated,
    raw: entry.raw,
  };
}

/** Relatório agregado DrawerSystemReference (JSON → string para painel). */
export function loadDrawerReferenceReport(): LoadedSystemDoc {
  const report = buildDrawerSystemReferenceReport();
  return {
    id: "drawer-system-reference",
    title: "Drawer System Reference",
    format: "reference",
    sourcePath: "src/core/drawers/DrawerSystemReference.ts",
    version: DOCUMENTATION_EXPORT.version,
    lastUpdated: DOCUMENTATION_EXPORT.lastUpdated,
    raw: JSON.stringify(report, null, 2),
  };
}

export function getDrawerDocumentationBundle() {
  return {
    exportMeta: DOCUMENTATION_EXPORT,
    certification: loadSystemMarkdown("drawer-certification"),
    reference: loadDrawerReferenceReport(),
    referenceReport: buildDrawerSystemReferenceReport(),
    stats: countDrawerReferenceStats(),
    pipelines: {
      official: DRAWER_OFFICIAL_PIPELINE,
      legacy: DRAWER_LEGACY_PIPELINE,
    },
    phases: DRAWER_PHASE_PROPOSALS,
    uiPhase4: DRAWER_UI_PHASE4,
    viewerPhase5: DRAWER_VIEWER_PHASE5,
    geometryPhase6: DRAWER_GEOMETRY_PHASE6,
  };
}

export function getCategoryMeta(id: SystemDocCategoryId): SystemDocCategoryMeta | undefined {
  return SYSTEM_DOC_CATEGORIES.find((c) => c.id === id);
}

/** Lista de suites de teste documentadas (links de ficheiro). */
export const DRAWER_TEST_SUITES = [
  "src/validation/drawerEuropeanSystem.test.ts",
  "src/validation/drawerGeometryPhase6.test.ts",
  "src/validation/drawerViewerPhase5.test.ts",
  "src/validation/drawerUiValidation.test.ts",
  "src/validation/drawerIndustrialRegression.test.ts",
  "src/validation/drawerStressTests.test.ts",
  "src/validation/drawerUiToIndustrialConsistency.test.ts",
  "src/validation/drawerCncCertification.test.ts",
  "src/validation/drawerPdfCertification.test.ts",
] as const;
