import type { InternalMeasurementEntry } from "./internalRulerTypes";

/**
 * Gestor imutável do histórico de medições internas (opera sobre arrays do projeto).
 */
export class InternalRulerHistory {
  private entries: InternalMeasurementEntry[] = [];

  setEntries(entries: InternalMeasurementEntry[]): void {
    this.entries = entries.map((e) => ({
      ...e,
      a: { ...e.a },
      b: { ...e.b },
    }));
  }

  getAll(): InternalMeasurementEntry[] {
    return this.entries.map((e) => ({
      ...e,
      a: { ...e.a },
      b: { ...e.b },
    }));
  }

  getVisible(): InternalMeasurementEntry[] {
    return this.getAll().filter((e) => e.visible);
  }

  getForBox(boxId: string): InternalMeasurementEntry[] {
    return this.getAll().filter((e) => e.boxId === boxId);
  }

  addMeasurement(entry: InternalMeasurementEntry): InternalMeasurementEntry[] {
    this.entries = [...this.entries, { ...entry, a: { ...entry.a }, b: { ...entry.b } }];
    return this.getAll();
  }

  removeMeasurement(id: string): InternalMeasurementEntry[] {
    this.entries = this.entries.filter((e) => e.id !== id);
    return this.getAll();
  }

  clearAll(boxId?: string): InternalMeasurementEntry[] {
    if (boxId) {
      this.entries = this.entries.filter((e) => e.boxId !== boxId);
    } else {
      this.entries = [];
    }
    return this.getAll();
  }

  toggleVisibility(id: string): InternalMeasurementEntry[] {
    this.entries = this.entries.map((e) =>
      e.id === id ? { ...e, visible: !e.visible } : e
    );
    return this.getAll();
  }

  setAllVisibility(boxId: string | undefined, visible: boolean): InternalMeasurementEntry[] {
    this.entries = this.entries.map((e) => {
      if (boxId != null && e.boxId !== boxId) return e;
      return { ...e, visible };
    });
    return this.getAll();
  }
}
