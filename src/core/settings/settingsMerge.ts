/**
 * Merge profundo e utilitários para aplicar patches a SettingsSchema.
 */

import type { SettingsSchema } from "./settingsSchema";
import { mergeOrcamentosSettings } from "../orcamentos";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  normalized: SettingsSchema;
};

export const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const toNumber = (value: unknown, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
export const normalizeDepths = (value: unknown, fallback: number[]) => {
  if (!Array.isArray(value)) return fallback;
  const parsed = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
  return parsed.length > 0 ? parsed : fallback;
};

export function deepMergeSettings(
  base: SettingsSchema,
  patch: Partial<SettingsSchema> | Record<string, unknown>
): SettingsSchema {
  return {
    ...base,
    ...patch,
    geral: { ...base.geral, ...(isObject(patch.geral) ? patch.geral : {}) },
    fabrica: { ...base.fabrica, ...(isObject(patch.fabrica) ? patch.fabrica : {}) },
    precos: { ...base.precos, ...(isObject(patch.precos) ? patch.precos : {}) },
    orcamentos: mergeOrcamentosSettings(
      base.orcamentos,
      isObject(patch.orcamentos) ? patch.orcamentos : {}
    ),
    financeiroAdmin: {
      ...base.financeiroAdmin,
      ...(isObject(patch.financeiroAdmin) ? patch.financeiroAdmin : {}),
      adm: {
        ...base.financeiroAdmin?.adm,
        ...(isObject((patch.financeiroAdmin as Record<string, unknown> | undefined)?.adm)
          ? ((patch.financeiroAdmin as Record<string, unknown>).adm as object)
          : {}),
      },
      montagem: {
        ...base.financeiroAdmin?.montagem,
        ...(isObject((patch.financeiroAdmin as Record<string, unknown> | undefined)?.montagem)
          ? ((patch.financeiroAdmin as Record<string, unknown>).montagem as object)
          : {}),
      },
      portes: {
        ...base.financeiroAdmin?.portes,
        ...(isObject((patch.financeiroAdmin as Record<string, unknown> | undefined)?.portes)
          ? ((patch.financeiroAdmin as Record<string, unknown>).portes as object)
          : {}),
      },
    } as SettingsSchema["financeiroAdmin"],
    ivaPctDefault:
      typeof (patch as Partial<SettingsSchema>).ivaPctDefault === "number"
        ? (patch as Partial<SettingsSchema>).ivaPctDefault!
        : base.ivaPctDefault,
    materiais: { ...base.materiais, ...(isObject(patch.materiais) ? patch.materiais : {}) },
    cnc: { ...base.cnc, ...(isObject(patch.cnc) ? patch.cnc : {}) },
    nesting: { ...base.nesting, ...(isObject(patch.nesting) ? patch.nesting : {}) },
    portas: { ...base.portas, ...(isObject(patch.portas) ? patch.portas : {}) },
    gavetas: { ...base.gavetas, ...(isObject(patch.gavetas) ? patch.gavetas : {}) },
    modeloPI: { ...base.modeloPI, ...(isObject(patch.modeloPI) ? patch.modeloPI : {}) },
    ferragens: {
      ...base.ferragens,
      ...(isObject(patch.ferragens) ? patch.ferragens : {}),
      cavilha: {
        ...base.ferragens.cavilha,
        ...(isObject((patch.ferragens as Record<string, unknown> | undefined)?.cavilha)
          ? (patch.ferragens as Record<string, unknown>).cavilha as Record<string, unknown>
          : {}),
      },
      parafuso: {
        ...base.ferragens.parafuso,
        ...(isObject((patch.ferragens as Record<string, unknown> | undefined)?.parafuso)
          ? (patch.ferragens as Record<string, unknown>).parafuso as Record<string, unknown>
          : {}),
      },
      corredica: {
        ...base.ferragens.corredica,
        ...(isObject((patch.ferragens as Record<string, unknown> | undefined)?.corredica)
          ? (patch.ferragens as Record<string, unknown>).corredica as Record<string, unknown>
          : {}),
      },
    },
    viewer: { ...base.viewer, ...(isObject(patch.viewer) ? patch.viewer : {}) },
    furação: {
      ...base.furação,
      ...(isObject(patch.furação) ? patch.furação : {}),
      parafuso: {
        ...base.furação.parafuso,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.parafuso)
          ? (patch.furação as Record<string, unknown>).parafuso as Record<string, unknown>
          : {}),
      },
      cavilha: {
        ...base.furação.cavilha,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.cavilha)
          ? (patch.furação as Record<string, unknown>).cavilha as Record<string, unknown>
          : {}),
      },
      prateleira: {
        ...base.furação.prateleira,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.prateleira)
          ? (patch.furação as Record<string, unknown>).prateleira as Record<string, unknown>
          : {}),
      },
      dobradica: {
        ...base.furação.dobradica,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.dobradica)
          ? (patch.furação as Record<string, unknown>).dobradica as Record<string, unknown>
          : {}),
      },
      dobradicaFixacao: {
        ...base.furação.dobradicaFixacao,
        ...(isObject((patch.furação as Record<string, unknown> | undefined)?.dobradicaFixacao)
          ? (patch.furação as Record<string, unknown>).dobradicaFixacao as Record<string, unknown>
          : {}),
      },
    },
    etiquetasQr: { ...base.etiquetasQr, ...(isObject(patch.etiquetasQr) ? patch.etiquetasQr : {}) },
  };
}
