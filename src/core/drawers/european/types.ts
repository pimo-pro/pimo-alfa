/**
 * types.ts ù Tipos base do Sistema Europeu de Gavetas (Modelo B).
 *
 * SSOT de contratos industriais para Blum / Hettich / Grass.
 * Independente do Modelo A (src/core/drawers/* excepto european/).
 * Nao importa nem altera src/industrial/**.
 */

/** Marcas europeias suportadas nesta fase. */
export type EuropeanDrawerBrand = "Blum" | "Hettich" | "Grass";

/**
 * Identificadores canonico dos 4 sistemas oficiais.
 * Alinhados com pastas em ./models/
 */
export type EuropeanDrawerSystemId =
  | "blum-legrabox"
  | "blum-tandembox-antaro"
  | "hettich-innotech-atira"
  | "grass-nova-pro-scala";

/** Codigo comercial da altura (ex.: N, M, K, F, H / D, Cù). */
export type EuropeanHeightCode = string;

/**
 * Perfil de altura de sistema (ex.: Legrabox N = 66 mm).
 * Industrial: altura da caixa metalica / lateral do sistema, nao da frente.
 */
export type DrawerHeightProfile = {
  /** Codigo de catalogo (N/M/Kù). Vazio se o sistema so usa mm. */
  code: EuropeanHeightCode;
  /** Altura nominal do sistema (mm). */
  heightMm: number;
  /** Etiqueta UI (ex.: "N ù 66 mm"). */
  label: string;
};

/**
 * Perfil de profundidade de corredica / caixa.
 * Industrial: profundidade nominal do runner (mm).
 */
export type DrawerDepthProfile = {
  /** Profundidade nominal (mm). */
  nominalMm: number;
  /** Minimo aceite pelo sistema (mm). */
  minMm: number;
  /** Maximo aceite pelo sistema (mm). */
  maxMm: number;
  /** Passo tipico de catalogo (mm). */
  stepMm: number;
};

/**
 * Perfil lateral: folga para corredica / parede do sistema.
 * Industrial: body width = internalWidth - 2 * clearanceMm.
 */
export type DrawerSideProfile = {
  /** Folga por lado (mm) ù half of "caixa interna - 2xN". */
  clearanceMm: number;
  /** Espessura tipica da parede metalica (mm), informativo. */
  wallThicknessMm: number;
  /** Tipo de runner associado. */
  runnerFamily: string;
};

/**
 * Padrao de furacao do sistema (laterais do modulo + frente).
 * Industrial: sistema 32 mm + setback frontal tipico 37 mm.
 */
export type DrawerHolePattern = {
  /** Distancia do furo frontal a face frontal do painel (mm). */
  setbackFrontMm: number;
  /** Distancia do eixo da corredica ao fundo / base (mm). */
  bottomGapMm: number;
  /** Offset lateral tipico do furo na face do painel (mm). */
  lateralOffsetMm: number;
  /** Passo do sistema de furacao (mm) ù tipicamente 32. */
  systemPitchMm: number;
  /** Diametro dos furos de corredica (mm). */
  runnerHoleDiameterMm: number;
  /** Profundidade tipica do furo de corredica (mm). */
  runnerHoleDepthMm: number;
  /** Diametro dos furos de fixacao da frente (mm). */
  frontFixDiameterMm: number;
  /** Profundidade dos furos de fixacao da frente (mm). */
  frontFixDepthMm: number;
};

/**
 * Caixa geometrica de uma peca (mm), origem no sistema local da gaveta.
 */
export type DrawerPieceBox = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  thicknessMm: number;
  originXMm: number;
  originYMm: number;
  originZMm: number;
};

/**
 * Geometria completa de uma gaveta europeia.
 * Industrial Modelo B: frente madeira + laterais/costa/fundo madeira + corrediùa Hettich.
 */
export type DrawerGeometry = {
  systemId: EuropeanDrawerSystemId;
  front: DrawerPieceBox;
  /** Frente interna opcional (gav_fre_int). */
  frontInt?: DrawerPieceBox;
  bottom: DrawerPieceBox;
  leftSide: DrawerPieceBox;
  rightSide: DrawerPieceBox;
  back: DrawerPieceBox;
  /** Largura externa do corpo (caixa interna ? 14 mm). */
  externalWidthMm: number;
  /** Largura util interna do corpo entre laterais (mm). */
  internalWidthMm: number;
  /** Altura util do sistema (mm). */
  usefulHeightMm: number;
  /** Profundidade nominal do runner Hettich (mm). */
  runnerDepthMm: number;
  /** Profundidade do corpo sem frente = runner ? 10 (mm). */
  bodyDepthMm: number;
};

/**
 * Regras de montagem industrial.
 */
export type DrawerAssemblyRules = {
  /** Ordem recomendada de montagem. */
  order: string[];
  /** Tolerancia geral de montagem (mm). */
  toleranceMm: number;
  /** Folga frontal tipica frente ? modulo (mm por lado). */
  frontGapMm: number;
  /** Avisos industriais estaticos do sistema. */
  warnings: string[];
  softCloseSupported: boolean;
  pushOpenSupported: boolean;
};

/**
 * Linha de cutlist do Modelo B (antes do adapter para CutListItem).
 */
export type DrawerCutlistItem = {
  id: string;
  nome: string;
  /** Cùdigo industrial (gav_fren, gav_lat_dir, ù). */
  codigo?: string;
  quantidade: number;
  /** Largura / altura / profundidade da peca (mm). */
  larguraMm: number;
  alturaMm: number;
  profundidadeMm: number;
  espessuraMm: number;
  material: string;
  /** madeira | metal | fixacao | opcional */
  kind: "wood" | "metal" | "hardware" | "optional";
  tipo: string;
  observacoesIndustriais?: string;
  /** Label industrial completo BOX_codigo_NN. */
  industrialLabel?: string;
};

/**
 * Secao PDF dedicada ao Modelo B (nao altera pdfUnified do Modelo A directamente).
 */
export type DrawerPDFSection = {
  title: string;
  measureRows: Array<{ label: string; value: string }>;
  pieceRows: Array<{ nome: string; qty: string; dims: string; material: string }>;
  holeRows: Array<{ peca: string; x: string; y: string; d: string; depth: string; tipo: string }>;
  notes: string[];
  /** Descricao textual da vista explodida (coordenadas). */
  explodedViewNotes: string[];
};

/**
 * Furo gerado pelo Modelo B (coordenadas em mm no painel de referencia).
 */
export type EuropeanDrawerHole = {
  x: number;
  y: number;
  z: number;
  diameter: number;
  depth: number;
  /** corredica | fixacao_metalica | fundo | estrutural */
  holeType: "corredica" | "fixacao_metalica" | "fixacao_estrutural" | "fundo";
  face: "A" | "B";
  /** Referencia da peca: module_lat_esq | module_lat_dir | front | bottom */
  pieceRef: string;
};

/**
 * Modelo europeu completo (entrada do catalogo).
 */
export type DrawerEuropeanModel = {
  id: EuropeanDrawerSystemId;
  brand: EuropeanDrawerBrand;
  displayName: string;
  heights: DrawerHeightProfile[];
  depthsMm: number[];
  depthProfile: DrawerDepthProfile;
  side: DrawerSideProfile;
  holePattern: DrawerHolePattern;
  assembly: DrawerAssemblyRules;
  /** Espessura recomendada da frente (mm). */
  recommendedFrontThicknessMm: number;
  /** Espessura tipica do fundo (mm). */
  recommendedBottomThicknessMm: number;
  notes?: string;
};

/** Configuracao por caixa (persistida no WorkspaceBox). */
export type EuropeanDrawerBoxConfig = {
  systemId: EuropeanDrawerSystemId;
  heightMm: number;
  heightCode?: string;
  depthMm: number;
  softClose: boolean;
  pushOpen: boolean;
  /** Quantidade de gavetas (empilhadas). Se omitido, usa box.gavetas. */
  count?: number;
  /** Material independente da frente (canonical id). */
  frontMaterialId?: string;
  /** Overrides opcionais da frente externa (mm). */
  frontWidthMm?: number;
  frontHeightMm?: number;
  /** Gerar frente interna (gav_fre_int). */
  dualFront?: boolean;
};

/** Caixa de entrada para geracao (subset do WorkspaceBox). */
export type EuropeanDrawerBoxInput = {
  id: string;
  nome?: string;
  dimensoes: { largura: number; altura: number; profundidade: number };
  espessura: number;
  gavetas?: number;
  material?: string;
  /** Profundidade ˙til interna (mm) ó preferida para seleÁ„o Hettich. */
  profundidadeInternaUtilMm?: number;
  espessuraCosta?: number;
  costaAtiva?: boolean;
  europeanDrawerConfig?: EuropeanDrawerBoxConfig;
};

/** Resultado completo de generateEuropeanDrawer. */
export type EuropeanDrawerResult = {
  systemId: EuropeanDrawerSystemId;
  model: DrawerEuropeanModel;
  config: EuropeanDrawerBoxConfig;
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Descriùùes de auto-fix disponùveis (sem funùùes ù serializùvel). */
  autoFixes: Array<{ code: string; description: string }>;
  geometry: DrawerGeometry;
  holes: EuropeanDrawerHole[];
  cutlist: DrawerCutlistItem[];
  pdf: DrawerPDFSection;
  /** Dados para o viewer (meshes / animacao). */
  viewer: EuropeanDrawerViewerData;
  assembly: DrawerAssemblyRules;
};

/** Dados de renderizacao do viewer Modelo B. */
export type EuropeanDrawerViewerData = {
  drawers: Array<{
    id: string;
    index: number;
    geometry: DrawerGeometry;
    holes: EuropeanDrawerHole[];
    openProgress: number;
    maxPullMm: number;
  }>;
};
