/** Tipos de painel industrial tratados como folha de porta (furação, veio, viewer 3D). */
export const INDUSTRIAL_DOOR_PANEL_TIPOS = [
  "porta_simples",
  "porta_dupla",
  "porta_correr",
  "porta_inferior",
  "porta_superior",
] as const;

export type IndustrialDoorPanelTipo = (typeof INDUSTRIAL_DOOR_PANEL_TIPOS)[number];

export function isIndustrialDoorPanelTipo(tipo: string): tipo is IndustrialDoorPanelTipo {
  return (INDUSTRIAL_DOOR_PANEL_TIPOS as readonly string[]).includes(tipo);
}

/** Folhas individuais (regras de dobradiça por altura/largura da peça). */
export function isIndustrialDoorLeafTipo(tipo: string): boolean {
  return (
    tipo === "porta_simples" ||
    tipo === "porta_correr" ||
    tipo === "porta_inferior" ||
    tipo === "porta_superior"
  );
}
