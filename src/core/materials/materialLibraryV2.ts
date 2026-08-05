/**
 * FASE 4 — Etapa 8 (Parte 2): MaterialLibrary v2.
 *
 * LEGACY / caminho paralelo: orientado a MaterialRecord + presets de domínio (CRUD / caixas).
 * Para materiais de caixas no viewer 3D, a fonte preferida é {@link loadMaterial} em
 * `viewer-engine/materials/MaterialEngine` + `updateBoxMaterial` no ViewerCore.
 * Este módulo mantém-se para integração dados→VisualMaterial (cutlist / layout):
 * {@link getVisualMaterialForBox}, {@link buildVisualMaterial}, {@link getFallbackMaterial}.
 */

import type { MaterialRecord } from "./types";
import type { MaterialPreset } from "./presets";
import { getMaterialForBox, getMaterialByIdOrLabel } from "./service";
import { getPresetById, getDefaultPreset } from "./presetService";
import type { BoxModule } from "../types";

/** Objeto visual final para renderização (cor, textura, UV, PBR). */
export interface VisualMaterial {
  color: string;
  textureUrl?: string;
  uvScale: { x: number; y: number };
  uvRotation: number;
  roughness: number;
  metallic: number;
  normalMapUrl?: string;
}

const DEFAULT_UV_SCALE = { x: 1, y: 1 };
const DEFAULT_ROUGHNESS = 0.6;
const DEFAULT_METALLIC = 0;

/**
 * Constrói um VisualMaterial a partir de MaterialRecord e MaterialPreset.
 * Fallbacks: preset sem textura → só cor base; campos em falta → valores padrão.
 */
export function buildVisualMaterial(
  materialRecord: MaterialRecord | null,
  preset: MaterialPreset
): VisualMaterial {
  const color =
    (materialRecord?.color && /^#[0-9A-Fa-f]{3,8}$/.test(materialRecord.color))
      ? materialRecord.color
      : preset.color;
  return {
    color: color ?? "#f5f5f5",
    textureUrl: materialRecord?.textureUrl ?? preset.textureUrl,
    uvScale: preset.uvScale
      ? { x: Number(preset.uvScale.x) || 1, y: Number(preset.uvScale.y) || 1 }
      : DEFAULT_UV_SCALE,
    uvRotation: Number(preset.uvRotation) || 0,
    roughness: Math.max(0, Math.min(1, Number(preset.roughness ?? DEFAULT_ROUGHNESS))),
    metallic: Math.max(0, Math.min(1, Number(preset.metallic ?? DEFAULT_METALLIC))),
    normalMapUrl: preset.normalMapUrl,
  };
}

/**
 * Resolve o material visual para uma caixa: CRUD → presetService → buildVisualMaterial.
 */
export function getVisualMaterialForBox(
  box: BoxModule,
  projectMaterialId?: string
): VisualMaterial {
  const materialId = getMaterialForBox(box, projectMaterialId);
  const record = materialId ? getMaterialByIdOrLabel(materialId) : null;
  const preset =
    (record?.visualPresetId && getPresetById(record.visualPresetId)) || getDefaultPreset();
  return buildVisualMaterial(record, preset);
}

/**
 * Fallback seguro quando não há record nem preset.
 */
export function getFallbackMaterial(): VisualMaterial {
  const preset = getDefaultPreset();
  return buildVisualMaterial(null, preset);
}
