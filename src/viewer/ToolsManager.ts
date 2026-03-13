// ToolsManager: Gerencia ferramentas, seleção, transformações.
export class ToolsManager {
  viewerCore: unknown;

  constructor(viewerCore: unknown) {
    this.viewerCore = viewerCore;
  }

  smartSelect(_criteria: unknown): unknown[] {
    return [];
  }

  measure(_box: unknown): null {
    return null;
  }

  selectionHistory(): unknown[] {
    return [];
  }
}
