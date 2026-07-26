/**
 * dxfLayers.ts — Layers industriais DXF (Modelo B).
 */

export const EUROPEAN_DXF_LAYERS = [
  "CUT",
  "DRILLING",
  "DIMENSIONS",
  "FRONT",
  "SIDES",
  "BACK",
  "BOTTOM",
] as const;

export type EuropeanDxfLayerName = (typeof EUROPEAN_DXF_LAYERS)[number];

export type EuropeanDxfLayerDef = {
  name: EuropeanDxfLayerName;
  color: number;
  description: string;
};

export const EUROPEAN_DXF_LAYER_DEFS: EuropeanDxfLayerDef[] = [
  { name: "CUT", color: 7, description: "Contornos de corte" },
  { name: "DRILLING", color: 1, description: "Furos industriais" },
  { name: "DIMENSIONS", color: 3, description: "Medidas / cotas" },
  { name: "FRONT", color: 4, description: "Frente" },
  { name: "SIDES", color: 5, description: "Laterais" },
  { name: "BACK", color: 6, description: "Costa" },
  { name: "BOTTOM", color: 2, description: "Fundo" },
];

export function buildDxfLayerTable(): EuropeanDxfLayerDef[] {
  return EUROPEAN_DXF_LAYER_DEFS.map((l) => ({ ...l }));
}
