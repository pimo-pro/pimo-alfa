/**
 * Contadores derivados de PROGRESSO_SECTIONS (lgica do antigo ProjectProgress).
 */

import { PROGRESSO_SECTIONS } from "./progressoSections";
import type { ProgressoCounters } from "./progressoTypes";

export function computeProgressoCounters(
  sections = PROGRESSO_SECTIONS
): ProgressoCounters {
  let completed = 0;
  let inProgress = 0;
  let planned = 0;

  for (const section of sections) {
    for (const item of section.items) {
      if (item.status === "completed") completed += 1;
      else if (item.status === "in-progress") inProgress += 1;
      else if (item.status === "planned") planned += 1;
    }
  }

  const total = completed + inProgress + planned;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, inProgress, planned, total, completionPercent };
}
