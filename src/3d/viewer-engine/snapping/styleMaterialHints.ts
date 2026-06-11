import type { StyleId } from "./styleProfileEngine";

export type StyleMaterialHint = {
  styleId: StyleId;
  title: string;
  colors: string[];
  textures: string[];
  comboLabel: string;
  uiNote: string;
};

/** Sugestões visuais — somente leitura; não altera materiais do projeto. */
const HINTS: Record<StyleId, StyleMaterialHint> = {
  modern: {
    styleId: "modern",
    title: "Moderno",
    colors: ["Branco mate", "Cinza médio", "Preto grafite"],
    textures: ["Lacado mate", "Melamina lisa"],
    comboLabel: "Branco + cinza + puxadores embutidos",
    uiNote: "Superfícies lisas e contrastes subtis.",
  },
  nordic: {
    styleId: "nordic",
    title: "Nórdico",
    colors: ["Branco quente", "Madeira clara", "Bege natural"],
    textures: ["Carvalho claro", "Branco soft-touch"],
    comboLabel: "Branco + madeira clara + tons naturais",
    uiNote: "Leveza visual e calor natural.",
  },
  industrial: {
    styleId: "industrial",
    title: "Industrial",
    colors: ["Antracite", "Cimento", "Ferro escuro"],
    textures: ["Betão", "Metal escovado", "Madeira recuperada"],
    comboLabel: "Cinza escuro + madeira rústica + metal",
    uiNote: "Contraste forte e linhas rígidas.",
  },
  minimalist: {
    styleId: "minimalist",
    title: "Minimalista",
    colors: ["Branco puro", "Off-white", "Cinza claro"],
    textures: ["Superfície lisa sem veio"],
    comboLabel: "Monocromático claro + poucos puxadores",
    uiNote: "Menos elementos visuais, mais respiro.",
  },
  classic: {
    styleId: "classic",
    title: "Clássico",
    colors: ["Branco marfim", "Madeira média", "Dourado suave"],
    textures: ["Freixo", "Molduras discretas"],
    comboLabel: "Madeira média + branco marfim + simetria",
    uiNote: "Proporções equilibradas e molduras subtis.",
  },
  scandinavian: {
    styleId: "scandinavian",
    title: "Escandinavo",
    colors: ["Branco neve", "Pinho claro", "Azul acinzentado"],
    textures: ["Pinho", "Lacado branco"],
    comboLabel: "Branco + pinho + toques de cor fria",
    uiNote: "Funcional, luminoso e acolhedor.",
  },
  japandi: {
    styleId: "japandi",
    title: "Japandi",
    colors: ["Bege areia", "Carvalho natural", "Preto suave"],
    textures: ["Madeira natural", "Fibra têxtil"],
    comboLabel: "Madeira natural + neutros quentes + equilíbrio",
    uiNote: "Fusão minimalista japonesa e escandinava.",
  },
  luxury: {
    styleId: "luxury",
    title: "Luxo",
    colors: ["Nogueira escura", "Champagne", "Preto profundo"],
    textures: ["Folheado nobre", "Lacado alto brilho"],
    comboLabel: "Madeira nobre + detalhes metálicos + simetria",
    uiNote: "Materiais premium e ritmo visual contido.",
  },
};

export function getMaterialHintsForStyle(styleId: StyleId): StyleMaterialHint {
  return { ...HINTS[styleId] };
}

export function formatMaterialHintForUi(styleId: StyleId): string {
  const h = HINTS[styleId];
  return `${h.comboLabel}\nCores: ${h.colors.join(", ")}\nTexturas: ${h.textures.join(", ")}\n(${h.uiNote})`;
}

export function listAllStyleMaterialHints(): StyleMaterialHint[] {
  return Object.values(HINTS);
}
