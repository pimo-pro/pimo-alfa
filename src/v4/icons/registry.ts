import type { FC } from "react";
import type { V4IconName, V4IconProps } from "./types";

import {
  IconNavFurniture,
  IconNavProject,
  IconNavMaterials,
  IconNavFabrication,
  IconNavTracking,
  IconNavSettings,
} from "./groups/navigation";

import {
  IconActionUndo,
  IconActionRedo,
  IconActionSend,
  IconActionSelect,
  IconActionMove,
  IconActionRotate,
  IconActionCamera,
  IconActionRuler,
  IconActionGrid,
  IconActionRoom,
  IconActionOrbit,
  IconActionDuplicate,
  IconActionDelete,
  IconActionClose,
  IconActionCheck,
  IconActionUpload,
  IconActionDownload,
  IconActionSearch,
  IconActionPlus,
  IconChevronRight,
  IconChevronDown,
  IconMenu,
} from "./groups/actions";

import {
  IconMfgCutList,
  IconMfgQRCode,
  IconMfgCNC,
  IconMfgBlueprint,
  IconMfgWood,
  IconMfgHardware,
} from "./groups/manufacturing";

import {
  IconStatusWarning,
  IconStatusInfo,
  IconStatusError,
  IconLogo,
} from "./groups/status";

export const v4IconRegistry: Record<V4IconName, FC<V4IconProps>> = {
  // Navigation
  furniture:    IconNavFurniture,
  project:      IconNavProject,
  materials:    IconNavMaterials,
  fabrication:  IconNavFabrication,
  tracking:     IconNavTracking,
  settings:     IconNavSettings,
  // Viewer tools
  select:       IconActionSelect,
  move:         IconActionMove,
  rotate:       IconActionRotate,
  camera:       IconActionCamera,
  orbit:        IconActionOrbit,
  ruler:        IconActionRuler,
  grid:         IconActionGrid,
  room:         IconActionRoom,
  // Actions
  undo:         IconActionUndo,
  redo:         IconActionRedo,
  send:         IconActionSend,
  duplicate:    IconActionDuplicate,
  delete:       IconActionDelete,
  close:        IconActionClose,
  check:        IconActionCheck,
  upload:       IconActionUpload,
  download:     IconActionDownload,
  // UI
  chevronRight: IconChevronRight,
  chevronDown:  IconChevronDown,
  menu:         IconMenu,
  search:       IconActionSearch,
  plus:         IconActionPlus,
  logo:         IconLogo,
  // Manufacturing
  cutlist:      IconMfgCutList,
  qrcode:       IconMfgQRCode,
  cnc:          IconMfgCNC,
  blueprint:    IconMfgBlueprint,
  wood:         IconMfgWood,
  hardware:     IconMfgHardware,
  // (blueprint used for both nav and mfg)
  alertWarning: IconStatusWarning,
  alertInfo:    IconStatusInfo,
  alertError:   IconStatusError,
};
