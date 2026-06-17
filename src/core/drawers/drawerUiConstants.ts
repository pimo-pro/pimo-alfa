import type {
  DrawerHandlePosition,
  DrawerHandleType,
  DrawerMetalBoxType,
  DrawerSlideType,
} from "../settings/settingsSchema";

export const DRAWER_SLIDE_TYPES: readonly DrawerSlideType[] = [
  "Blum Tandem",
  "Blum Movento",
  "Hettich InnoTech",
  "Hettich ArciTech",
  "Hafele Matrix",
  "Genérica",
] as const;

export const DRAWER_METAL_BOX_TYPES: readonly DrawerMetalBoxType[] = [
  "Nenhuma",
  "Blum Legrabox",
  "Blum Antaro",
  "Hettich AvanTech",
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
] as const;

export const DRAWER_HEIGHT_MODES = [
  { value: "equal" as const, label: "Iguais" },
  { value: "top_small_mid_medium_bottom_large" as const, label: "Progressivas" },
  { value: "custom" as const, label: "Personalizadas" },
];

export const SOFT_CLOSE_COMPATIBLE_SLIDES = new Set<DrawerSlideType>([
  "Blum Tandem",
  "Blum Movento",
  "Hettich InnoTech",
  "Hettich ArciTech",
]);
