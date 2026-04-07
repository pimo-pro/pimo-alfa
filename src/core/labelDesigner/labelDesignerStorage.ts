import type { LabelDesignerConfig } from "./labelDesignerTypes";
import { defaultLabelDesignerConfig } from "./labelDesignerDefaults";

const LABEL_DESIGNER_STORAGE_KEY = "pimo_label_designer_config";

function toFiniteNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function loadLabelDesignerConfig(): LabelDesignerConfig {
  try {
    const raw = localStorage.getItem(LABEL_DESIGNER_STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultLabelDesignerConfig));
    const parsed = JSON.parse(raw) as LabelDesignerConfig;
    return normalizeConfig(parsed);
  } catch {
    return JSON.parse(JSON.stringify(defaultLabelDesignerConfig));
  }
}

export function saveLabelDesignerConfig(config: LabelDesignerConfig): void {
  localStorage.setItem(LABEL_DESIGNER_STORAGE_KEY, JSON.stringify(config));
}

export function hasStoredLabelDesignerConfig(): boolean {
  try {
    return Boolean(localStorage.getItem(LABEL_DESIGNER_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function exportLabelDesignerConfig(config: LabelDesignerConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importLabelDesignerConfig(json: string): LabelDesignerConfig | null {
  try {
    const parsed = JSON.parse(json) as LabelDesignerConfig;
    return normalizeConfig(parsed);
  } catch {
    return null;
  }
}

function normalizeConfig(c: Partial<LabelDesignerConfig>): LabelDesignerConfig {
  const def = defaultLabelDesignerConfig;
  return {
    widthMm: toFiniteNumber(c.widthMm, def.widthMm),
    heightMm: toFiniteNumber(c.heightMm, def.heightMm),
    orientation: c.orientation === "vertical" ? "vertical" : "horizontal",
    marginTopMm: toFiniteNumber(c.marginTopMm, def.marginTopMm),
    marginRightMm: toFiniteNumber(c.marginRightMm, def.marginRightMm),
    marginBottomMm: toFiniteNumber(c.marginBottomMm, def.marginBottomMm),
    marginLeftMm: toFiniteNumber(c.marginLeftMm, def.marginLeftMm),
    backgroundColor: typeof c.backgroundColor === "string" ? c.backgroundColor : def.backgroundColor,
    borderColor: typeof c.borderColor === "string" ? c.borderColor : def.borderColor,
    borderWidthMm: toFiniteNumber(c.borderWidthMm, def.borderWidthMm),
    borderRadiusMm: toFiniteNumber(c.borderRadiusMm, def.borderRadiusMm),
    logoDataUrl: typeof c.logoDataUrl === "string" ? c.logoDataUrl : def.logoDataUrl,
    snapToGrid: c.snapToGrid ?? def.snapToGrid,
    gridSizeMm: toFiniteNumber(c.gridSizeMm, def.gridSizeMm || 5),
    showGrid: c.showGrid ?? def.showGrid,
    showSmartGuides: c.showSmartGuides ?? def.showSmartGuides,
    showSafeArea: c.showSafeArea ?? def.showSafeArea,
    safeAreaMm: toFiniteNumber(c.safeAreaMm, def.safeAreaMm ?? 3),
    showBleed: c.showBleed ?? def.showBleed,
    bleedMm: toFiniteNumber(c.bleedMm, def.bleedMm ?? 3),
    elements: Array.isArray(c.elements)
      ? c.elements.map((e) => normalizeElement(e))
      : def.elements,
  };
}

function normalizeElement(e: Partial<LabelDesignerConfig["elements"][0]>): LabelDesignerConfig["elements"][0] {
  const base = {
    id: typeof e?.id === "string" ? e.id : `el-${Math.random().toString(36).slice(2, 9)}`,
    type: (e?.type ?? "projeto") as LabelDesignerConfig["elements"][0]["type"],
    x: toFiniteNumber(e?.x, 0),
    y: toFiniteNumber(e?.y, 0),
    width: toFiniteNumber(e?.width, 50),
    height: toFiniteNumber(e?.height, 8),
    rotation: toFiniteNumber(e?.rotation, 0),
    visible: e?.visible !== false,
  };
  if (base.type === "qr") {
    const qe = e as { qrSizeMm?: number; qrErrorLevel?: string; qrMarginMm?: number; opacity?: number };
    return {
      ...base,
      qrSizeMm: toFiniteNumber(qe?.qrSizeMm, base.width),
      qrErrorLevel: qe?.qrErrorLevel === "L" || qe?.qrErrorLevel === "Q" || qe?.qrErrorLevel === "H" ? qe.qrErrorLevel : "M",
      qrMarginMm: toFiniteNumber(qe?.qrMarginMm, 0),
      opacity: Math.max(0, Math.min(1, toFiniteNumber(qe?.opacity, 1))),
    } as LabelDesignerConfig["elements"][0];
  }
  if (base.type === "logo") {
    const le = e as { logoDataUrl?: string; logoTintColor?: string; logoBlendMode?: string; logoMaskShape?: string; opacity?: number };
    return {
      ...base,
      logoDataUrl: typeof le?.logoDataUrl === "string" ? le.logoDataUrl : "",
      logoTintColor: typeof le?.logoTintColor === "string" ? le.logoTintColor : undefined,
      logoBlendMode: le?.logoBlendMode === "multiply" || le?.logoBlendMode === "overlay" ? le.logoBlendMode : "normal",
      logoMaskShape: le?.logoMaskShape === "circle" || le?.logoMaskShape === "square" || le?.logoMaskShape === "rounded" ? le.logoMaskShape : "none",
      opacity: Math.max(0, Math.min(1, toFiniteNumber(le?.opacity, 1))),
    } as LabelDesignerConfig["elements"][0];
  }
  const te = e as {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    alignment?: string;
    opacity?: number;
    letterSpacing?: number;
    lineHeight?: number;
    backgroundColor?: string;
    borderColor?: string;
    borderWidthMm?: number;
    borderRadiusMm?: number;
  };
  return {
    ...base,
    fontSize: toFiniteNumber(te?.fontSize, 8),
    fontFamily: typeof te?.fontFamily === "string" ? te.fontFamily : "Helvetica",
    fontWeight: te?.fontWeight === "bold" ? "bold" : "normal",
    color: typeof te?.color === "string" ? te.color : "#111",
    alignment: (te?.alignment === "center" || te?.alignment === "right" ? te.alignment : "left") as "left" | "center" | "right",
    opacity: Math.max(0, Math.min(1, toFiniteNumber(te?.opacity, 1))),
    letterSpacing: toFiniteNumber(te?.letterSpacing, 0),
    lineHeight: toFiniteNumber(te?.lineHeight, 1.2),
    backgroundColor: typeof te?.backgroundColor === "string" ? te.backgroundColor : undefined,
    borderColor: typeof te?.borderColor === "string" ? te.borderColor : undefined,
    borderWidthMm: toFiniteNumber(te?.borderWidthMm, 0),
    borderRadiusMm: toFiniteNumber(te?.borderRadiusMm, 0),
  } as LabelDesignerConfig["elements"][0];
}
