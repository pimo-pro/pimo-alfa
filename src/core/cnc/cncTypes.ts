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

/**
 * Operação de furação CNC.
 * tipo "vertical" = furação superior (top drilling) — única suportada no .tcn.
 * tipo "horizontal" = reservado; sem furação lateral no sistema atual.
 */
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
