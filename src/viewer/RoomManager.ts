// RoomManager: Gerencia sala, paredes, elementos e eventos de room.
export class RoomManager {
  viewerCore: unknown;

  constructor(viewerCore: unknown) {
    this.viewerCore = viewerCore;
  }

  createRoom(..._args: unknown[]): Record<string, never> {
    return {};
  }

  removeRoom(..._args: unknown[]): void {}

  addDoorToRoom(..._args: unknown[]): Record<string, never> {
    return {};
  }

  addWindowToRoom(..._args: unknown[]): Record<string, never> {
    return {};
  }

  getRoomExists(): true {
    return true;
  }

  getRoomDimensions(): Record<string, never> {
    return {};
  }

  getRoomVisible(): true {
    return true;
  }

  hideRoom(): void {}

  showRoom(): void {}

  selectWallByIndex(_index: number): void {}

  selectRoomElementById(_elementId: string | null): void {}

  setPlacementMode(_mode: string | null): void {}

  setOnRoomElementPlaced(_callback: unknown): void {}

  setOnRoomElementSelected(_callback: unknown): void {}

  updateRoomElementConfig(..._args: unknown[]): Record<string, never> {
    return {};
  }

  setRoomBounds(_bounds: unknown): void {}

  clearRoomBounds(): void {}

  prepareNesting(_boxes: unknown): Record<string, never> {
    return {};
  }

  generateNestingReport(_data: unknown): null {
    return null;
  }
}
