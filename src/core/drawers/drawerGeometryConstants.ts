/** Folga vertical fixa entre frentes consecutivas no mesmo módulo (mm). */

export const DRAWER_VERTICAL_GAP_MM = 4;



/** Folga lateral padrão da frente (mm por lado) — espelha settings.gavetaFolgaFrenteMm. */

export const DRAWER_FRONT_LATERAL_GAP_MM = 1;



/**
 * Fração da altura da frente deixada livre no topo (quarto superior vazio).
 * Laterais/costa = frente × (1 − ratio); base das laterais elevada 15–22 mm acima da frente.
 */
export const DRAWER_SIDE_TOP_CLEARANCE_RATIO = 0.25;

/** Altura útil das laterais em relação à frente (75%). */
export const DRAWER_SIDE_HEIGHT_RATIO = 1 - DRAWER_SIDE_TOP_CLEARANCE_RATIO;

/** Elevação da base das laterais/costa em relação à base da frente (mm). */
export const DRAWER_SIDE_BASE_ELEVATION_MIN_MM = 15;
export const DRAWER_SIDE_BASE_ELEVATION_MAX_MM = 22;
export const DRAWER_SIDE_BASE_ELEVATION_MM = 17;

/**
 * Frente do gaveta inferior: distância da base da frente à borda inferior do módulo (mm).
 * 0 = flush; 1–2 = folga industrial opcional. Não altera altura da frente nem furos.
 */
export const DRAWER_LOWEST_FRONT_BOTTOM_FROM_MODULE_BASE_MM = 0;

/**
 * Gaveta inferior: corpo (laterais/fundo) 18.5 mm acima da base do módulo.
 * Com `frontBottom(lowest)=0`, isto é também a elevação das laterais vs base da frente.
 * Os furos da frente usam medidas fixas e NÃO dependem deste valor.
 */
export const DRAWER_LOWEST_BODY_ABOVE_MODULE_BASE_MM = 18.5;

/**
 * Furação industrial da frente do gaveta inferior (`stackRole = "lowest"`).
 * Legado / referência XML_COMPLITO: Y = W−56.5, X inset = 12.
 * Produção actual: mesmo padrão das frentes 2/3 via `computeDrawerFrenteExtStructuralHoles`
 * (rasgo elev+sideH−13; cavilhas elev+15 / elev+sideH−35).
 * `computeDrawerLowestFrenteExtFixedHoles` mantém o golden legado para regressão.
 * `DRAWER_LOWEST_FRONT_DOWEL_FROM_TOP_MM` (73.5) é legado — não usar para gerar furos.
 */
export const DRAWER_LOWEST_FRONT_GROOVE_FROM_TOP_MM = 56.5;
/** @deprecated Não usar na geração — substituído pelo pairing elev+Y_aresta. */
export const DRAWER_LOWEST_FRONT_DOWEL_FROM_TOP_MM = 73.5;
export const DRAWER_LOWEST_FRONT_GROOVE_X_INSET_MM = 12;
export const DRAWER_LOWEST_FRONT_DOWEL_X_INSET_MM = 33;

/** @deprecated Alias — valor é “desde o topo”; usar DRAWER_LOWEST_FRONT_GROOVE_FROM_TOP_MM. */
export const DRAWER_LOWEST_FRONT_GROOVE_Y_MM = DRAWER_LOWEST_FRONT_GROOVE_FROM_TOP_MM;
/** @deprecated Alias — valor é “desde o topo”; usar DRAWER_LOWEST_FRONT_DOWEL_FROM_TOP_MM. */
export const DRAWER_LOWEST_FRONT_DOWEL_Y_MM = DRAWER_LOWEST_FRONT_DOWEL_FROM_TOP_MM;

/**
 * Rasgos inferiores dos laterais (LAT_ESQ / LAT_DIR) — SSOT industrial permanente.
 * Y / Width / Depth são fixos relativos a W; só o comprimento CAD adapta-se a L
 * (BeginX=L+overcut … EndX=−overcut). Independente da frente / stack.
 *
 * Ref: GAVETA 1/XML_COMPLITO/caixa_1_gav_lat_esq_drill.xml
 */
/** Rasgo 1 (mais próximo da borda superior): Y=W−13, Width=13, Depth=3. */
export const DRAWER_LAT_GROOVE_TOP_FROM_TOP_MM = 13;
export const DRAWER_LAT_GROOVE_TOP_WIDTH_MM = 13;
export const DRAWER_LAT_GROOVE_TOP_DEPTH_MM = 3;
/** Rasgo 2 (mais acima do fundo / mais baixo no painel): Y=W−23, Width=11, Depth=10. */
export const DRAWER_LAT_GROOVE_BOTTOM_FROM_TOP_MM = 23;
export const DRAWER_LAT_GROOVE_BOTTOM_WIDTH_MM = 11;
export const DRAWER_LAT_GROOVE_BOTTOM_DEPTH_MM = 10;
/** Sangria CAD: BeginX=L+10, EndX=−10. */
export const DRAWER_LAT_GROOVE_OVERCUT_MM = 10;
/** Correction KDT nos rasgos laterais. */
export const DRAWER_LAT_GROOVE_CORRECTION = 2;
/** Ferramenta KDT dos rasgos laterais. */
export const DRAWER_LAT_GROOVE_TOOL_NAME = "FRESA_DESBASTE_10MM";

/**
 * Costa da gaveta mais baixa que as laterais (assenta sobre o fundo).
 * `altura_gav_costa = altura_gav_lateral − 23`.
 */
export const DRAWER_COSTA_HEIGHT_BELOW_LATERAL_MM = 23;

/** Entrada do fundo no rasgo da frente (mm). */
export const DRAWER_BOTTOM_FRONT_ENTRY_MM = 10;
/** Entrada do fundo no rasgo de cada lateral (mm). */
export const DRAWER_BOTTOM_SIDE_ENTRY_MM = 10;
/**
 * Profundidade do rasgo na frente: espessura do fundo + 1 mm.
 * Ex.: fundo 10 → rasgo 11.
 */
export const DRAWER_BOTTOM_GROOVE_DEPTH_EXTRA_MM = 1;
/** Largura do rasgo do fundo nas laterais / frente (mm). */
export const DRAWER_BOTTOM_GROOVE_WIDTH_MM = 13;
/** Distância do topo da lateral ao eixo do rasgo (mm). */
export const DRAWER_BOTTOM_GROOVE_Y_FROM_TOP_MM = 13;

/**
 * @deprecated Usar `DRAWER_SIDE_TOP_CLEARANCE_RATIO` — delta fixo substituído por 25% proporcional.
 */
export const DRAWER_BODY_HEIGHT_BELOW_FRONT_MM = 12;


