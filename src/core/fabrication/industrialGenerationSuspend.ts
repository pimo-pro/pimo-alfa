/**
 * Suspende sync de viewer/calculadora durante geração industrial (ZIP/CNC/lote).
 * Evita trabalho redundante no main thread enquanto o pipeline corre.
 */

let activeDepth = 0;

export function beginIndustrialFileGeneration(): void {
  activeDepth += 1;
}

export function endIndustrialFileGeneration(): void {
  activeDepth = Math.max(0, activeDepth - 1);
}

export function isIndustrialFileGenerationActive(): boolean {
  return activeDepth > 0;
}
