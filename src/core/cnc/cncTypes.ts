/**
 * Tipos CNC (TCN + KDT).
 */

export type CncPanel = {
  largura_mm: number;
  altura_mm: number;
  espessura_mm: number;
  materialId?: string;
};

export type CncCutOperation = {
  pontos: Array<{ x: number; y: number; z: number }>;
  velocidade?: number;
  ferramenta?: string;
};

export type CncDrillOperation = {
  x: number;
  y: number;
  z: number;
  diametro: number;
  profundidade: number;
  tipo: "vertical" | "horizontal";
};

export type CncExportFile = {
  filenameBase: string;
  panelIndex: number;
  thicknessMm: number;
  tcn: string;
  kdt: string;
};

export type CncExportResult = {
  files: CncExportFile[];
};
