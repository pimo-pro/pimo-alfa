import { useCallback, useEffect, useRef } from "react";
import type { BoxModule, WorkspaceBox } from "../core/types";
import type { BoxOptions } from "../3d/objects/BoxBuilder";
import { mmToM } from "../utils/units";
import { devLogger } from "../utils/devLogger";
import { getViewerMaterialId } from "../core/materials/service";
import { buildViewerDrillMarkersByPanel } from "../modules/drilling/drillingAdapter";
import { cutlistComPrecoFromBox } from "../core/manufacturing/cutlistFromBoxes";
import type { RulesConfig } from "../core/rules/rulesConfig";

type ViewerApi = {
  addBox: (_id: string, _options?: BoxOptions) => boolean;
  removeBox: (_id: string) => boolean;
  updateBox: (_id: string, _options: Partial<BoxOptions>) => boolean;
  setBoxIndex: (_id: string, _index: number) => boolean;
  setBoxGap: (_gap: number) => void;
};

type BoxState = { index: number };

/** Fingerprint da estrutura da caixa (dimensões, portas, gavetas, etc.) para evitar updateBox completo quando só posição/rotação mudou (ex.: após drag). */
function getStructureFingerprint(wsBox: WorkspaceBox): string {
  const d = wsBox.dimensoes;
  const doors = wsBox.doorsLayer ?? [];
  const drawers = wsBox.drawersLayer ?? [];
  const doorSig = doors.map((door) => ({
    id: door.id,
    width: door.width,
    height: door.height,
    thickness: door.thickness,
    posX: door.posX,
    posY: door.posY,
    posZ: door.posZ,
    rotY: door.rotY,
    isOpen: door.isOpen,
    openDirection: door.openDirection,
    hingeSide: door.hingeSide,
    pivot: door.pivot,
    material: door.material,
  }));
  const drawerSig = drawers.map((drawer) => ({
    id: drawer.id,
    width: drawer.width,
    height: drawer.height,
    depth: drawer.depth,
    frontThickness: drawer.frontThickness,
    posX: drawer.posX,
    posY: drawer.posY,
    posZ: drawer.posZ,
    rotY: drawer.rotY,
    isOpen: drawer.isOpen,
    pullDistanceMm: drawer.pullDistanceMm,
    material: drawer.material,
  }));
  return JSON.stringify({
    w: d?.largura,
    h: d?.altura,
    p: d?.profundidade,
    shelves: wsBox.prateleiras,
    doors: doorSig,
    drawers: drawerSig,
    material: wsBox.material,
    espessura: wsBox.espessura,
    cabinetType: wsBox.cabinetType,
    feetEnabled: wsBox.feetEnabled,
    pe_cm: wsBox.pe_cm,
    feetHeight: wsBox.feetHeight,
    feetOffsetFront: wsBox.feetOffsetFront,
  });
}

/** Posição EXCLUSIVAMENTE do projeto. manualPosition === true: X = rightmost+100mm, Y = altura/2, Z = 0 (definidos no ProjectProvider). */
function getBoxPositionAndRotation(workspaceBox: WorkspaceBox | undefined): Partial<BoxOptions> {
  if (!workspaceBox) return {};
  const opts: Partial<BoxOptions> = {};
  if (workspaceBox.manualPosition === true) {
    const x = mmToM(workspaceBox.posicaoX_mm ?? 0);
    const z = mmToM(workspaceBox.posicaoZ_mm ?? 0);
    const alturaMm = workspaceBox.dimensoes?.altura ?? 0;
    const yMm = (workspaceBox.posicaoY_mm != null && workspaceBox.posicaoY_mm > 0) ? workspaceBox.posicaoY_mm : alturaMm / 2;
    const y = mmToM(yMm);
    opts.position = { x, y, z };
    if (workspaceBox.rotacaoY != null && Number.isFinite(workspaceBox.rotacaoY)) {
      opts.rotationY = workspaceBox.rotacaoY;
    }
    if (workspaceBox.costaRotationY != null && Number.isFinite(workspaceBox.costaRotationY)) {
      opts.costaRotationY = workspaceBox.costaRotationY;
    }
  }
  if (workspaceBox.manualPosition !== undefined) {
    opts.manualPosition = workspaceBox.manualPosition;
  }
  return opts;
}

export const useCalculadoraSync = (
  boxes: BoxModule[],
  workspaceBoxes: WorkspaceBox[],
  viewerApi: ViewerApi,
  gap?: number,
  materialName?: string,
  /** Quando true, o viewer está montado e pronto para receber caixas. */
  viewerReady?: boolean,
  /** Id do material do projeto (CRUD); usado quando a caixa não tem material próprio. */
  projectMaterialId?: string,
  /** Regras do projeto; usadas para gerar cutlist com drillHoles quando box.cutList não está populado. */
  rules?: RulesConfig
) => {
  const boxesRef = useRef<BoxModule[]>(boxes);
  const workspaceBoxesRef = useRef<WorkspaceBox[]>(workspaceBoxes);
  const viewerApiRef = useRef(viewerApi);
  const projectMaterialIdRef = useRef<string | undefined>(projectMaterialId);
  const stateRef = useRef<Map<string, BoxState>>(new Map());
  const prevViewerReadyRef = useRef<boolean | undefined>(false);
  /** Última estrutura conhecida por box id; quando igual, só enviamos position/rotation para evitar rebuild no Viewer. */
  const lastStructureFingerprintRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    projectMaterialIdRef.current = projectMaterialId;
  }, [projectMaterialId]);

  useEffect(() => {
    viewerApiRef.current = viewerApi;
  }, [viewerApi]);

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    workspaceBoxesRef.current = workspaceBoxes;
  }, [workspaceBoxes]);

  const syncFromCalculator = useCallback(() => {
    const api = viewerApiRef.current;
    if (!api) return;
    const currentBoxes = boxesRef.current ?? [];
    const wsBoxes = workspaceBoxesRef.current ?? [];
    const boxById = new Map(currentBoxes.map((box) => [box.id, box]));
    const nextState = new Map<string, BoxState>();
    const currentIds = new Set<string>();

    wsBoxes.forEach((wsBox, index) => {
      const box = boxById.get(wsBox.id);
      currentIds.add(wsBox.id);
      nextState.set(wsBox.id, { index });
      const posRot = getBoxPositionAndRotation(wsBox);

      const widthMm = Number.isFinite(wsBox.dimensoes?.largura) ? wsBox.dimensoes.largura : undefined;
      const heightMm = Number.isFinite(wsBox.dimensoes?.altura) ? wsBox.dimensoes.altura : undefined;
      const depthMm = Number.isFinite(wsBox.dimensoes?.profundidade)
        ? wsBox.dimensoes.profundidade
        : undefined;
      const width = widthMm !== undefined ? mmToM(widthMm) : undefined;
      const height = heightMm !== undefined ? mmToM(heightMm) : undefined;
      const depth = depthMm !== undefined ? mmToM(depthMm) : undefined;
      const thicknessMm = Number.isFinite(wsBox.espessura) ? wsBox.espessura : undefined;
      const thickness = thicknessMm !== undefined ? mmToM(thicknessMm) : undefined;
      const effectiveMaterial =
        wsBox.material ??
        box?.material ??
        projectMaterialIdRef.current ??
        materialName ??
        "mdf_branco";
      const resolvedMaterialName = getViewerMaterialId(effectiveMaterial);
      const cadOnly =
        (wsBox.models?.length ?? 0) > 0 && wsBox.prateleiras === 0 && wsBox.gavetas === 0;

      const shelves = Number.isFinite(wsBox.prateleiras) ? Math.max(0, wsBox.prateleiras) : undefined;
      const cabinetType = wsBox?.cabinetType === "lower" || wsBox?.cabinetType === "upper" ? wsBox.cabinetType : undefined;
      const feetHeight = Math.max(40, wsBox?.feetHeight ?? ((wsBox?.pe_cm ?? 10) * 10));
      const feetOffsetFront = Math.max(0, wsBox?.feetOffsetFront ?? 100);
      const pe_cm = feetHeight / 10;
      const feetEnabled = wsBox?.feetEnabled ?? (cabinetType === "lower");
      const autoRotateEnabled = wsBox?.autoRotateEnabled;
      const doorLayerItems = wsBox?.doorsLayer ?? [];
      const drawerLayerItems = wsBox?.drawersLayer ?? [];
      const useCabinetLock = cabinetType === "lower" && feetEnabled;
      const cabinetOpts: Partial<BoxOptions> = useCabinetLock
        ? { cabinetType, pe_cm, feetEnabled, feetHeight, feetOffsetFront }
        : { cabinetType: null, pe_cm, feetEnabled, feetHeight, feetOffsetFront };
      const rotateOpts = autoRotateEnabled === false ? { autoRotateEnabled: false } : {};
      const locked = wsBox.locked === true;
      const cutListForBox =
        box?.cutList && box.cutList.length > 0
          ? box.cutList
          : box && rules
            ? cutlistComPrecoFromBox(box, rules)
            : [];
      const drillMarkersByPanel = buildViewerDrillMarkersByPanel(cutListForBox);
      if (!stateRef.current.has(wsBox.id)) {
        api.addBox(wsBox.id, {
          width,
          height,
          depth,
          thickness,
          panelIds: wsBox.panelIds,
          shelves,
          materialName: resolvedMaterialName,
          index,
          cadOnly,
          ...cabinetOpts,
          ...rotateOpts,
          locked,
          doorLayerItems,
          drawerLayerItems,
          drillMarkersByPanel,
          ...posRot,
        });
        lastStructureFingerprintRef.current.set(wsBox.id, getStructureFingerprint(wsBox));
      } else {
        const structureFingerprint = getStructureFingerprint(wsBox);
        const lastFingerprint = lastStructureFingerprintRef.current.get(wsBox.id);
        if (lastFingerprint === structureFingerprint) {
          // Apenas posição/rotação mudaram (ex.: drag no viewer). Só atualizar transform para não disparar rebuild (updateBoxGroup/createDoorObject).
          api.updateBox(wsBox.id, { ...posRot, locked });
        } else {
          if (import.meta.env.DEV) {
            devLogger.debug("[useCalculadoraSync] estrutura mudou, chamando updateBox com dimensões", {
              boxId: wsBox.id,
              width,
              height,
              depth,
            });
          }
          api.updateBox(wsBox.id, {
            width,
            height,
            depth,
            thickness,
            panelIds: wsBox.panelIds,
            shelves,
            materialName: resolvedMaterialName,
            index,
            ...cabinetOpts,
            ...rotateOpts,
            locked,
            doorLayerItems,
            drawerLayerItems,
            drillMarkersByPanel,
            ...posRot,
          });
          lastStructureFingerprintRef.current.set(wsBox.id, structureFingerprint);
        }
      }
    });

    Array.from(stateRef.current.keys()).forEach((id) => {
      if (!currentIds.has(id)) {
        api.removeBox(id);
        lastStructureFingerprintRef.current.delete(id);
      }
    });

    stateRef.current = nextState;
  }, [materialName, rules]);

  useEffect(() => {
    // Só sincronizar quando o viewer estiver explicitamente pronto
    if (viewerReady !== true) return;
    // Ao passar a true, limpar estado para forçar addBox em todas as caixas (viewer pode ter sido recriado)
    if (prevViewerReadyRef.current !== true) {
      stateRef.current = new Map();
      prevViewerReadyRef.current = true;
    }
    syncFromCalculator();
  }, [boxes, workspaceBoxes, syncFromCalculator, viewerReady]);

  useEffect(() => {
    const api = viewerApiRef.current;
    if (gap !== undefined && Number.isFinite(gap) && api) {
      api.setBoxGap(gap);
    }
  }, [gap]);

  return { syncFromCalculator };
};
