import type { LabelDesignerConfig, LabelElement } from "./labelDesignerTypes";

const EL = (
  id: string,
  type: LabelElement["type"],
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<LabelElement>
): LabelElement => {
  const base = { id, type, x, y, width, height, rotation: 0, visible: true, locked: false };
  if (type === "qr") {
    return { ...base, qrSizeMm: width, qrErrorLevel: "M", qrMarginMm: 0, opacity: 1, ...extra } as LabelElement;
  }
  if (type === "logo") {
    return {
      ...base,
      logoDataUrl: "",
      opacity: 1,
      logoBlendMode: "normal",
      logoMaskShape: "none",
      ...extra,
    } as LabelElement;
  }
  return {
    ...base,
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: "normal",
    color: "#111111",
    alignment: "left",
    opacity: 1,
    letterSpacing: 0,
    lineHeight: 1.2,
    ...extra,
  } as LabelElement;
};

export const defaultLabelDesignerConfig: LabelDesignerConfig = {
  widthMm: 100,
  heightMm: 50,
  orientation: "horizontal",
  marginTopMm: 2,
  marginRightMm: 2,
  marginBottomMm: 2,
  marginLeftMm: 2,
  backgroundColor: "#ffffff",
  borderColor: "#888888",
  borderWidthMm: 0.5,
  borderRadiusMm: 1,
  logoDataUrl: "",
  snapToGrid: true,
  gridSizeMm: 5,
  showGrid: true,
  showSmartGuides: true,
  showSafeArea: false,
  safeAreaMm: 3,
  showBleed: false,
  bleedMm: 3,
  elements: [
    EL("projeto", "projeto", 4, 3, 55, 5, { fontSize: 7, fontFamily: "Helvetica" }),
    EL("caixa", "caixa", 4, 9, 55, 5, { fontSize: 7 }),
    EL("peca", "peca", 4, 15, 55, 5, { fontSize: 8, fontFamily: "Helvetica", fontWeight: "bold" }),
    EL("madeira", "madeira", 4, 21, 55, 5, { fontSize: 6 }),
    EL("medidas", "medidas", 4, 27, 55, 5, { fontSize: 6 }),
    EL("numero_peca", "numero_peca", 4, 34, 50, 10, {
      fontSize: 14,
      fontFamily: "Helvetica",
      fontWeight: "bold",
      color: "#dc2626",
    }),
    EL("qr", "qr", 62, 4, 32, 32, {}),
    EL("logo", "logo", 62, 38, 32, 8, {}),
  ],
};
