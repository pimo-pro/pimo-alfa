/**
 * Viewer: delega toda a implementação ao ViewerCore (viewer-engine).
 * Mantém a API pública inalterada para compatibilidade com o restante do projeto.
 * @see src/3d/viewer-engine/ViewerCore.ts
 */
import { ViewerCore } from "../viewer-engine/ViewerCore";
// ViewerOptions removido: não existe em ViewerCore
export class Viewer extends ViewerCore {}
