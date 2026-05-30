import type { RoomOpeningLike } from "../snapping/smartSnappingTypes";

/**
 * Cache leve para leituras repetidas de geometria da sala (snapping / auto-layout).
 * Invalidação explícita — não altera resultados, só evita recomputação.
 */
export class ViewerBoundsCache {
  private roomGeneration = 0;
  private roomOpeningsGen = -1;
  private roomOpenings: RoomOpeningLike[] = [];

  invalidateRoom(): void {
    this.roomGeneration += 1;
    this.roomOpeningsGen = -1;
    this.roomOpenings = [];
  }

  getRoomGeneration(): number {
    return this.roomGeneration;
  }

  getRoomOpenings(
    generation: number,
    compute: () => RoomOpeningLike[]
  ): RoomOpeningLike[] {
    if (this.roomOpeningsGen === generation) {
      return this.roomOpenings;
    }
    this.roomOpenings = compute();
    this.roomOpeningsGen = generation;
    return this.roomOpenings;
  }
}
