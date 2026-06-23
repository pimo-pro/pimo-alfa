import type { DrawerHeightMode } from "./drawerHeightModeTypes";
import type { DrawerLayerMetadata } from "../../models/BoxLayers";
import type {
  DrawerHandlePosition,
  DrawerHandleType,
  DrawerMetalBoxType,
  DrawerSlideType,
} from "../settings/settingsSchema";

/** Configuração serializável de uma gaveta dentro de um preset (sem id). */
export type DrawerPresetDrawerConfig = {
  type?: "normal" | "pro";
  drawerType?: "normal" | "pro";
  slideType?: DrawerSlideType;
  metalBoxType?: DrawerMetalBoxType;
  softClose?: boolean;
  handleType?: DrawerHandleType;
  handlePosition?: DrawerHandlePosition;
  handleOffsetMm?: number;
  handleProfileId?: string;
  handleCenterDistanceMm?: number;
  handleOffsetXMm?: number;
  handleOffsetYMm?: number;
  handlePositionPercent?: number;
  material?: string;
  materialId?: string;
  allowPieceRotation?: boolean;
  /** Altura do corpo (mm) — relevante em modo custom. */
  bodyHeight?: number;
  metadata?: DrawerLayerMetadata;
};

/** Preset de gavetas guardado no projecto (catálogo). */
export type DrawerPreset = {
  id: string;
  nome: string;
  drawerCount: number;
  drawerHeightMode: DrawerHeightMode;
  drawerType?: "normal" | "pro";
  drawers: DrawerPresetDrawerConfig[];
};
