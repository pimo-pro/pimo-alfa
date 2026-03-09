/**
 * MaterialEngine — Registo de presets a partir de presetService e materials.api.
 * viewerMaterialId é a chave única; presets são normalizados para MaterialPresetDefinition.
 */

import type { MaterialPresetDefinition } from "./types";
import { getPresetById, getAllPresets } from "../../../core/materials/presetService";
import { resolveMaterial } from "../../../core/materials/materials.api";

const DEFAULT_REPEAT = { x: 1, y: 1 };
const DEFAULT_ROUGHNESS = 0.55;
const DEFAULT_METALNESS = 0;

/** Converte preset do core (presets.ts) para definição do MaterialEngine. */
function toEnginePreset(
  id: string,
  name: string,
  color: string,
  opts: {
    textureUrl?: string;
    normalMapUrl?: string;
    roughness?: number;
    metallic?: number;
    uvScale?: { x: number; y: number };
    uvRotation?: number;
  } = {}
): MaterialPresetDefinition {
  return {
    id,
    name,
    baseColor: color ?? "#f2f0eb",
    textureUrl: opts.textureUrl,
    normalMapUrl: opts.normalMapUrl,
    roughness: Math.max(0, Math.min(1, opts.roughness ?? DEFAULT_ROUGHNESS)),
    metalness: Math.max(0, Math.min(1, opts.metallic ?? DEFAULT_METALNESS)),
    repeat: opts.uvScale ? { x: opts.uvScale.x || 1, y: opts.uvScale.y || 1 } : DEFAULT_REPEAT,
    rotation: typeof opts.uvRotation === "number" ? opts.uvRotation : 0,
  };
}

/** Cache do registo normalizado (id → MaterialPresetDefinition). */
const registry = new Map<string, MaterialPresetDefinition>();

function buildRegistry(): void {
  registry.clear();
  const presets = getAllPresets();
  for (const p of presets) {
    if (!p?.id) continue;
    registry.set(p.id, toEnginePreset(p.id, p.name, p.color, {
      textureUrl: p.textureUrl,
      normalMapUrl: p.normalMapUrl,
      roughness: p.roughness,
      metallic: p.metallic,
      uvScale: p.uvScale,
      uvRotation: p.uvRotation,
    }));
  }
}

/** Devolve o preset normalizado por id (viewerMaterialId). Resolve aliases via materials.api. */
export function getPreset(materialIdOrAlias: string): MaterialPresetDefinition | null {
  if (!materialIdOrAlias || typeof materialIdOrAlias !== "string") return null;
  if (registry.size === 0) buildRegistry();
  const resolved = resolveMaterial(materialIdOrAlias);
  const id = resolved?.viewerMaterialId ?? materialIdOrAlias.trim();
  let def = registry.get(id);
  if (!def) {
    const fromService = getPresetById(id);
    if (fromService) {
      def = toEnginePreset(fromService.id, fromService.name, fromService.color, {
        textureUrl: fromService.textureUrl,
        normalMapUrl: fromService.normalMapUrl,
        roughness: fromService.roughness,
        metallic: fromService.metallic,
        uvScale: fromService.uvScale,
        uvRotation: fromService.uvRotation,
      });
      registry.set(id, def);
    } else if (resolved) {
      def = toEnginePreset(id, resolved.label, "#f2f0eb");
      registry.set(id, def);
    }
  }
  return def ?? null;
}

/** Id do preset padrão (fallback). */
export const DEFAULT_PRESET_ID = "mdf_branco";

/** Devolve o preset padrão ou o primeiro disponível. */
export function getDefaultPreset(): MaterialPresetDefinition {
  const def = getPreset(DEFAULT_PRESET_ID);
  if (def) return def;
  if (registry.size === 0) buildRegistry();
  const first = registry.values().next().value;
  if (first) return first;
  return toEnginePreset("fallback", "Fallback", "#ffffff");
}

/** Invalida o cache do registo (útil após alterações em presetService). */
export function invalidatePresetRegistry(): void {
  registry.clear();
}

/** Lista de presets para a UI (id = viewerMaterialId, name para exibição). */
export function getPresetsForUI(): Array<{ id: string; name: string }> {
  if (registry.size === 0) buildRegistry();
  return Array.from(registry.entries()).map(([id, def]) => ({ id, name: def.name }));
}
