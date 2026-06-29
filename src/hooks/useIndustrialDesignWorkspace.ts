import { useCallback, useEffect, useRef, useState } from "react";
import type { HoleTypeId } from "@/core/drill/holeCatalog";
import type { WorkspaceBox } from "@/core/types";
import { defaultRulesConfig } from "@/core/rules/rulesConfig";
import {
  applyAutoAdjustPanelToInnerSpace,
  createCustomIndustrialModelFromDesignBox,
  createIndustrialDesignBox,
  removeDesignDrillHole,
  type CreateCustomIndustrialModelResult,
  type DesignDrillHole,
  type DesignValidationIssue,
  type IndustrialDesignBox,
} from "@/core/industrialDesigner";
import { isViewerApiReady } from "@/core/viewer/viewerReadiness";
import type { PimoViewerApi } from "@/context/PimoViewerContextCore";

function workspaceBoxToDesignBox(box: WorkspaceBox): IndustrialDesignBox {
  return createIndustrialDesignBox({
    id: box.id,
    nome: box.nome,
    outerWidthMm: box.dimensoes.largura,
    outerHeightMm: box.dimensoes.altura,
    outerDepthMm: box.dimensoes.profundidade,
    espessuraMm: box.espessura,
    materialId: box.material ?? "default",
  });
}

export type UseIndustrialDesignWorkspaceOptions = {
  viewerApi: PimoViewerApi;
  workspaceBox: WorkspaceBox | undefined;
  enabled: boolean;
};

export type UseIndustrialDesignWorkspaceResult = {
  designBox: IndustrialDesignBox | null;
  selectedPanelId: string | null;
  selectedHoleTypeId: HoleTypeId | null;
  insertOnClick: boolean;
  validationIssues: DesignValidationIssue[];
  setSelectedHoleTypeId: (id: HoleTypeId | null) => void;
  setInsertOnClick: (active: boolean) => void;
  removeHole: (panelId: string, holeId: string) => void;
  autoAdjustSelectedPanel: () => void;
  panelWarnings: DesignValidationIssue[];
  canAutoAdjust: boolean;
  createIndustrialModel: (nome?: string) => CreateCustomIndustrialModelResult | null;
  lastCreatedModelId: string | null;
};

export function useIndustrialDesignWorkspace({
  viewerApi,
  workspaceBox,
  enabled,
}: UseIndustrialDesignWorkspaceOptions): UseIndustrialDesignWorkspaceResult {
  const [designBox, setDesignBox] = useState<IndustrialDesignBox | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedHoleTypeId, setSelectedHoleTypeIdState] = useState<HoleTypeId | null>(null);
  const [insertOnClick, setInsertOnClickState] = useState(false);
  const [validationIssues, setValidationIssues] = useState<DesignValidationIssue[]>([]);
  const [lastCreatedModelId, setLastCreatedModelId] = useState<string | null>(null);
  const boxIdRef = useRef<string | null>(null);

  const syncDesignBox = useCallback(
    (box: IndustrialDesignBox | null, targetBoxId?: string | null) => {
      setDesignBox(box);
      if (!isViewerApiReady(viewerApi)) return;
      viewerApi.setIndustrialDesignBox?.(box, targetBoxId ?? box?.id ?? null);
    },
    [viewerApi]
  );

  const setSelectedHoleTypeId = useCallback((id: HoleTypeId | null) => {
    setSelectedHoleTypeIdState(id);
    if (!isViewerApiReady(viewerApi)) return;
    if (!insertOnClick) {
      viewerApi.setIndustrialDesignActiveHoleType?.(null);
      return;
    }
    viewerApi.setIndustrialDesignActiveHoleType?.(id);
  }, [insertOnClick, viewerApi]);

  const setInsertOnClick = useCallback(
    (active: boolean) => {
      setInsertOnClickState(active);
      if (!isViewerApiReady(viewerApi)) return;
      viewerApi.setIndustrialDesignWorkspaceEnabled?.(active);
      viewerApi.setIndustrialDesignActiveHoleType?.(active ? selectedHoleTypeId : null);
      if (active) {
        viewerApi.setPanelRenderingEnabled?.(true);
        viewerApi.setPanelEdgesVisible?.(true);
      }
    },
    [selectedHoleTypeId, viewerApi]
  );

  useEffect(() => {
    if (!insertOnClick || !isViewerApiReady(viewerApi)) return;
    viewerApi.setIndustrialDesignActiveHoleType?.(selectedHoleTypeId);
  }, [insertOnClick, selectedHoleTypeId, viewerApi]);

  const viewerReady = isViewerApiReady(viewerApi);

  useEffect(() => {
    if (!viewerApi || !viewerReady) {
      viewerApi?.setIndustrialDesignWorkspaceEnabled?.(false);
      viewerApi?.setIndustrialDesignActiveHoleType?.(null);
      return;
    }

    if (!enabled || !workspaceBox) {
      viewerApi.setIndustrialDesignWorkspaceEnabled?.(false);
      viewerApi.setIndustrialDesignActiveHoleType?.(null);
      return;
    }

    const boxId = workspaceBox.id;
    boxIdRef.current = boxId;

    const existing = viewerApi.getIndustrialDesignBox?.();
    if (existing?.id === boxId) {
      setDesignBox(existing);
      viewerApi.setIndustrialDesignBox?.(existing, boxId);
    } else {
      const fresh = workspaceBoxToDesignBox(workspaceBox);
      setDesignBox(fresh);
      viewerApi.setIndustrialDesignBox?.(fresh, boxId);
    }

    setValidationIssues(viewerApi.getIndustrialDesignValidationIssues?.() ?? []);

    viewerApi.setOnIndustrialDesignPanelSelected?.((panelId) => {
      setSelectedPanelId(panelId);
    });
    viewerApi.setOnIndustrialDesignChanged?.((box) => {
      if (boxIdRef.current === box.id) setDesignBox(box);
    });
    viewerApi.setOnIndustrialDesignHolePlaced?.(() => {
      const current = viewerApi.getIndustrialDesignBox?.();
      if (current) setDesignBox(current);
    });
    viewerApi.setOnIndustrialDesignValidationChanged?.((issues) => {
      setValidationIssues(issues);
    });

    setSelectedPanelId(viewerApi.getIndustrialDesignSelectedPanelId?.() ?? null);

    return () => {
      if (!viewerApi) return;
      viewerApi.setOnIndustrialDesignPanelSelected?.(null);
      viewerApi.setOnIndustrialDesignChanged?.(null);
      viewerApi.setOnIndustrialDesignHolePlaced?.(null);
      viewerApi.setOnIndustrialDesignValidationChanged?.(null);
      viewerApi.setOnIndustrialDesignValidationFailed?.(null);
      viewerApi.setIndustrialDesignWorkspaceEnabled?.(false);
      viewerApi.setIndustrialDesignActiveHoleType?.(null);
      setInsertOnClickState(false);
    };
  }, [enabled, viewerApi, viewerReady, workspaceBox]);

  const removeHole = useCallback(
    (panelId: string, holeId: string) => {
      if (!designBox || !isViewerApiReady(viewerApi)) return;
      const updated = removeDesignDrillHole(designBox, panelId, holeId);
      syncDesignBox(updated, workspaceBox?.id);
      setValidationIssues(viewerApi.refreshIndustrialDesignValidation?.() ?? []);
    },
    [designBox, syncDesignBox, viewerApi, workspaceBox?.id]
  );

  const autoAdjustSelectedPanel = useCallback(() => {
    if (!designBox || !selectedPanelId || !isViewerApiReady(viewerApi)) return;
    const updated = applyAutoAdjustPanelToInnerSpace(designBox, selectedPanelId);
    syncDesignBox(updated, workspaceBox?.id);
    setValidationIssues(viewerApi.refreshIndustrialDesignValidation?.() ?? []);
  }, [designBox, selectedPanelId, syncDesignBox, viewerApi, workspaceBox?.id]);

  const panelWarnings = validationIssues.filter(
    (issue) => issue.panelId === selectedPanelId && issue.severity === "warning"
  );

  const canAutoAdjust =
    panelWarnings.some((issue) =>
      issue.code === "PANEL_EXCEEDS_INNER_WIDTH" ||
      issue.code === "PANEL_EXCEEDS_INNER_HEIGHT" ||
      issue.code === "PANEL_EXCEEDS_INNER_DEPTH"
    ) && Boolean(selectedPanelId);

  const createIndustrialModel = useCallback(
    (nome?: string): CreateCustomIndustrialModelResult | null => {
      if (!designBox) return null;
      try {
        const result = createCustomIndustrialModelFromDesignBox({
          designBox,
          nome,
          project: {
            projectName: workspaceBox?.nome ?? "MODELO_INDUSTRIAL",
            boxes: [],
            rules: defaultRulesConfig,
          },
          rules: defaultRulesConfig,
        });
        setLastCreatedModelId(result.record.id);
        return result;
      } catch {
        return null;
      }
    },
    [designBox, workspaceBox?.nome]
  );

  return {
    designBox,
    selectedPanelId,
    selectedHoleTypeId,
    insertOnClick,
    validationIssues,
    setSelectedHoleTypeId,
    setInsertOnClick,
    removeHole,
    autoAdjustSelectedPanel,
    panelWarnings,
    canAutoAdjust,
    createIndustrialModel,
    lastCreatedModelId,
  };
}

export function formatDesignHoleLabel(hole: DesignDrillHole): string {
  return `${hole.holeTypeId} @ (${hole.xMm.toFixed(0)}, ${hole.yMm.toFixed(0)}) mm`;
}
