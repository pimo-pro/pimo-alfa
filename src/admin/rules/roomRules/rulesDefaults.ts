export type RoomRules = {
  wallOffsetMm: number;
  openingSnapMarginMm: number;
  cornerSnapEnabled: boolean;
  stackSnapEnabled: boolean;
  depthAlignToleranceMm: number;
  heightAlignToleranceMm: number;
};

export const ROOM_RULES_DEFAULTS: RoomRules = {
  "wallOffsetMm": 50,
  "openingSnapMarginMm": 120,
  "cornerSnapEnabled": true,
  "stackSnapEnabled": true,
  "depthAlignToleranceMm": 3,
  "heightAlignToleranceMm": 3
};
