/**
 * Carrega o ViewerCore do viewer-engine via import dinâmico.
 * Evita import estático que pode causar 500 no Vite ao servir ViewerCore.ts.
 * Usado pelo Workspace para montar o viewer quando o container estiver disponível.
 */

export type ViewerCoreInstance = { dispose: () => void };

export type ViewerCoreConstructor = new (
  container: HTMLElement,
  options?: Record<string, unknown>
) => ViewerCoreInstance;

/**
 * Import dinâmico do barrel do viewer-engine.
 * Caminho: src/core/viewer/ -> ../../ = src, então ../../3d/viewer-engine = src/3d/viewer-engine
 */
export async function loadViewerCore(): Promise<ViewerCoreConstructor> {
  const mod = await import("../../3d/viewer-engine");
  return mod.ViewerCore as ViewerCoreConstructor;
}
