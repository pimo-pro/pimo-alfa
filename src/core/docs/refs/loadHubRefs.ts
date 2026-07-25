/**
 * Loader local de Referências Técnicas para o Hub (sem fetch).
 */

import {
  DATA_FLOWS,
  DOC_LINKS,
  FOLDER_STRUCTURE,
  MODULES,
  PANEL_NAV_ITEMS,
  getAutoLinks,
  getAutoSections,
} from "./refsIndex";
import { painelReferenciaSections } from "./refsSections";
import { REFS_NOTES } from "./refsNotes";
import type { HubRefEntry, HubRefsSnapshot } from "./refsTypes";

export function loadHubRefs(): HubRefsSnapshot {
  const entries: HubRefEntry[] = [];

  for (const link of DOC_LINKS) {
    entries.push({
      id: `link-${link.id}`,
      kind: "link",
      title: link.title,
      summary: link.description ?? link.path,
      paths: [link.path],
    });
  }

  for (const mod of MODULES) {
    entries.push({
      id: `mod-${mod.id}`,
      kind: "module",
      title: mod.name,
      summary: mod.responsibility,
      paths: [mod.path],
      meta: mod.relatedModules?.length
        ? { related: mod.relatedModules.join(", ") }
        : undefined,
    });
  }

  for (const flow of DATA_FLOWS) {
    entries.push({
      id: `flow-${flow.id}`,
      kind: "flow",
      title: flow.name,
      summary: flow.description,
      meta: { from: flow.from, to: flow.to },
    });
  }

  for (const [i, section] of painelReferenciaSections.entries()) {
    entries.push({
      id: `sec-${i}-${section.title.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
      kind: "section",
      title: section.title,
      summary: section.description,
      details: [
        section.internals,
        section.interactions,
        section.notes ? `Notas: ${section.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      paths: section.files,
    });
  }

  for (const note of REFS_NOTES) {
    entries.push({
      id: note.id,
      kind: "note",
      title: note.title,
      summary: note.body.slice(0, 140) + (note.body.length > 140 ? "..." : ""),
      details: note.body,
    });
  }

  for (const auto of getAutoSections()) {
    entries.push({
      id: `auto-sec-${auto.id}`,
      kind: "section",
      title: auto.title,
      summary: auto.content ?? "",
      details: auto.content,
    });
  }

  for (const auto of getAutoLinks()) {
    entries.push({
      id: `auto-link-${auto.id}`,
      kind: "link",
      title: auto.label,
      summary: auto.href,
      paths: [auto.href],
    });
  }

  return {
    entries,
    folderStructure: FOLDER_STRUCTURE,
    navLabels: PANEL_NAV_ITEMS.map((n) => n.label),
  };
}
