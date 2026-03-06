export type MdfMaterial = {
  id: string;
  nome: string;
  corBase: string;
  texturas: {
    map?: string;
    normal?: string;
    roughness?: string;
    ao?: string;
  };
  repeatPadrao: { x: number; y: number };
  pbrRepeat: { x: number; y: number };
  fallback: {
    usarCorBase: boolean;
    usarNormalNeutro: boolean;
    usarAoNeutro: boolean;
    roughnessPadrao: number;
    metalnessPadrao: number;
  };
};

export const mdfLibrary: MdfMaterial[] = [
  {
    id: "mdf-clarus",
    nome: "MDF Clarus",
    corBase: "#d1b08a",
    texturas: {
      map: "/textures/mdf/clarus/base.jpg",
      normal: "/textures/mdf/clarus/normal.jpg",
      roughness: "/textures/mdf/clarus/roughness.jpg",
      ao: "/textures/mdf/clarus/ao.jpg",
    },
    repeatPadrao: { x: 1, y: 1 },
    pbrRepeat: { x: 2, y: 2 },
    fallback: {
      usarCorBase: true,
      usarNormalNeutro: true,
      usarAoNeutro: true,
      roughnessPadrao: 0.82,
      metalnessPadrao: 0,
    },
  },
  {
    id: "mdf-noce",
    nome: "MDF Noce",
    corBase: "#8a6a4f",
    texturas: {
      map: "/textures/mdf/noce/base.jpg",
      normal: "/textures/mdf/noce/normal.jpg",
      roughness: "/textures/mdf/noce/roughness.jpg",
      ao: "/textures/mdf/noce/ao.jpg",
    },
    repeatPadrao: { x: 1, y: 1 },
    pbrRepeat: { x: 2, y: 2 },
    fallback: {
      usarCorBase: true,
      usarNormalNeutro: true,
      usarAoNeutro: true,
      roughnessPadrao: 0.82,
      metalnessPadrao: 0,
    },
  },
  {
    id: "mdf-preto",
    nome: "MDF Preto",
    corBase: "#2b2b2b",
    texturas: {
      map: "/textures/mdf/preto/base.jpg",
      normal: "/textures/mdf/preto/normal.jpg",
      roughness: "/textures/mdf/preto/roughness.jpg",
      ao: "/textures/mdf/preto/ao.jpg",
    },
    repeatPadrao: { x: 1, y: 1 },
    pbrRepeat: { x: 2, y: 2 },
    fallback: {
      usarCorBase: true,
      usarNormalNeutro: true,
      usarAoNeutro: true,
      roughnessPadrao: 0.82,
      metalnessPadrao: 0,
    },
  },
  {
    id: "mdf-branco",
    nome: "MDF Branco",
    corBase: "#ffffff",
    texturas: {
      map: "/textures/mdf/branco/base.jpg",
      normal: "/textures/mdf/branco/normal.jpg",
      roughness: "/textures/mdf/branco/roughness.jpg",
      ao: "/textures/mdf/branco/ao.jpg",
    },
    repeatPadrao: { x: 1, y: 1 },
    pbrRepeat: { x: 1, y: 1 },
    fallback: {
      usarCorBase: true,
      usarNormalNeutro: true,
      usarAoNeutro: true,
      roughnessPadrao: 0.82,
      metalnessPadrao: 0,
    },
  },
];
