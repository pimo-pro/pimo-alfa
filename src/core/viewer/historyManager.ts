/**
 * Gestor de histórico com compressão de eventos contínuos (ex.: drag).
 * Complementa o sistema de snapshots do ProjectProvider.
 */

export type HistoryEventKind =
  | "group.create"
  | "group.ungroup"
  | "group.transform"
  | "scaling"
  | "material.batch"
  | "snap"
  | "anchor.add"
  | "anchor.remove"
  | "transform.drag";

export type HistoryEvent = {
  kind: HistoryEventKind;
  label: string;
  timestamp: number;
};

type DragSession = {
  kind: HistoryEventKind;
  label: string;
  startedAt: number;
};

class HistoryManager {
  private dragSession: DragSession | null = null;
  private recentEvents: HistoryEvent[] = [];
  private readonly maxRecent = 50;
  private onDragCommit: (() => void) | null = null;

  beginDragSession(kind: HistoryEventKind, label: string): void {
    if (this.dragSession) return;
    this.dragSession = { kind, label, startedAt: performance.now() };
  }

  endDragSession(): HistoryEvent | null {
    if (!this.dragSession) return null;
    const event: HistoryEvent = {
      kind: this.dragSession.kind,
      label: this.dragSession.label,
      timestamp: Date.now(),
    };
    this.dragSession = null;
    this.pushEvent(event);
    this.onDragCommit?.();
    this.onDragCommit = null;
    return event;
  }

  cancelDragSession(): void {
    this.dragSession = null;
    this.onDragCommit = null;
  }

  isDragActive(): boolean {
    return this.dragSession != null;
  }

  setDragCommitCallback(cb: (() => void) | null): void {
    this.onDragCommit = cb;
  }

  recordEvent(kind: HistoryEventKind, label: string): void {
    if (this.isDragActive() && kind === "transform.drag") return;
    this.pushEvent({ kind, label, timestamp: Date.now() });
  }

  getRecentEvents(): HistoryEvent[] {
    return [...this.recentEvents];
  }

  private pushEvent(event: HistoryEvent): void {
    this.recentEvents = [event, ...this.recentEvents].slice(0, this.maxRecent);
  }
}

export const historyManager = new HistoryManager();
