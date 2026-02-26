import type { LabelDesignerConfig, LabelDesignerTemplate } from "./labelDesignerTypes";
import { defaultLabelDesignerConfig } from "./labelDesignerDefaults";

const EL = (
  id: string,
  type: LabelDesignerConfig["elements"][0]["type"],
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Record<string, unknown>
): LabelDesignerConfig["elements"][0] => {
  const base = { id, type, x, y, width: w, height: h, rotation: 0, visible: true, locked: false };
  if (type === "qr") {
    return { ...base, qrSizeMm: w, qrErrorLevel: "M", qrMarginMm: 0, opacity: 1, ...extra } as LabelDesignerConfig["elements"][0];
  }
  if (type === "logo") {
    return { ...base, logoDataUrl: "", opacity: 1, logoBlendMode: "normal", logoMaskShape: "none", ...extra } as LabelDesignerConfig["elements"][0];
  }
  return {
    ...base,
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: "normal",
    color: "#111",
    alignment: "left",
    opacity: 1,
    letterSpacing: 0,
    lineHeight: 1.2,
    ...extra,
  } as LabelDesignerConfig["elements"][0];
};

const templateA: LabelDesignerConfig = {
  ...defaultLabelDesignerConfig,
  widthMm: 100,
  heightMm: 50,
  elements: [
    EL("projeto", "projeto", 4, 3, 55, 5, { fontSize: 7 }),
    EL("caixa", "caixa", 4, 9, 55, 5, { fontSize: 7 }),
    EL("peca", "peca", 4, 15, 55, 5, { fontSize: 8, fontWeight: "bold" }),
    EL("madeira", "madeira", 4, 21, 55, 5, { fontSize: 6 }),
    EL("medidas", "medidas", 4, 27, 55, 5, { fontSize: 6 }),
    EL("numero_peca", "numero_peca", 4, 34, 50, 10, { fontSize: 14, fontWeight: "bold", color: "#dc2626" }),
    EL("qr", "qr", 62, 4, 32, 32, {}),
    EL("logo", "logo", 62, 38, 32, 8, {}),
  ],
};

const templateB: LabelDesignerConfig = {
  ...defaultLabelDesignerConfig,
  widthMm: 120,
  heightMm: 60,
  elements: [
    EL("logo", "logo", 4, 4, 40, 20, {}),
    EL("projeto", "projeto", 4, 26, 110, 5, { fontSize: 8 }),
    EL("caixa", "caixa", 4, 32, 110, 5, { fontSize: 7 }),
    EL("peca", "peca", 4, 38, 110, 6, { fontSize: 9, fontWeight: "bold" }),
    EL("madeira", "madeira", 4, 45, 110, 5, { fontSize: 6 }),
    EL("medidas", "medidas", 4, 51, 110, 5, { fontSize: 6 }),
    EL("numero_peca", "numero_peca", 4, 52, 50, 6, { fontSize: 12, fontWeight: "bold", color: "#dc2626" }),
    EL("qr", "qr", 95, 4, 22, 22, {}),
  ],
};

const templateC: LabelDesignerConfig = {
  ...defaultLabelDesignerConfig,
  widthMm: 80,
  heightMm: 80,
  orientation: "vertical",
  elements: [
    EL("qr", "qr", 24, 4, 32, 32, {}),
    EL("projeto", "projeto", 4, 40, 72, 5, { fontSize: 6, alignment: "center" }),
    EL("caixa", "caixa", 4, 46, 72, 5, { fontSize: 6, alignment: "center" }),
    EL("peca", "peca", 4, 52, 72, 6, { fontSize: 7, fontWeight: "bold", alignment: "center" }),
    EL("numero_peca", "numero_peca", 4, 60, 72, 14, { fontSize: 16, fontWeight: "bold", color: "#dc2626", alignment: "center" }),
  ],
};

export const builtinTemplates: LabelDesignerTemplate[] = [
  { id: "template-a", name: "Template A (simples)", config: templateA },
  { id: "template-b", name: "Template B (logo grande)", config: templateB },
  { id: "template-c", name: "Template C (QR central)", config: templateC },
];

const TEMPLATES_STORAGE_KEY = "pimo_label_designer_templates";

export function loadCustomTemplates(): LabelDesignerTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: LabelDesignerTemplate[]): void {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}
