import type { DesignVariantId, EnvironmentStyleId, VariationKind } from "./intelligentDesignerTypes";

export type IntentKind =
  | "applyDesign"
  | "variation"
  | "adjustment"
  | "explain"
  | "undo"
  | "showAlternative"
  | "optimizeWall"
  | "generateVariations"
  | "accept"
  | "reject"
  | "refine"
  | "applyStyle"
  | "manufacturingCheck"
  | "manufacturingFix"
  | "manufacturingReady"
  | "costCheck"
  | "costOptimize"
  | "costCompare"
  | "costSuggest"
  | "unknown";

export type ParsedIntent = {
  kind: IntentKind;
  designId?: DesignVariantId;
  variationKind?: VariationKind;
  targetWallId?: number;
  stylePreference?: "minimal" | "functional" | "storage";
  styleId?: EnvironmentStyleId;
  adjustment?: "flush" | "depth" | "height" | "symmetry" | "space";
  costTier?: "cheaper" | "premium" | "balanced";
  costReducePercent?: number;
  moduleKeyword?: string;
  confidence: number;
  raw: string;
};

const WALL_PATTERNS: Array<{ re: RegExp; wallId: number }> = [
  { re: /\b(frente|sul|front)\b/i, wallId: 0 },
  { re: /\b(direita|este|right)\b/i, wallId: 1 },
  { re: /\b(fundo|norte|back)\b/i, wallId: 2 },
  { re: /\b(esquerda|oeste|left)\b/i, wallId: 3 },
  { re: /\b(lateral)\b/i, wallId: 1 },
];

export function parseUserIntent(text: string): ParsedIntent {
  const raw = text.trim();
  const lower = normalize(raw);
  const base: ParsedIntent = { kind: "unknown", confidence: 0.4, raw };

  if (!lower) return base;

  if (matchesAny(lower, ["aceitar", "aplicar", "confirmar", "sim", "ok", "accept"])) {
    return { ...base, kind: "accept", confidence: 0.95 };
  }
  if (matchesAny(lower, ["rejeitar", "cancelar", "não", "nao", "reject"])) {
    return { ...base, kind: "reject", confidence: 0.95 };
  }
  if (matchesAny(lower, ["porquê", "porque", "por que", "explica", "explain", "razão", "razao"])) {
    return { ...base, kind: "explain", confidence: 0.9 };
  }
  if (matchesAny(lower, ["voltar", "anterior", "desfazer", "undo", "restaurar"])) {
    return { ...base, kind: "undo", confidence: 0.9 };
  }
  if (matchesAny(lower, ["outra opção", "outra opcao", "alternativa", "mostra outra", "show another"])) {
    return { ...base, kind: "showAlternative", confidence: 0.88 };
  }
  if (matchesAny(lower, ["gerar variações", "gerar variacoes", "variações", "variacoes", "generate variations"])) {
    return { ...base, kind: "generateVariations", confidence: 0.9 };
  }
  if (detectCostCheck(lower)) {
    return { ...base, kind: "costCheck", confidence: 0.9 };
  }
  const costTier = detectCostTier(lower);
  if (costTier) {
    const reducePct = detectCostReducePercent(lower);
    return {
      ...base,
      kind: reducePct != null ? "costOptimize" : "costSuggest",
      costTier,
      costReducePercent: reducePct,
      confidence: 0.9,
    };
  }
  if (detectCostCompare(lower)) {
    return { ...base, kind: "costCompare", confidence: 0.88 };
  }
  if (detectCostOptimize(lower)) {
    return { ...base, kind: "costOptimize", costReducePercent: detectCostReducePercent(lower), confidence: 0.9 };
  }
  if (matchesAny(lower, ["otimizar parede", "otimiza esta parede", "preencher parede", "wall fill"])) {
    return { ...base, kind: "optimizeWall", targetWallId: detectTargetWall(lower), confidence: 0.85 };
  }
  if (matchesAny(lower, ["refinar", "refine", "ajustar snap", "melhorar encaixe"])) {
    return { ...base, kind: "refine", confidence: 0.85 };
  }

  if (detectManufacturingReady(lower)) {
    return { ...base, kind: "manufacturingReady", confidence: 0.92 };
  }
  if (detectManufacturingFix(lower)) {
    return { ...base, kind: "manufacturingFix", confidence: 0.9 };
  }
  if (detectManufacturingCheck(lower)) {
    return { ...base, kind: "manufacturingCheck", confidence: 0.9 };
  }

  const designId = detectDesignId(lower);
  if (designId) {
    return { ...base, kind: "applyDesign", designId, confidence: 0.88 };
  }

  const variationKind = detectVariation(lower);
  if (variationKind) {
    return { ...base, kind: "variation", variationKind, confidence: 0.86 };
  }

  const environmentStyle = detectEnvironmentStyle(lower);
  if (environmentStyle) {
    return { ...base, kind: "applyStyle", styleId: environmentStyle, confidence: 0.9 };
  }

  const style = detectStylePreference(lower);
  if (style) {
    const id: DesignVariantId = style === "minimal" ? "B" : style === "storage" ? "C" : "A";
    return { ...base, kind: "applyDesign", designId: id, stylePreference: style, confidence: 0.82 };
  }

  const adjustment = detectAdjustment(lower);
  if (adjustment) {
    return {
      ...base,
      kind: "adjustment",
      adjustment,
      variationKind: adjustmentToVariation(adjustment),
      confidence: 0.8,
    };
  }

  const moduleKeyword = detectModuleKeyword(lower);
  if (moduleKeyword) {
    return {
      ...base,
      kind: "variation",
      variationKind: "moreSymmetry",
      moduleKeyword,
      confidence: 0.75,
    };
  }

  return base;
}

export function detectTargetWall(text: string): number | undefined {
  for (const p of WALL_PATTERNS) {
    if (p.re.test(text)) return p.wallId;
  }
  return undefined;
}

export function detectEnvironmentStyle(text: string): EnvironmentStyleId | undefined {
  if (matchesAny(text, ["japandi"])) return "japandi";
  if (matchesAny(text, ["escandinav", "scandinavian"])) return "scandinavian";
  if (matchesAny(text, ["nordic", "nordico", "nórdico"])) return "nordic";
  if (matchesAny(text, ["industrial"])) return "industrial";
  if (matchesAny(text, ["minimalist", "minimalista", "estilo minimal"])) return "minimalist";
  if (matchesAny(text, ["classic", "classico", "clássico"])) return "classic";
  if (matchesAny(text, ["luxury", "luxo", "luxu"])) return "luxury";
  if (matchesAny(text, ["modern", "moderno"])) return "modern";
  return undefined;
}

export function detectStyle(text: string): EnvironmentStyleId | undefined {
  return detectEnvironmentStyle(text);
}

export function detectManufacturingCheck(text: string): boolean {
  return matchesAny(text, [
    "verificar produção",
    "verificar producao",
    "verificar fabricação",
    "verificar fabricacao",
    "análise industrial",
    "analise industrial",
    "manufacturing check",
    "pronto para fabricar",
  ]);
}

export function detectManufacturingFix(text: string): boolean {
  return matchesAny(text, [
    "corrigir para fabricar",
    "corrigir produção",
    "corrigir producao",
    "otimiza para produção",
    "otimiza para producao",
    "auto fix",
    "correção automática",
    "correcao automatica",
    "aplicar correções",
    "aplicar correcoes",
  ]);
}

export function detectCostCheck(text: string): boolean {
  return matchesAny(text, [
    "quanto custa",
    "custo deste layout",
    "custo do layout",
    "estimativa de custo",
    "preço estimado",
    "preco estimado",
    "qual o custo",
  ]);
}

export function detectCostTier(text: string): ParsedIntent["costTier"] | undefined {
  if (matchesAny(text, ["mais barata", "mais barato", "mais económica", "mais economica", "versão barata", "versao barata"])) {
    return "cheaper";
  }
  if (matchesAny(text, ["mais premium", "versão premium", "versao premium", "mais luxo", "mais caro"])) {
    return "premium";
  }
  if (matchesAny(text, ["equilibrada", "equilibrado", "balanceada", "versão balanceada"])) {
    return "balanced";
  }
  return undefined;
}

export function detectCostCompare(text: string): boolean {
  return matchesAny(text, [
    "qual design é mais barato",
    "qual design e mais barato",
    "design mais barato",
    "qual estilo é mais económico",
    "qual estilo e mais economico",
    "estilo mais económico",
    "comparar custo",
    "comparar custos",
    "compare custo",
  ]);
}

export function detectCostOptimize(text: string): boolean {
  return matchesAny(text, [
    "reduz o custo",
    "reduzir custo",
    "reduz custo",
    "otimiza o custo",
    "otimiza custo",
    "otimizar custo",
    "otimiza o preço",
    "otimiza preco",
  ]);
}

export function detectCostReducePercent(text: string): number | undefined {
  const m = text.match(/(\d+)\s*%/);
  if (m) return Number(m[1]);
  if (matchesAny(text, ["reduzir custo", "reduz o custo"])) return 20;
  return undefined;
}

export function detectManufacturingReady(text: string): boolean {
  return matchesAny(text, [
    "está pronto para fabricar",
    "esta pronto para fabricar",
    "pronto para produção",
    "pronto para producao",
    "ready for production",
    "posso fabricar",
  ]);
}

export function detectStylePreference(text: string): ParsedIntent["stylePreference"] {
  if (matchesAny(text, ["simples", "clean", "menos módulos", "menos modulos"])) {
    return "minimal";
  }
  if (matchesAny(text, ["armazenamento", "storage", "mais módulos", "mais modulos", "otimizado", "espaço otimizado"])) {
    return "storage";
  }
  if (matchesAny(text, ["funcional", "ergonómico", "ergonomico", "trabalho", "cozinha eficiente"])) {
    return "functional";
  }
  return undefined;
}

export function detectAdjustment(text: string): ParsedIntent["adjustment"] {
  if (matchesAny(text, ["flush", "encostar", "colado", "frontal"])) return "flush";
  if (matchesAny(text, ["profundidade", "depth", "menos profundidade", "mais profundidade"])) return "depth";
  if (matchesAny(text, ["altura", "height", "mais alto", "mais baixo"])) return "height";
  if (matchesAny(text, ["simetria", "symmetry", "simétrico", "simetrico"])) return "symmetry";
  if (matchesAny(text, ["espaço", "espaco", "livre", "circulação", "circulacao"])) return "space";
  return undefined;
}

export function detectVariation(text: string): VariationKind | undefined {
  if (matchesAny(text, ["mais espaço", "mais espaco", "espaço livre", "more space", "free space"])) {
    return "moreFreeSpace";
  }
  if (matchesAny(text, ["mais armazenamento", "mais storage", "mais módulos", "more storage"])) {
    return "moreStorage";
  }
  if (matchesAny(text, ["mais simetria", "simetria", "more symmetry"])) {
    return "moreSymmetry";
  }
  if (matchesAny(text, ["mais profundidade", "more depth", "menos profundidade"])) {
    return "moreDepth";
  }
  return undefined;
}

function detectDesignId(text: string): DesignVariantId | undefined {
  if (/\b(design\s*)?b\b/i.test(text) || /versão\s*b/i.test(text) || /versao\s*b/i.test(text)) return "B";
  if (/\b(design\s*)?c\b/i.test(text) || /versão\s*c/i.test(text) || /versao\s*c/i.test(text)) return "C";
  if (/\b(design\s*)?a\b/i.test(text) || /versão\s*a/i.test(text) || /versao\s*a/i.test(text)) return "A";
  return undefined;
}

function detectModuleKeyword(text: string): string | undefined {
  const keys = ["frigorífico", "frigorifico", "fridge", "forno", "oven", "lavatório", "lavatorio", "sink"];
  for (const k of keys) {
    if (text.includes(k)) return k;
  }
  return undefined;
}

function adjustmentToVariation(adj: NonNullable<ParsedIntent["adjustment"]>): VariationKind | undefined {
  switch (adj) {
    case "space":
      return "moreFreeSpace";
    case "symmetry":
      return "moreSymmetry";
    case "depth":
      return "moreDepth";
    default:
      return undefined;
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function matchesAny(text: string, phrases: string[]): boolean {
  const n = normalize(text);
  return phrases.some((p) => n.includes(normalize(p)));
}
