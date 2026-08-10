/**
 * Motor TCN V4 — Layout de Corte Alfa.
 *
 * Gera TCN **real** idêntico ao Nesting V3/V4 de produção, invocando o pipeline
 * existente `prepareNestingV4IndustrialLayout` → `exportCncFiles` → writer «mo».
 *
 * Este módulo NÃO altera nem reimplementa o writer «mo».
 * A «imitação» pedida é compatibilidade 100% via chamada ao SSOT industrial.
 */

import type { NestingV4State } from "../../nesting-v4/nestingV4Types";
import {
  exportNestingV4ToCnc,
  prepareNestingV4IndustrialLayout,
} from "../../nesting-v4/nestingV4Export";
import type { CncExportResult } from "../../core/cnc/cncTypes";
import type { CutLayoutResult } from "../../core/cutlayout/cutLayoutTypes";
import { withIndustrialOutputAuthorization } from "../../core/industrial/industrialOutputGuard";
import { loadLcaTcnRules } from "../rules/layoutCorteAlfaTcnRules";

export type GenerateTcnV4Options = {
  projectName?: string;
  /** Se true, sincroniza kerf do state com regras TCN Alfa antes do export. */
  applyTcnKerfPreference?: boolean;
};

export type GenerateTcnV4Result = {
  /** Bytes TCN reais (writer nesting_mo). */
  exportResult: CncExportResult;
  layoutResult: CutLayoutResult;
  /** Metadados para UI. */
  meta: {
    writer: "nesting_mo";
    panelCount: number;
    projectName: string;
  };
};

/**
 * Prepara o layout industrial a partir do estado Nesting V4 (posições finais).
 */
export function prepareIndustrialLayoutFromV4(state: NestingV4State): CutLayoutResult {
  return prepareNestingV4IndustrialLayout(state);
}

/**
 * Gera TCN real para o Layout de Corte Alfa.
 * Compatível byte-a-byte com `exportNestingV4ToCnc` / Nesting V3 export path.
 * Autorização industrial explícita (guard) — não altera o writer «mo».
 */
export function generateTcnV4(
  state: NestingV4State,
  options: GenerateTcnV4Options = {}
): GenerateTcnV4Result {
  return withIndustrialOutputAuthorization("tcn", () => {
    const projectName = options.projectName ?? "LayoutCorteAlfa";
    const rules = loadLcaTcnRules();

    let working = state;
    if (options.applyTcnKerfPreference !== false) {
      const kerf = rules.kerf.preferredKerfMm || state.settings.kerfMm;
      working = {
        ...state,
        kerfMm: kerf,
        settings: { ...state.settings, kerfMm: kerf },
      };
    }

    const layoutResult = prepareIndustrialLayoutFromV4(working);
    const exportResult = exportNestingV4ToCnc(working, projectName);

    return {
      exportResult,
      layoutResult,
      meta: {
        writer: "nesting_mo",
        panelCount: exportResult.files.length,
        projectName,
      },
    };
  });
}

/** Download dos ficheiros .tcn reais gerados pelo writer «mo». */
export function downloadRealTcnV4(state: NestingV4State, projectName = "LayoutCorteAlfa"): GenerateTcnV4Result {
  const result = generateTcnV4(state, { projectName });
  for (const file of result.exportResult.files) {
    const blob = new Blob([file.tcn], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.filenameBase}.tcn`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return result;
}

/**
 * Representação G-code **visual** (anotação) a partir de segmentos parseados.
 * Não é o ficheiro de máquina — o TCN real usa blocos W# Albatros.
 */
export function segmentsToPseudoGCode(
  segments: Array<{ x: number; y: number; z: number; rapid?: boolean; feed?: number }>
): string {
  const lines = [
    "; Pseudo G-code visual — não enviar à máquina",
    "; Fonte real: TCN nesting_mo (W#2201 / W#81)",
    "G21 ; mm",
    "G90 ; absoluto",
  ];
  for (const s of segments) {
    const g = s.rapid ? "G0" : "G1";
    const f = !s.rapid && s.feed ? ` F${s.feed}` : "";
    lines.push(`${g} X${s.x.toFixed(3)} Y${s.y.toFixed(3)} Z${s.z.toFixed(3)}${f}`);
  }
  lines.push("M30");
  return lines.join("\n");
}
