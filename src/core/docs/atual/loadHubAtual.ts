/**
 * Loader local da Secção Atual (Estado do Sistema) — sem fetch.
 */

import { buildAtualSnapshot } from "./atualSnapshot";
import type { AtualSnapshot } from "./atualTypes";

export function loadHubAtual(): AtualSnapshot {
  return buildAtualSnapshot();
}
