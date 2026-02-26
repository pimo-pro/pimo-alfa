import type { LabelDesignerConfig } from "./labelDesignerTypes";
import { defaultLabelDesignerConfig } from "./labelDesignerDefaults";

const LABEL_DESIGNER_STORAGE_KEY = "pimo_label_designer_config";

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
    widthMm: Number(c.widthMm) || def.widthMm,
    heightMm: Number(c.heightMm) || def.heightMm,
    orientation: c.orientation === "vertical" ? "vertical" : "horizontal",
    marginTopMm: Number(c.marginTopMm) ?? def.marginTopMm,
    marginRightMm: Number(c.marginRightMm) ?? def.marginRightMm,
    marginBottomMm: Number(c.marginBottomMm) ?? def.marginBottomMm,
    marginLeftMm: Number(c.marginLeftMm) ?? def.marginLeftMm,
    backgroundColor: typeof c.backgroundColor === "string" ? c.backgroundColor : def.backgroundColor,
    borderColor: typeof c.borderColor === "string" ? c.borderColor : def.borderColor,
    borderWidthMm: Number(c.borderWidthMm) ?? def.borderWidthMm,
    borderRadiusMm: Number(c.borderRadiusMm) ?? def.borderRadiusMm,
    logoDataUrl: typeof c.logoDataUrl === "string" ? c.logoDataUrl : def.logoDataUrl,
    snapToGrid: c.snapToGrid ?? def.snapToGrid,
    gridSizeMm: Number(c.gridSizeMm) || def.gridSizeMm || 5,
    showGrid: c.showGrid ?? def.showGrid,
    showSmartGuides: c.showSmartGuides ?? def.showSmartGuides,
    showSafeArea: c.showSafeArea ?? def.showSafeArea,
    safeAreaMm: Number(c.safeAreaMm) ?? def.safeAreaMm ?? 3,
    showBleed: c.showBleed ?? def.showBleed,
    bleedMm: Number(c.bleedMm) ?? def.bleedMm ?? 3,
    elements: Array.isArray(c.elements)
      ? c.elements.map((e) => normalizeElement(e))
      : def.elements,
  };
}

function normalizeElement(e: Partial<LabelDesignerConfig["elements"][0]>): LabelDesignerConfig["elements"][0] {
  const base = {
    id: typeof e?.id === "string" ? e.id : `el-${Math.random().toString(36).slice(2, 9)}`,
    type: (e?.type ?? "projeto") as LabelDesignerConfig["elements"][0]["type"],
    x: Number(e?.x) ?? 0,
    y: Number(e?.y) ?? 0,
    width: Number(e?.width) ?? 50,
    height: Number(e?.height) ?? 8,
    rotation: Number(e?.rotation) ?? 0,
    visible: e?.visible !== false,
  };
  if (base.type === "qr") {
    const qe = e as { qrSizeMm?: number; qrErrorLevel?: string; qrMarginMm?: number; opacity?: number };
    return {
      ...base,
      qrSizeMm: Number(qe?.qrSizeMm) || base.width,
      qrErrorLevel: qe?.qrErrorLevel === "L" || qe?.qrErrorLevel === "Q" || qe?.qrErrorLevel === "H" ? qe.qrErrorLevel : "M",
      qrMarginMm: Number(qe?.qrMarginMm) ?? 0,
      opacity: Math.max(0, Math.min(1, Number(qe?.opacity) ?? 1)),
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
      opacity: Math.max(0, Math.min(1, Number(le?.opacity) ?? 1)),
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
    fontSize: Number(te?.fontSize) ?? 8,
    fontFamily: typeof te?.fontFamily === "string" ? te.fontFamily : "Helvetica",
    fontWeight: te?.fontWeight === "bold" ? "bold" : "normal",
    color: typeof te?.color === "string" ? te.color : "#111",
    alignment: (te?.alignment === "center" || te?.alignment === "right" ? te.alignment : "left") as "left" | "center" | "right",
    opacity: Math.max(0, Math.min(1, Number(te?.opacity) ?? 1)),
    letterSpacing: Number(te?.letterSpacing) ?? 0,
    lineHeight: Number(te?.lineHeight) ?? 1.2,
    backgroundColor: typeof te?.backgroundColor === "string" ? te.backgroundColor : undefined,
    borderColor: typeof te?.borderColor === "string" ? te.borderColor : undefined,
    borderWidthMm: Number(te?.borderWidthMm) ?? 0,
    borderRadiusMm: Number(te?.borderRadiusMm) ?? 0,
  } as LabelDesignerConfig["elements"][0];
}
