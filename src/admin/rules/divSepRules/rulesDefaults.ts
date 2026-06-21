export type CavilhaLengthRule = {
  minMm: number;
  maxMm: number;
  offsetFromEdgeMm: number;
};

export type DivSepRules = {
  cavilhaLengthRules: CavilhaLengthRule[];
  cavilhaDiameterMm: number;
  cavilhaDepthMm: number;
  parafusoDistanceFromCavilhaMm: number;
  /** Opções futuras: furos de prateleira */
  enableShelfHoles: boolean;
  /** Opções futuras: combinações DIV+SEP */
  enableDivSepCombinations: boolean;
};

export const DIV_SEP_RULES_DEFAULTS: DivSepRules = {
  cavilhaLengthRules: [
    { minMm: 60, maxMm: 99, offsetFromEdgeMm: 15 },
    { minMm: 100, maxMm: 150, offsetFromEdgeMm: 30 },
    { minMm: 151, maxMm: 199, offsetFromEdgeMm: 40 },
    { minMm: 200, maxMm: 1200, offsetFromEdgeMm: 60 },
  ],
  cavilhaDiameterMm: 10,
  cavilhaDepthMm: 13,
  parafusoDistanceFromCavilhaMm: 30,
  enableShelfHoles: false,
  enableDivSepCombinations: false,
};
