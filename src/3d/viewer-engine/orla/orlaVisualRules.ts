import * as THREE from "three";
import type { OrlaSideId } from "../../../core/orla/orlaTypes";
import { getSettings } from "../../../core/settings/settingsService";

/** Arestas configuráveis na UI e nas regras visuais. */
export type OrlaVisualEdgeId = "top" | "bottom" | "left" | "right" | "front" | "back";

export type OrlaVisualRuleKey =
  | "frontDoor"
  | "gavetaFrente"
  | "gavetaLateral"
  | "gavetaCosta"
  | "gavetaFundo"
  | "prateleira"
  | "lateral"
  | "tampo"
  | "base"
  | "fundo"
  | "divisoria"
  | "costa";

export type OrlaVisualRulesMap = Record<OrlaVisualRuleKey, OrlaVisualEdgeId[]>;

export const ORLA_VISUAL_EDGE_IDS: OrlaVisualEdgeId[] = [
  "top",
  "bottom",
  "left",
  "right",
  "front",
  "back",
];

/** Regras oficiais (versão utilizador) — defaults do sistema. */
export const DEFAULT_ORLA_VISUAL_RULES: OrlaVisualRulesMap = {
  frontDoor: ["top", "bottom", "left", "right"],
  gavetaFrente: ["top", "bottom", "left", "right"],
  gavetaLateral: ["top"],
  gavetaCosta: ["top"],
  gavetaFundo: [],
  prateleira: ["top", "bottom", "left", "right"],
  lateral: ["front", "back"],
  tampo: ["top", "bottom", "left", "right"],
  base: ["front"],
  fundo: ["top", "bottom", "left", "right"],
  divisoria: ["front"],
  costa: [],
};

export const ORLA_RULE_KEY_LABELS: Record<OrlaVisualRuleKey, string> = {
  frontDoor: "Porta (frente)",
  gavetaFrente: "Gaveta — frente",
  gavetaLateral: "Gaveta — lateral",
  gavetaCosta: "Gaveta — costa",
  gavetaFundo: "Gaveta — fundo",
  prateleira: "Prateleira",
  lateral: "Lateral",
  tampo: "Tampo",
  base: "Base",
  fundo: "Fundo",
  divisoria: "Divisória",
  costa: "Costa",
};

export const ORLA_EDGE_LABELS: Record<OrlaVisualEdgeId, string> = {
  top: "Topo",
  bottom: "Baixo",
  left: "Esquerda",
  right: "Direita",
  front: "Frente",
  back: "Trás",
};

const VALID_EDGE_SET = new Set<string>(ORLA_VISUAL_EDGE_IDS);
const RULE_KEYS = Object.keys(DEFAULT_ORLA_VISUAL_RULES) as OrlaVisualRuleKey[];

function isOrlaVisualEdgeId(value: unknown): value is OrlaVisualEdgeId {
  return typeof value === "string" && VALID_EDGE_SET.has(value);
}

/** Alias pedido na spec — mesma função que getSettings(). */
export function getSystemSettings() {
  return getSettings();
}

export function sanitizeOrlaRulesInput(
  input: unknown
): Partial<Record<OrlaVisualRuleKey, OrlaVisualEdgeId[]>> {
  if (!input || typeof input !== "object") return {};
  const out: Partial<Record<OrlaVisualRuleKey, OrlaVisualEdgeId[]>> = {};
  const raw = input as Record<string, unknown>;
  for (const key of RULE_KEYS) {
    const candidate = raw[key];
    if (Array.isArray(candidate)) {
      out[key] = candidate.filter(isOrlaVisualEdgeId);
    }
  }
  return out;
}

export function resolveEffectiveOrlaVisualRules(
  stored?: Partial<Record<string, OrlaVisualEdgeId[]>> | null
): OrlaVisualRulesMap {
  const result: OrlaVisualRulesMap = { ...DEFAULT_ORLA_VISUAL_RULES };
  if (!stored || typeof stored !== "object") return result;

  for (const key of RULE_KEYS) {
    const candidate = stored[key];
    if (Array.isArray(candidate)) {
      result[key] = candidate.filter(isOrlaVisualEdgeId);
    }
  }
  return result;
}

export function getActiveOrlaVisualRules(): OrlaVisualRulesMap {
  const settings = getSettings();
  return resolveEffectiveOrlaVisualRules(settings.orlaRules);
}

export function getOrlaEdgesForVisualRule(
  ruleKey: string,
  rules?: OrlaVisualRulesMap
): OrlaVisualEdgeId[] {
  const map = rules ?? getActiveOrlaVisualRules();
  if (ruleKey in map) {
    return map[ruleKey as OrlaVisualRuleKey] ?? [];
  }
  return [];
}

/** Resolve a chave de regra a partir dos metadados do mesh 3D. */
export function resolveOrlaVisualRuleKey(mesh: THREE.Mesh): OrlaVisualRuleKey | null {
  const ud = mesh.userData;
  const name = typeof mesh.name === "string" ? mesh.name : "";

  if (ud.doorLayerId != null && String(ud.doorLayerId).trim().length > 0) {
    return "frontDoor";
  }

  const drawerPart = ud.drawerPart as string | undefined;
  if (drawerPart === "front") return "gavetaFrente";
  if (drawerPart === "left-side" || drawerPart === "right-side") return "gavetaLateral";
  if (drawerPart === "back") return "gavetaCosta";
  if (drawerPart === "bottom") return "gavetaFundo";

  if (typeof ud.shelfIndex === "number" || name.startsWith("shelf-")) {
    return "prateleira";
  }

  if (name.startsWith("wardrobe-divider-")) {
    return "divisoria";
  }

  if (name.includes("fundo")) {
    return "fundo";
  }

  const panelType = ud.panelType as string | undefined;
  if (panelType === "left" || panelType === "right") return "lateral";
  if (panelType === "top") return "tampo";
  if (panelType === "bottom") return "base";
  if (panelType === "back") return "costa";
  if (panelType === "front") return "frontDoor";

  return null;
}

/** Orientação geométrica para posicionar fitas no bounding box local. */
export function resolveGeometryPanelType(mesh: THREE.Mesh): string {
  const ud = mesh.userData;
  const name = typeof mesh.name === "string" ? mesh.name : "";

  if (typeof ud.panelType === "string" && ud.panelType.length > 0) {
    return ud.panelType;
  }
  if (ud.doorLayerId != null) return "front";
  if (ud.drawerPart === "front") return "front";
  if (ud.drawerPart === "left-side") return "left";
  if (ud.drawerPart === "right-side") return "right";
  if (ud.drawerPart === "back") return "back";
  if (ud.drawerPart === "bottom") return "bottom";
  if (typeof ud.shelfIndex === "number" || name.startsWith("shelf-")) return "top";
  if (name.startsWith("wardrobe-divider-horizontal")) return "top";
  if (name.startsWith("wardrobe-divider-vertical")) return "left";
  return "top";
}

/**
 * Mapeia aresta visual → lado lógico Orla (preset industrial por peça).
 * Apenas visual; não altera orlaCalculator.
 */
export function resolveDomainSideForVisualEdge(
  geometryPanelType: string,
  visualEdge: OrlaVisualEdgeId
): OrlaSideId {
  if (
    visualEdge === "front" ||
    visualEdge === "back" ||
    visualEdge === "left" ||
    visualEdge === "right"
  ) {
    return visualEdge;
  }

  switch (geometryPanelType) {
    case "front":
      if (visualEdge === "top") return "front";
      if (visualEdge === "bottom") return "back";
      if (visualEdge === "left") return "left";
      if (visualEdge === "right") return "right";
      break;
    case "top":
    case "bottom":
      if (visualEdge === "top") return "front";
      if (visualEdge === "bottom") return "back";
      if (visualEdge === "left") return "left";
      if (visualEdge === "right") return "right";
      break;
    case "left":
    case "right":
      if (visualEdge === "top") return "left";
      if (visualEdge === "bottom") return "right";
      if (visualEdge === "front") return "front";
      if (visualEdge === "back") return "back";
      break;
    case "back":
      if (visualEdge === "top") return "front";
      if (visualEdge === "bottom") return "back";
      if (visualEdge === "left") return "left";
      if (visualEdge === "right") return "right";
      break;
    default:
      break;
  }

  return "front";
}
