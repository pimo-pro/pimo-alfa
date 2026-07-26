/**
 * releaseBuilder.ts — Construção das Release Notes industriais (Modelo B).
 */

import type { EuropeanDrawerResult } from "../types";
import { collectEuropeanReleaseEvents } from "./releaseCollector";
import {
  formatEuropeanReleaseSections,
  formatEuropeanReleaseText,
  type EuropeanReleaseSection,
} from "./releaseFormatter";
import { buildReleaseReport, type EuropeanReleaseReport } from "./releaseReport";

/** Versão documental da camada Release Notes (Fase 14). */
export const EUROPEAN_RELEASE_VERSION = "B.v3.14";
export const EUROPEAN_RELEASE_AUTHOR = "PIMO Engine";

export type EuropeanReleaseNotes = {
  kind: "european-release-notes";
  version: string;
  generatedAt: string;
  author: string;
  sections: EuropeanReleaseSection[];
  /** Texto industrial completo. */
  text: string;
  /** Integração com camadas anexadas ao result. */
  integrations: {
    safety: boolean;
    docs: boolean;
    dxf: boolean;
    technical: boolean;
    overlay: boolean;
  };
  eventsCollected: number;
  report: EuropeanReleaseReport;
};

/**
 * Constrói Release Notes a partir do resultado (somente leitura).
 */
export function buildEuropeanReleaseNotes(
  result: EuropeanDrawerResult
): EuropeanReleaseNotes {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const events = collectEuropeanReleaseEvents(result);
    const sections = formatEuropeanReleaseSections(events);
    const generatedAt = new Date().toISOString();
    const version = EUROPEAN_RELEASE_VERSION;
    const author = EUROPEAN_RELEASE_AUTHOR;
    const text = formatEuropeanReleaseText({ version, generatedAt, author, sections });

    const integrations = {
      safety: Boolean(result.safetyReport),
      docs: Boolean(result.docs),
      dxf: Boolean(result.dxf),
      technical: Boolean(result.technical),
      overlay: Boolean(result.overlay),
    };

    if (!integrations.docs) warnings.push("docs ausente no result ao gerar release notes.");
    if (!integrations.dxf) warnings.push("dxf ausente no result ao gerar release notes.");
    if (!integrations.overlay) warnings.push("overlay ausente no result ao gerar release notes.");

    const nonEmptySections = sections.filter((s) => s.items.length > 0).length;
    const report = buildReleaseReport({
      sectionsGenerated: nonEmptySections,
      eventsCollected: events.length,
      industrialIntegrity: result.valid === true,
      warnings,
      errors,
    });

    return {
      kind: "european-release-notes",
      version,
      generatedAt,
      author,
      sections,
      text,
      integrations,
      eventsCollected: events.length,
      report,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    const generatedAt = new Date().toISOString();
    return {
      kind: "european-release-notes",
      version: EUROPEAN_RELEASE_VERSION,
      generatedAt,
      author: EUROPEAN_RELEASE_AUTHOR,
      sections: [],
      text: "",
      integrations: {
        safety: false,
        docs: false,
        dxf: false,
        technical: false,
        overlay: false,
      },
      eventsCollected: 0,
      report: buildReleaseReport({
        sectionsGenerated: 0,
        eventsCollected: 0,
        industrialIntegrity: false,
        warnings,
        errors,
      }),
    };
  }
}
