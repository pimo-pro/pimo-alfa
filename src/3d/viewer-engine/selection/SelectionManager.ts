/**
 * @deprecated Substituído por ViewerState. Mantido apenas para compatibilidade de import legado.
 * Estado de seleção da caixa ativa no viewer (selectedBoxId).
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
