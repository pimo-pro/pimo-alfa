/**
 * @deprecated LegacyRulerAdapter — all methods are stubs.
 * The real ruler is in src/core/ruler/RulerSystem.ts
 * This file exists only for backward compatibility.
 * Remove after confirming no callers remain.
 */
export class LegacyRulerAdapter {
  getRulerEdgeAtPointer(_event: { clientX: number; clientY: number }): null {
    return null;
  }

  getInternalRulerPickAtPointer(_event: { clientX: number; clientY: number }): null {
    return null;
  }

  cycleInternalRulerSelection(_result: unknown): void {}

  clearInternalRulerSelection(): void {}

  getInternalRulerA(): null {
    return null;
  }

  getInternalRulerB(): null {
    return null;
  }

  getInternalRulerMeasurement(): null {
    return null;
  }

  getRulerMeasurements(_referenceBoxId: string | null): {
    horizontalLeft: null;
    horizontalRight: null;
    front: null;
    back: null;
    floor: null;
    ceiling: null;
  } {
    return {
      horizontalLeft: null,
      horizontalRight: null,
      front: null,
      back: null,
      floor: null,
      ceiling: null,
    };
  }
}
