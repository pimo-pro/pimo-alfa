/**
 * Normalização hub → Novidades do Sistema (Fase 5).
 * Reutiliza loadWhatsNewNews — sem segundo parser.
 */

import {
  loadWhatsNewNews,
  type WhatsNewEntry,
  type WhatsNewType,
} from "../ajuda/loadWhatsNewNews";

export type HubWhatsNewSection = "adicionados" | "logs";

const ADICIONADOS_TYPES: ReadonlySet<WhatsNewType> = new Set(["feature"]);
const LOGS_TYPES: ReadonlySet<WhatsNewType> = new Set(["fix", "update", "docs"]);

export type { WhatsNewEntry, WhatsNewType };

export function filterWhatsNewForHub(
  entries: WhatsNewEntry[],
  section: HubWhatsNewSection
): WhatsNewEntry[] {
  const allow = section === "adicionados" ? ADICIONADOS_TYPES : LOGS_TYPES;
  return entries.filter((e) => allow.has(e.type));
}

/** Loader async do hub — mesma fonte que Ajuda → Novidades. */
export async function loadHubWhatsNew(
  section: HubWhatsNewSection
): Promise<WhatsNewEntry[]> {
  const all = await loadWhatsNewNews();
  return filterWhatsNewForHub(all, section);
}

export function formatHubPublishedAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
