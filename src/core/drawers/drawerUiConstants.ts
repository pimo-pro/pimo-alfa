import type {
  DrawerHandlePosition,
  DrawerHandleType,
  DrawerMetalBoxType,
  DrawerSlideType,
} from "../settings/settingsSchema";

export const DRAWER_SLIDE_TYPES: readonly DrawerSlideType[] = [
  "Hettich Quadro V6 You M Silent System",
  "Hettich ArciTech",
  "Genérica",
  "Blum Tandem",
  "Blum Movento",
  "Hettich InnoTech",
  "Hafele Matrix",
] as const;

export const DRAWER_METAL_BOX_TYPES: readonly DrawerMetalBoxType[] = [
  "Nenhuma",
  "Blum Legrabox",
  "Blum Antaro",
  "Blum Metabox",
  "Hettich InnoTech",
  "Hettich ArciTech",
  "Hettich AvanTech",
  "Grass Nova Pro",
  "Grass Vionaro",
  "Hafele Alto",
  "Genérica",
] as const;

export const DRAWER_HANDLE_TYPES: readonly DrawerHandleType[] = [
  "Nenhum",
  "Puxador",
  "Cava",
  "Perfil Alumínio",
] as const;

export const DRAWER_HANDLE_POSITIONS: readonly DrawerHandlePosition[] = [
  "Centro",
  "Topo",
  "Inferior",
  "Percentual",
] as const;

export const DRAWER_HEIGHT_MODES = [
  { value: "equal" as const, label: "Iguais" },
  { value: "top_small_mid_medium_bottom_large" as const, label: "Progressivas" },
  { value: "ergonomic" as const, label: "Ergonómico (DIN)" },
  { value: "kitchen_zones" as const, label: "Zonas de cozinha" },
  { value: "auto" as const, label: "Automático (ergo + zonas)" },
  { value: "custom" as const, label: "Personalizadas" },
];

export const SOFT_CLOSE_COMPATIBLE_SLIDES = new Set<DrawerSlideType>([
  "Blum Tandem",
  "Blum Movento",
  "Hettich InnoTech",
  "Hettich ArciTech",
  "Hettich Quadro V6 You M Silent System",
]);
