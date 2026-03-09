/**
 * Viewer: delega toda a implementação ao ViewerCore (viewer-engine).
 * Mantém a API pública inalterada para compatibilidade com o restante do projeto.
 * @see src/3d/viewer-engine/ViewerCore.ts
 */
import { ViewerCore } from "../viewer-engine/ViewerCore";
import type { ViewerOptions } from "../viewer-engine/ViewerCore";

export type { ViewerOptions };
export class Viewer extends ViewerCore {}
