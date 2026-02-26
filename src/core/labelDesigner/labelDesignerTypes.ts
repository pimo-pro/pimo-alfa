/**
 * Tipos para o Etiqueta Designer.
 * Elementos editáveis: Projeto, Caixa, Peça, Madeira, Medidas, Número da Peça, QR, Logo.
 */

export type LabelElementType =
  | "projeto"
  | "caixa"
  | "peca"
  | "madeira"
  | "medidas"
  | "numero_peca"
  | "qr"
  | "logo";

export type AlignOption = "left" | "center" | "right";

export type QrErrorLevel = "L" | "M" | "Q" | "H";

export type LogoBlendMode = "normal" | "multiply" | "overlay";

export type LogoMaskShape = "none" | "circle" | "square" | "rounded";

export interface LabelElementBase {
  id: string;
  type: LabelElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  locked?: boolean;
}

export interface LabelTextElement extends LabelElementBase {
  type: Exclude<LabelElementType, "qr" | "logo">;
  fontSize: number;
  fontFamily: string;
  fontWeight?: "normal" | "bold";
  color: string;
  alignment: AlignOption;
  opacity: number;
  letterSpacing?: number;
  lineHeight?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidthMm?: number;
  borderRadiusMm?: number;
}

export interface LabelQrElement extends LabelElementBase {
  type: "qr";
  qrSizeMm: number;
  qrErrorLevel?: QrErrorLevel;
  qrMarginMm?: number;
  opacity: number;
}

export interface LabelLogoElement extends LabelElementBase {
  type: "logo";
  logoDataUrl: string;
  opacity: number;
  logoTintColor?: string;
  logoBlendMode?: LogoBlendMode;
  logoMaskShape?: LogoMaskShape;
}

export type LabelElement = LabelTextElement | LabelQrElement | LabelLogoElement;

export interface LabelDesignerConfig {
  widthMm: number;
  heightMm: number;
  orientation: "vertical" | "horizontal";
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  backgroundColor: string;
  borderColor: string;
  borderWidthMm: number;
  borderRadiusMm: number;
  elements: LabelElement[];
  logoDataUrl: string;
  /** Editor */
  snapToGrid?: boolean;
  gridSizeMm?: number;
  showGrid?: boolean;
  showSmartGuides?: boolean;
  showSafeArea?: boolean;
  safeAreaMm?: number;
  showBleed?: boolean;
  bleedMm?: number;
}

export interface LabelDesignerTemplate {
  id: string;
  name: string;
  config: LabelDesignerConfig;
}
