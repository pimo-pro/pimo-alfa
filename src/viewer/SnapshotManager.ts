// SnapshotManager: Gerencia snapshots, save/restore, histórico visual.
export class SnapshotManager {
  viewerCore: unknown;

  constructor(viewerCore: unknown) {
    this.viewerCore = viewerCore;
  }

  saveMeasurementGuide(_guide: unknown): true {
    return true;
  }

  saveRulerState(_state: unknown): true {
    return true;
  }

  getHistory(): unknown[] {
    return [];
  }
}
