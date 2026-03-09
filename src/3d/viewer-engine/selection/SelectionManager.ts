/**
 * Estado de seleção da caixa ativa no viewer (selectedBoxId).
 * O Viewer delega setSelectedBox/getSelectedBoxId aqui; hit test e outline permanecem no Viewer.
 */

export class ViewerSelectionManager {
  private selectedBoxId: string | null = null;

  setSelectedBox(id: string | null): void {
    this.selectedBoxId = id;
  }

  getSelectedBoxId(): string | null {
    return this.selectedBoxId;
  }
}
