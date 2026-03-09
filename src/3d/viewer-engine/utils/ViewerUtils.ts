/**
 * Utilitários do Viewer Engine (helpers puros).
 * Extraído do ViewerCore para permitir uso sem dependência da instância.
 */

/**
 * Converte coordenadas do ponteiro (clientX/clientY) em NDC (-1..1) relativas ao canvas.
 */
export function getPointerNdc(
  canvas: HTMLElement,
  event: { clientX: number; clientY: number }
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
}
