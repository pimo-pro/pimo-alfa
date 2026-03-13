// ViewerCore: Orquestrador fino, delega para módulos especializados.
import { RoomManager } from "./RoomManager";
import { SnapshotManager } from "./SnapshotManager";
import { CollisionManager } from "./CollisionManager";
import { ReflowManager } from "./ReflowManager";
import { ToolsManager } from "./ToolsManager";

export class ViewerCore {
  roomManager: RoomManager;
  snapshotManager: SnapshotManager;
  collisionManager: CollisionManager;
  reflowManager: ReflowManager;
  toolsManager: ToolsManager;
  materialsManager: any;
  rulerManager: any;
  // ...outros managers
  constructor() {
    this.roomManager = new RoomManager(this);
    this.snapshotManager = new SnapshotManager(this);
    this.collisionManager = new CollisionManager(this);
    this.reflowManager = new ReflowManager(this);
    this.toolsManager = new ToolsManager(this);
    this.materialsManager = { // stub: implement real manager
      updateBoxMaterial: (boxId, materialId) => { void boxId; void materialId; return true; },
      updateDoorMaterial: (doorId, materialId) => { void doorId; void materialId; return true; },
      updateDrawerMaterial: (drawerId, materialId) => { void drawerId; void materialId; return true; },
      setMaterialMode: (mode) => {
        // TODO: Implementar modo de material
        return mode;
      },
      getMaterialMode: () => {
        // TODO: Retornar modo de material
        return "default";
      },
      setMaterialQuality: (quality) => {
        // TODO: Implementar qualidade de material
        return quality;
      },
      getMaterialQuality: () => {
        // TODO: Retornar qualidade de material
        return "standard";
      },
      applyMaterialPreset: (presetId) => {
        // TODO: Aplicar preset de material
        return presetId;
      },
    };
    this.rulerManager = { // stub: implement real manager
      getRulerEdgeAtPointer: (pointer) => { void pointer; return null; },
      getRulerMeasurements: () => {
        // TODO: Implementar obtenção de medidas da régua
        return [];
      },
      setRulerEnabled: (enabled) => {
        // TODO: Implementar ativação da régua
        return enabled;
      },
      getInternalRulerPickAtPointer: (pointer) => { void pointer; return null; },
      cycleInternalRulerSelection: () => {
        // TODO: Implementar ciclo de seleção interna da régua
        return true;
      },
      clearInternalRulerSelection: () => {
        // TODO: Implementar limpeza de seleção interna
        return true;
      },
      getInternalRulerMeasurement: () => {
        // TODO: Implementar obtenção de medida interna
        return null;
      },
    };
    // ...outros managers
  }
  // Métodos públicos delegam para managers
}
