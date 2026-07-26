/**
 * releaseFormatter.ts — Formatação industrial das Release Notes.
 */

import type { EuropeanReleaseEvent } from "./releaseCollector";

export type EuropeanReleaseSectionId =
  | "novas_funcionalidades"
  | "melhorias"
  | "correcoes"
  | "alteracoes_internas"
  | "notas_industriais"
  | "avisos_seguranca"
  | "componentes_afetados";

export type EuropeanReleaseSection = {
  id: EuropeanReleaseSectionId;
  title: string;
  items: Array<{ title: string; detail?: string; component?: string }>;
};

const SECTION_DEFS: Array<{
  id: EuropeanReleaseSectionId;
  title: string;
  kinds: EuropeanReleaseEvent["kind"][];
}> = [
  {
    id: "novas_funcionalidades",
    title: "Novas funcionalidades",
    kinds: ["feature"],
  },
  {
    id: "melhorias",
    title: "Melhorias",
    kinds: ["improvement"],
  },
  {
    id: "correcoes",
    title: "Correções",
    kinds: ["fix"],
  },
  {
    id: "alteracoes_internas",
    title: "Alterações internas",
    kinds: ["internal"],
  },
  {
    id: "notas_industriais",
    title: "Notas industriais",
    kinds: ["industrial_note"],
  },
  {
    id: "avisos_seguranca",
    title: "Avisos de segurança",
    kinds: ["safety"],
  },
  {
    id: "componentes_afetados",
    title: "Componentes afetados",
    kinds: ["component"],
  },
];

/**
 * Agrupa eventos em secções industriais.
 */
export function formatEuropeanReleaseSections(
  events: EuropeanReleaseEvent[]
): EuropeanReleaseSection[] {
  return SECTION_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    items: events
      .filter((e) => def.kinds.includes(e.kind))
      .map((e) => ({
        title: e.title,
        detail: e.detail,
        component: e.component,
      })),
  }));
}

/**
 * Texto industrial legível (markdown-lite).
 */
export function formatEuropeanReleaseText(input: {
  version: string;
  generatedAt: string;
  author: string;
  sections: EuropeanReleaseSection[];
}): string {
  const lines = [
    `# Release Notes — Modelo B ${input.version}`,
    `Autor: ${input.author}`,
    `Gerado: ${input.generatedAt}`,
    "",
  ];
  for (const section of input.sections) {
    lines.push(`## ${section.title}`);
    if (section.items.length === 0) {
      lines.push("- (nenhum)");
    } else {
      for (const item of section.items) {
        const comp = item.component ? ` [${item.component}]` : "";
        lines.push(`- ${item.title}${comp}`);
        if (item.detail) lines.push(`  ${item.detail}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}
