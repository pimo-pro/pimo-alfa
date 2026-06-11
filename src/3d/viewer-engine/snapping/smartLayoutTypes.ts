import type * as THREE from "three";
import type { AutoLayoutPlan, AutoLayoutBridge, AutoStackShelvesOptions } from "../autoLayout/autoLayoutTypes";
import type { SmartAlignSnapContext } from "./smartAlignSnapTypes";

export type SmartLayoutRefineBox = (_boxId: string) => void;

export type SmartLayoutBridge = AutoLayoutBridge & {
  /** Callback opcional para preenchimento completo de cozinha (ProjectState). */
  runProjectRoomFill?: () => boolean;
  /** Hint semântico (ex.: "cozinha", "quarto"). */
  getRoomLabelHint?: () => string | undefined;
};

export type AutoWallFillOptions = {
  wallId: string | number;
  moduleBoxId: string;
  alignTop?: boolean;
  alignFront?: boolean;
  equalGaps?: boolean;
};

export type AutoDistributionOptions = {
  boxIds: string[];
  alignTop?: boolean;
  alignFront?: boolean;
  alignDepth?: boolean;
  useHistorySpacing?: boolean;
};

export type PredictiveLayoutPreview = {
  plan: AutoLayoutPlan;
  guides: Array<{ start: THREE.Vector3; end: THREE.Vector3 }>;
  label: string;
};

export type SmartLayoutEngineDeps = {
  getBridge: () => SmartLayoutBridge | null;
  refineBoxWithSmartSnap: SmartLayoutRefineBox;
  isSmartSnapEnabled: () => boolean;
  buildSnapContext: () => SmartAlignSnapContext;
  getBoxWorldPosition: (_boxId: string) => THREE.Vector3 | null;
  setBoxWorldPosition: (_boxId: string, _pos: THREE.Vector3) => void;
};

export type { AutoStackShelvesOptions };
