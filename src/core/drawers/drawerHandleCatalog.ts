/**
 * Catálogo de perfis de puxadores para gavetas.
 * Cada perfil define furação industrial (furos e/ou rasgo) e CC configurável.
 */

import type { DrillFace } from "../types";
import type { DrawerHandleType } from "../settings/settingsSchema";

export type DrawerHandleProfileKind =
  | "bar_double_hole"
  | "single_hole"
  | "groove"
  | "profile_groove";

export type DrawerHandleHoleTemplate = {
  /** Offset X em relação ao centro do puxador (mm). */
  xFromCenter: number;
  /** Offset Y em relação à âncora vertical (mm). */
  yFromAnchor: number;
  diametro: number;
  profundidade: number;
  face: DrillFace;
};

export type DrawerHandleGrooveTemplate = {
  /** Comprimento do rasgo como fração da largura da peça (0–1). */
  lengthRatio: number;
  /** Comprimento máximo (mm). */
  maxLengthMm: number;
  grooveWidth: number;
  profundidade: number;
  face: DrillFace;
};

export type DrawerHandleProfile = {
  id: string;
  nome: string;
  handleType: DrawerHandleType;
  kind: DrawerHandleProfileKind;
  defaultCenterDistanceMm: number;
  allowedCenterDistancesMm: number[];
  holes: DrawerHandleHoleTemplate[];
  groove?: DrawerHandleGrooveTemplate;
};

export const STANDARD_HANDLE_CENTER_DISTANCES_MM = [80, 96, 128, 160] as const;

const doubleHoleTemplates = (ccMm: number): DrawerHandleHoleTemplate[] => {
  const half = ccMm / 2;
  return [
    { xFromCenter: -half, yFromAnchor: 0, diametro: 5, profundidade: 12, face: "tras" },
    { xFromCenter: half, yFromAnchor: 0, diametro: 5, profundidade: 12, face: "tras" },
  ];
};

export const DRAWER_HANDLE_PROFILES: DrawerHandleProfile[] = [
  {
    id: "puxador_cc80",
    nome: "Puxador barra CC 80",
    handleType: "Puxador",
    kind: "bar_double_hole",
    defaultCenterDistanceMm: 80,
    allowedCenterDistancesMm: [...STANDARD_HANDLE_CENTER_DISTANCES_MM],
    holes: doubleHoleTemplates(80),
  },
  {
    id: "puxador_cc96",
    nome: "Puxador barra CC 96",
    handleType: "Puxador",
    kind: "bar_double_hole",
    defaultCenterDistanceMm: 96,
    allowedCenterDistancesMm: [...STANDARD_HANDLE_CENTER_DISTANCES_MM],
    holes: doubleHoleTemplates(96),
  },
  {
    id: "puxador_cc128",
    nome: "Puxador barra CC 128",
    handleType: "Puxador",
    kind: "bar_double_hole",
    defaultCenterDistanceMm: 128,
    allowedCenterDistancesMm: [...STANDARD_HANDLE_CENTER_DISTANCES_MM],
    holes: doubleHoleTemplates(128),
  },
  {
    id: "puxador_cc160",
    nome: "Puxador barra CC 160",
    handleType: "Puxador",
    kind: "bar_double_hole",
    defaultCenterDistanceMm: 160,
    allowedCenterDistancesMm: [...STANDARD_HANDLE_CENTER_DISTANCES_MM],
    holes: doubleHoleTemplates(160),
  },
  {
    id: "embutido_single",
    nome: "Embutido (furo único)",
    handleType: "Puxador",
    kind: "single_hole",
    defaultCenterDistanceMm: 0,
    allowedCenterDistancesMm: [0],
    holes: [{ xFromCenter: 0, yFromAnchor: 0, diametro: 35, profundidade: 13, face: "tras" }],
  },
  {
    id: "cava_horizontal",
    nome: "Cava horizontal",
    handleType: "Cava",
    kind: "groove",
    defaultCenterDistanceMm: 0,
    allowedCenterDistancesMm: [0],
    holes: [],
    groove: {
      lengthRatio: 0.5,
      maxLengthMm: 280,
      grooveWidth: 30,
      profundidade: 10,
      face: "tras",
    },
  },
  {
    id: "perfil_aluminio",
    nome: "Perfil alumínio",
    handleType: "Perfil Alumínio",
    kind: "profile_groove",
    defaultCenterDistanceMm: 0,
    allowedCenterDistancesMm: [0],
    holes: [],
    groove: {
      lengthRatio: 0.85,
      maxLengthMm: 400,
      grooveWidth: 20,
      profundidade: 12,
      face: "tras",
    },
  },
];

export function findDrawerHandleProfile(id: string | null | undefined): DrawerHandleProfile | null {
  if (!id) return null;
  return DRAWER_HANDLE_PROFILES.find((p) => p.id === id) ?? null;
}

export function getDefaultProfileForHandleType(handleType: DrawerHandleType): DrawerHandleProfile | null {
  if (handleType === "Nenhum") return null;
  return DRAWER_HANDLE_PROFILES.find((p) => p.handleType === handleType && p.kind !== "single_hole") ?? null;
}

export function resolveDrawerHandleProfile(
  handleType: DrawerHandleType | string | undefined,
  profileId?: string | null,
  centerDistanceMm?: number | null
): DrawerHandleProfile | null {
  if (!handleType || handleType === "Nenhum") return null;

  const byId = findDrawerHandleProfile(profileId);
  const base =
    byId ??
    getDefaultProfileForHandleType(handleType as DrawerHandleType) ??
    DRAWER_HANDLE_PROFILES.find((p) => p.handleType === handleType) ??
    null;
  if (!base) return null;

  if (base.kind !== "bar_double_hole" || centerDistanceMm == null || !Number.isFinite(centerDistanceMm)) {
    return base;
  }

  const cc = Math.max(32, centerDistanceMm);
  return {
    ...base,
    defaultCenterDistanceMm: cc,
    holes: doubleHoleTemplates(cc),
  };
}

export function listProfilesForHandleType(handleType: DrawerHandleType): DrawerHandleProfile[] {
  if (handleType === "Nenhum") return [];
  return DRAWER_HANDLE_PROFILES.filter((p) => p.handleType === handleType);
}
