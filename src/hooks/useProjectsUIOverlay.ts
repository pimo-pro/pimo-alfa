import { useCallback, useMemo, useState } from "react";

export type ProjectTag = "ready" | "review" | "error" | "sent" | null;

export type ProjectUIOverlay = {
  archived?: boolean;
  tag?: ProjectTag;
  note?: string;
};

type OverlayMap = Record<string, ProjectUIOverlay>;

const STORAGE_KEY = "pimo:project-overlay";
const NOTE_MAX_CHARS = 60;

function loadOverlays(): OverlayMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OverlayMap;
  } catch {
    return {};
  }
}

function saveOverlays(map: OverlayMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota exceeded — ignorar silenciosamente */
  }
}

export function useProjectsUIOverlay() {
  const [overlays, setOverlays] = useState<OverlayMap>(loadOverlays);

  const patchOverlay = useCallback((id: string, patch: Partial<ProjectUIOverlay>) => {
    setOverlays((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      saveOverlays(next);
      return next;
    });
  }, []);

  const archive = useCallback((ids: string[]) => {
    setOverlays((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = { ...next[id], archived: true };
      }
      saveOverlays(next);
      return next;
    });
  }, []);

  const unarchive = useCallback((ids: string[]) => {
    setOverlays((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = { ...next[id], archived: false };
      }
      saveOverlays(next);
      return next;
    });
  }, []);

  const removeFromOverlay = useCallback((ids: string[]) => {
    setOverlays((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        delete next[id];
      }
      saveOverlays(next);
      return next;
    });
  }, []);

  const setTag = useCallback(
    (id: string, tag: ProjectTag) => {
      patchOverlay(id, { tag });
    },
    [patchOverlay]
  );

  const setNote = useCallback(
    (id: string, note: string) => {
      patchOverlay(id, { note: note.slice(0, NOTE_MAX_CHARS) });
    },
    [patchOverlay]
  );

  const getOverlay = useCallback(
    (id: string): ProjectUIOverlay => {
      return overlays[id] ?? {};
    },
    [overlays]
  );

  const archivedCount = useMemo(
    () => Object.values(overlays).filter((o) => o.archived).length,
    [overlays]
  );

  return {
    overlays,
    archive,
    unarchive,
    removeFromOverlay,
    setTag,
    setNote,
    getOverlay,
    archivedCount,
  };
}
