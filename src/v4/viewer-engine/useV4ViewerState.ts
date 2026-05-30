import { useState, useCallback } from "react";

export type V4ActiveTool = "select" | "translate" | "rotate" | "ruler";

export interface V4ViewerState {
  activeTool: V4ActiveTool;
  showGrid: boolean;
  showDimensions: boolean;
  selectedId: string | null;
}

export interface V4ViewerActions {
  setTool: (tool: V4ActiveTool) => void;
  toggleGrid: () => void;
  toggleDimensions: () => void;
  setSelectedId: (id: string | null) => void;
}

export function useV4ViewerState(externalSelectedId: string | null) {
  const [activeTool, setActiveTool]         = useState<V4ActiveTool>("select");
  const [showGrid, setShowGrid]             = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  // External selectedId takes priority
  const selectedId = externalSelectedId ?? internalSelectedId;

  const setTool = useCallback((tool: V4ActiveTool) => {
    setActiveTool(tool);
    if (tool === "ruler") setShowDimensions(true);
  }, []);

  const toggleGrid         = useCallback(() => setShowGrid((v) => !v), []);
  const toggleDimensions   = useCallback(() => setShowDimensions((v) => !v), []);
  const setSelectedId      = useCallback((id: string | null) => setInternalSelectedId(id), []);

  return {
    state: { activeTool, showGrid, showDimensions, selectedId } satisfies V4ViewerState,
    actions: { setTool, toggleGrid, toggleDimensions, setSelectedId } satisfies V4ViewerActions,
  };
}
