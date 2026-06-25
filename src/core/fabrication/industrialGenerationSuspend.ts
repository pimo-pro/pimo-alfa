/**
 * Suspende sync de viewer/calculadora durante geração industrial (ZIP/CNC/lote).
 * Evita trabalho redundante no main thread enquanto o pipeline corre.
 *
 * Também autoriza saídas industriais (TCN, TXML, PDF) durante comandos explícitos do utilizador.
 */

import {
  beginIndustrialOutputSession,
  endIndustrialOutputSession,
} from "../industrial/industrialOutputGuard";

let activeDepth = 0;

export function beginIndustrialFileGeneration(): void {
  activeDepth += 1;
  beginIndustrialOutputSession();
}

export function endIndustrialFileGeneration(): void {
  activeDepth = Math.max(0, activeDepth - 1);
  endIndustrialOutputSession();
}

export function isIndustrialFileGenerationActive(): boolean {
  return activeDepth > 0;
}
