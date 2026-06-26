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
 * @deprecated Usar `DRAWER_SIDE_TOP_CLEARANCE_RATIO` — delta fixo substituído por 25% proporcional.
 */
export const DRAWER_BODY_HEIGHT_BELOW_FRONT_MM = 12;


